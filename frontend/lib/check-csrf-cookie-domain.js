/**
 * Runnable check: shared-domain csrf cookie string shape.
 * node -e "eval(require('fs').readFileSync('frontend/lib/check-csrf-cookie-domain.js','utf8'))"
 * (logic mirrored from auth-service storeCsrfFromResponse — keep in sync)
 */
function buildCsrfCookie(csrf, hostname, protocol) {
  const maxAge = 30 * 24 * 60 * 60
  let cookie = `csrfToken=${encodeURIComponent(csrf)};path=/;max-age=${maxAge}`
  if (hostname === 'nexfit365.dpdns.org' || hostname.endsWith('.nexfit365.dpdns.org')) {
    cookie += `;domain=.nexfit365.dpdns.org;SameSite=None;Secure`
  } else {
    cookie += `;SameSite=Lax${protocol === 'https:' ? ';Secure' : ''}`
  }
  return cookie
}

const prod = buildCsrfCookie('abc', 'nexfit365.dpdns.org', 'https:')
if (!prod.includes('domain=.nexfit365.dpdns.org') || !prod.includes('SameSite=None')) {
  throw new Error('prod csrf cookie must use shared Domain + SameSite=None')
}
const local = buildCsrfCookie('abc', 'localhost', 'http:')
if (local.includes('domain=') || local.includes('SameSite=None')) {
  throw new Error('local csrf cookie must stay host-only Lax')
}
console.log('OK csrf cookie domain check')
