/**
 * Runnable check: frontend never writes a live csrfToken; Path=/ expire only.
 * node -e "eval(require('fs').readFileSync('frontend/lib/check-csrf-cookie-domain.js','utf8'))"
 */
function legacyRootCsrfExpireSetCookieLines(hostname, isHttps) {
  const CSRF_COOKIE_NAME = 'csrfToken'
  const EXPIRED = 'Thu, 01 Jan 1970 00:00:00 UTC'
  const domains = [undefined]
  if (hostname.includes('.')) {
    domains.push(hostname)
  }
  if (hostname === 'nexfit365.dpdns.org' || hostname.endsWith('.nexfit365.dpdns.org')) {
    domains.push('.nexfit365.dpdns.org')
  }
  const lines = []
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

const prod = legacyRootCsrfExpireSetCookieLines('metodosk.com', true)
if (prod.some((line) => /max-age=/i.test(line))) {
  throw new Error('csrf helper must not write a live csrfToken')
}
if (prod.some((line) => /path=\/nexfit/i.test(line))) {
  throw new Error('csrf helper must not expire Path=/nexfit')
}
if (!prod.every((line) => /path=\/(;|$)/.test(line))) {
  throw new Error('csrf helper must expire Path=/ only')
}
if (!prod.some((line) => !line.includes('domain='))) {
  throw new Error('metodosk Path=/ leftover is host-only')
}

const dpdns = legacyRootCsrfExpireSetCookieLines('www.nexfit365.dpdns.org', true)
if (!dpdns.some((line) => line.includes('domain=.nexfit365.dpdns.org'))) {
  throw new Error('dpdns Path=/ leftovers still need Domain=.nexfit365.dpdns.org expire')
}

const local = legacyRootCsrfExpireSetCookieLines('localhost', false)
if (local.some((line) => line.includes('domain='))) {
  throw new Error('localhost expire must stay host-only')
}

console.log('OK csrf cookie domain check')
