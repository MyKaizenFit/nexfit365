'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { appPath } from '@/lib/app-path'
import { buildApiUrl, getAuthHeaders, handleApiResponse } from '@/lib/api'
import { getLegalStatus, recordLegalEvent, type HealthConsentStatus, type LegalStatus } from '@/lib/legal-service'

const GROUP_LABELS: Record<string, string> = {
  core: 'Perfil de salud y personalización',
  progress_photos: 'Fotos de progreso',
  wellness: 'Bienestar',
}

const STATE_LABELS: Record<string, string> = {
  not_granted: 'No concedido',
  granted: 'Concedido',
  withdrawn: 'Retirado',
  pending_new_version: 'Pendiente de una versión nueva',
  not_required: 'No solicitado',
}

function versionLabel(status: LegalStatus | null, code: string, done: string) {
  if (!status) return 'Comprobando…'
  const pending = status.pending.find((item) => item.code === code)
  if (pending) return `Versión ${pending.version} · pendiente`
  const accepted = status.accepted.find((item) => item.code === code)
  if (accepted) return `Versión ${accepted.version} · ${done}`
  return 'Sin documento publicado'
}

export function PrivacyCenter() {
  const [status, setStatus] = useState<LegalStatus | null>(null)
  const [preferences, setPreferences] = useState<Record<string, unknown>>({})
  const [birthday, setBirthday] = useState(false)
  const [message, setMessage] = useState('')
  const [checkedGroups, setCheckedGroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    getLegalStatus().then(setStatus).catch(() => setMessage('No se ha podido cargar el estado legal.'))
    fetch(buildApiUrl('me/'), { headers: getAuthHeaders(), credentials: 'include' })
      .then((response) => handleApiResponse<{ notification_preferences?: Record<string, unknown> }>(response))
      .then((result) => {
        const current = result.data?.notification_preferences || {}
        setPreferences(current)
        setBirthday(Boolean(current.birthday))
      })
      .catch(() => undefined)
  }, [])

  const saveBirthday = async (enabled: boolean) => {
    setBirthday(enabled)
    const response = await fetch(buildApiUrl('profile/'), {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ notification_preferences: { ...preferences, birthday: enabled } }),
    })
    if (!response.ok) {
      setBirthday(!enabled)
      setMessage('No se ha podido guardar la preferencia de cumpleaños.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacidad y consentimientos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {message && <p className="text-red-600">{message}</p>}
        <p>Privacidad: {versionLabel(status, 'privacy', 'leída')}</p>
        <p>Términos: {versionLabel(status, 'terms', 'aceptados')}</p>
        <HealthDataSection
          health={status?.health}
          checkedGroups={checkedGroups}
          onToggle={(groupId, checked) => setCheckedGroups((current) => ({ ...current, [groupId]: checked }))}
          onChanged={() => getLegalStatus().then(setStatus).catch(() => setMessage('No se ha podido actualizar el consentimiento.'))}
          onError={setMessage}
        />
        <p>
          Cookies y almacenamiento:{' '}
          <Link className="underline" href={appPath('/cookies')}>información</Link>
        </p>
        <div className="flex items-center justify-between gap-4">
          <span>Aviso de cumpleaños. Está desactivado hasta que lo actives.</span>
          <Switch checked={birthday} onCheckedChange={(value) => saveBirthday(Boolean(value))} />
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="underline" href={appPath('/privacidad')}>Ver privacidad</Link>
          <Link className="underline" href={appPath('/terminos')}>Ver términos</Link>
          <Link className="underline" href={appPath('/salud')}>Ver salud</Link>
          <Link className="underline" href={appPath('/aceptacion-legal')}>Documentos pendientes</Link>
          <Button variant="outline" onClick={() => { window.location.href = buildApiUrl('gdpr/export/') }}>
            Exportar datos
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              if (!window.confirm('Se enviará una solicitud de eliminación de la cuenta. La cuenta no se borra al momento.')) return
              const response = await fetch(buildApiUrl('gdpr/delete/'), {
                method: 'POST',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ reason: 'Solicitud desde privacidad' }),
              })
              setMessage(response.ok ? 'Solicitud de eliminación registrada.' : 'No se ha podido registrar la solicitud.')
            }}
          >
            Solicitar eliminación
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function HealthDataSection({
  health,
  checkedGroups,
  onToggle,
  onChanged,
  onError,
}: {
  health?: HealthConsentStatus
  checkedGroups: Record<string, boolean>
  onToggle: (groupId: string, checked: boolean) => void
  onChanged: () => void
  onError: (message: string) => void
}) {
  if (!health?.enforcement_active || !health.document) {
    return <p>Datos de salud: el consentimiento separado todavía no se solicita.</p>
  }

  const change = async (groupId: string, purposes: string[], eventType: 'consent_granted' | 'consent_withdrawn') => {
    if (eventType === 'consent_granted' && !checkedGroups[groupId]) {
      onError('Marca la casilla para conceder el consentimiento. No se concede sola.')
      return
    }
    try {
      await recordLegalEvent({
        code: health.document!.code,
        version: health.document!.version,
        purposes,
        event_type: eventType,
        source: 'settings',
      })
      onToggle(groupId, false)
      onError('')
      onChanged()
    } catch (error) {
      onError(error instanceof Error ? error.message : 'No se ha podido registrar el consentimiento.')
    }
  }

  return (
    <div className="space-y-3">
      <p>
        Datos de salud. Es opcional: la cuenta puede usarse sin concederlo.{' '}
        <Link className="underline" href={appPath('/salud')}>Leer el aviso vigente</Link>
        {health.document.version ? ` · versión ${health.document.version}` : ''}
      </p>
      {health.groups.map((group) => {
        const granted = group.items.filter((item) => item.state === 'granted').map((item) => item.purpose)
        return (
          <div key={group.id} className="rounded border p-3 space-y-2">
            <p className="font-medium">{GROUP_LABELS[group.id] || group.id}</p>
            {group.items.map((item) => (
              <p key={item.purpose}>
                {STATE_LABELS[item.state] || item.state}
                {item.version ? ` · versión ${item.version}` : ''}
                {item.changed_at ? ` · ${item.changed_at.slice(0, 10)}` : ''}
              </p>
            ))}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(checkedGroups[group.id])}
                onChange={(event) => onToggle(group.id, event.target.checked)}
              />
              He leído el aviso y quiero conceder este uso
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => change(group.id, group.purposes, 'consent_granted')}>
                Conceder
              </Button>
              {granted.length > 0 && (
                <Button type="button" variant="outline" onClick={() => change(group.id, granted, 'consent_withdrawn')}>
                  Retirar
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
