import { buildApiUrl, getAuthHeaders, handleApiResponse } from './api'

export type LegalEventType =
  | 'acknowledgement'
  | 'acceptance'
  | 'consent_granted'
  | 'consent_withdrawn'

export interface LegalDocumentSummary {
  code: string
  version: string
  locale: string
  title: string
  body: string
  content_hash: string
  requires_acceptance: boolean
  requires_reacceptance: boolean
  withdrawable: boolean
  effective_at: string | null
  published_at: string | null
}

export interface LegalEventRecord {
  id: number
  code: string
  version: string
  locale: string
  content_hash: string
  purpose: string
  event_type: LegalEventType
  legal_basis: string
  source: string
  created_at: string
}

export interface LegalStatus {
  locale: string
  pending: LegalDocumentSummary[]
  accepted: LegalEventRecord[]
  optional_consents: LegalEventRecord[]
}

export interface LegalEventInput {
  code: string
  version: string
  locale?: string
  purpose: string
  event_type: LegalEventType
  source: string
  legal_basis?: string
}

async function readJson<T>(response: Response): Promise<T> {
  const result = await handleApiResponse<T>(response)
  if (result.error || result.data == null) {
    throw new Error(result.error || 'No se pudo consultar el estado legal')
  }
  return result.data
}

export async function getActiveLegalDocuments(locale = 'es-ES'): Promise<LegalDocumentSummary[]> {
  const response = await fetch(buildApiUrl(`legal/documents/active/?locale=${encodeURIComponent(locale)}`), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
  return readJson<LegalDocumentSummary[]>(response)
}

export async function getLegalStatus(locale = 'es-ES'): Promise<LegalStatus> {
  const response = await fetch(buildApiUrl(`legal/status/?locale=${encodeURIComponent(locale)}`), {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  })
  return readJson<LegalStatus>(response)
}

export async function recordLegalEvent(input: LegalEventInput): Promise<LegalEventRecord> {
  const response = await fetch(buildApiUrl('legal/events/'), {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify({ locale: 'es-ES', ...input }),
  })
  return readJson<LegalEventRecord>(response)
}
