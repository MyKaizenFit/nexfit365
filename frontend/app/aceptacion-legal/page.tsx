'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { appPath } from '@/lib/app-path'
import { buildApiUrl, getAuthHeaders } from '@/lib/api'
import {
  getLegalStatus,
  recordLegalEvent,
  type LegalDocumentSummary,
} from '@/lib/legal-service'

const PAGE_FOR_CODE: Record<string, string> = {
  privacy: '/privacidad',
  terms: '/terminos',
  health_notice: '/salud',
  cookies: '/cookies',
}

function eventTypeFor(code: string) {
  return code === 'terms' ? 'acceptance' : 'acknowledgement'
}

function labelFor(document: LegalDocumentSummary) {
  if (document.code === 'privacy') return 'He leído la Política de Privacidad.'
  if (document.code === 'terms') return 'Acepto los Términos y Condiciones.'
  return `He leído «${document.title}».`
}

export default function LegalAcceptancePage() {
  const router = useRouter()
  const [pending, setPending] = useState<LegalDocumentSummary[] | null>(null)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getLegalStatus()
      .then((status) => setPending(status.pending))
      .catch(() => setError('No se ha podido comprobar el estado legal.'))
  }, [])

  const confirm = async () => {
    if (!pending) return
    setSaving(true)
    setError('')
    try {
      for (const document of pending) {
        await recordLegalEvent({
          code: document.code,
          version: document.version,
          locale: document.locale,
          purpose: 'account',
          event_type: eventTypeFor(document.code),
          source: document.requires_reacceptance ? 'reacceptance' : 'settings',
        })
      }
      router.replace(appPath('/dashboard'))
    } catch {
      setError('No se ha podido registrar la confirmación. La cuenta sigue activa.')
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-3 text-2xl font-semibold">Documentos pendientes</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Puedes consultar los documentos, exportar tus datos o solicitar la eliminación de la cuenta
        antes de continuar.
      </p>
      <div className="mb-6 flex flex-wrap gap-4 text-sm">
        <Link className="underline" href={appPath('/privacidad')}>Privacidad</Link>
        <Link className="underline" href={appPath('/terminos')}>Términos</Link>
        <Link className="underline" href={appPath('/cookies')}>Cookies</Link>
        <button className="underline" type="button" onClick={() => { window.location.href = buildApiUrl('gdpr/export/') }}>
          Exportar datos
        </button>
        <button
          className="underline"
          type="button"
          onClick={async () => {
            if (!window.confirm('Se enviará una solicitud de eliminación. La cuenta no se borra al momento.')) return
            await fetch(buildApiUrl('gdpr/delete/'), {
              method: 'POST',
              headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ reason: 'Solicitud durante la revisión legal' }),
            })
          }}
        >
          Solicitar eliminación
        </button>
      </div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {pending === null && !error && <p>Comprobando…</p>}
      {pending?.length === 0 && (
        <Button onClick={() => router.replace(appPath('/dashboard'))}>Continuar</Button>
      )}
      {pending && pending.length > 0 && (
        <div className="space-y-4">
          {pending.map((document) => (
            <label key={document.content_hash} className="flex items-start gap-3">
              <Checkbox
                checked={Boolean(checked[document.version + document.code])}
                onCheckedChange={(value) =>
                  setChecked((current) => ({
                    ...current,
                    [document.version + document.code]: Boolean(value),
                  }))
                }
              />
              <span>
                {labelFor(document)}{' '}
                <Link className="underline" href={appPath(PAGE_FOR_CODE[document.code] || '/privacidad')}>
                  Ver versión {document.version}
                </Link>
              </span>
            </label>
          ))}
          <Button
            disabled={saving || pending.some((document) => !checked[document.version + document.code])}
            onClick={confirm}
          >
            Confirmar
          </Button>
        </div>
      )}
    </main>
  )
}
