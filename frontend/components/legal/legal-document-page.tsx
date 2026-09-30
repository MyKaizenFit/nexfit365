'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getActiveLegalDocuments, type LegalDocumentSummary } from '@/lib/legal-service'
import { appPath } from '@/lib/app-path'

const PLACEHOLDER_RE = /\[[A-Z][A-Z0-9_]{2,}\]/

export function LegalDocumentPage({ code, heading }: { code: string; heading: string }) {
  const [document, setDocument] = useState<LegalDocumentSummary | null>(null)
  const [state, setState] = useState<'loading' | 'empty' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    getActiveLegalDocuments()
      .then((documents) => {
        if (cancelled) return
        const match = documents.find((item) => item.code === code) || null
        if (!match || PLACEHOLDER_RE.test(`${match.title}\n${match.body}`)) {
          setState('empty')
          return
        }
        setDocument(match)
        setState('ready')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [code])

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-foreground">
      <p className="mb-6 text-sm">
        <Link href={appPath('/')} className="underline">
          Volver
        </Link>
      </p>
      <h1 className="mb-4 text-2xl font-semibold">{heading}</h1>
      {state === 'loading' && <p>Cargando documento…</p>}
      {state === 'empty' && <p>Este documento todavía no está publicado.</p>}
      {state === 'error' && <p>No se ha podido cargar el documento. Inténtalo de nuevo más tarde.</p>}
      {state === 'ready' && document && (
        <article className="space-y-4">
          <h2 className="text-xl font-medium">{document.title}</h2>
          <p className="text-sm text-muted-foreground">Versión {document.version}</p>
          <div className="whitespace-pre-wrap leading-relaxed">{document.body}</div>
        </article>
      )}
    </main>
  )
}
