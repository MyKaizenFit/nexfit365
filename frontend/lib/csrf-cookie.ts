const CSRF_COOKIE_NAME = 'csrfToken'
const EXPIRED = 'Thu, 01 Jan 1970 00:00:00 UTC'

const decodeCookieValue = (raw: string): string => {
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

export const csrfCookiePairs = (cookieHeader: string): string[] =>
  cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${CSRF_COOKIE_NAME}=`))

/** Single reader for csrfToken. If duplicates remain, use the last pair. */
export const readCsrfTokenFromCookieHeader = (cookieHeader: string): string | null => {
  const pairs = csrfCookiePairs(cookieHeader)
  if (!pairs.length) {
    return null
  }
  return decodeCookieValue(pairs[pairs.length - 1].slice(`${CSRF_COOKIE_NAME}=`.length))
}

export const getCsrfToken = (): string | null => {
  if (typeof document === 'undefined') {
    return null
  }
  return readCsrfTokenFromCookieHeader(document.cookie)
}

/**
 * Expire host-only / Domain csrfToken cookies at Path=/ only.
 * Never Path=/nexfit — that cookie is owned by Django.
 */
export const legacyRootCsrfExpireSetCookieLines = (
  hostname: string,
  isHttps: boolean
): string[] => {
  const domains: Array<string | undefined> = [undefined]
  if (hostname.includes('.')) {
    domains.push(hostname)
  }
  if (hostname === 'nexfit365.dpdns.org' || hostname.endsWith('.nexfit365.dpdns.org')) {
    domains.push('.nexfit365.dpdns.org')
  }

  const lines: string[] = []
  for (const domain of Array.from(new Set(domains))) {
    const domainPart = domain ? `;domain=${domain}` : ''
    lines.push(`${CSRF_COOKIE_NAME}=;expires=${EXPIRED};path=/${domainPart}`)
    lines.push(`${CSRF_COOKIE_NAME}=;expires=${EXPIRED};path=/${domainPart};SameSite=Lax`)
    if (isHttps) {
      lines.push(`${CSRF_COOKIE_NAME}=;expires=${EXPIRED};path=/${domainPart};SameSite=Lax;Secure`)
      lines.push(`${CSRF_COOKIE_NAME}=;expires=${EXPIRED};path=/${domainPart};SameSite=None;Secure`)
    }
  }
  return lines
}

const appIsUnderSubpath = (): boolean => {
  const raw = (process.env.NEXT_PUBLIC_BASE_PATH || '').trim()
  return Boolean(raw && raw !== '/')
}

export const expireLegacyRootCsrfCookie = (): void => {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return
  }
  // Localhost / empty basePath: Django's csrfToken is Path=/. Do not expire it.
  if (!appIsUnderSubpath()) {
    return
  }
  const lines = legacyRootCsrfExpireSetCookieLines(
    window.location.hostname,
    window.location.protocol === 'https:'
  )
  for (const line of lines) {
    document.cookie = line
  }
}

/** Django Set-Cookie is authoritative. Never write a second csrfToken. */
export const storeCsrfFromResponse = (_csrf?: string | null): void => {
  expireLegacyRootCsrfCookie()
}
