'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { appPath } from '@/lib/app-path'
import { buildApiUrl, getAuthHeaders, handleApiResponse } from '@/lib/api'
import { getLegalStatus, type LegalStatus } from '@/lib/legal-service'

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
        <p>Datos de salud: el consentimiento separado todavía no se solicita.</p>
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
