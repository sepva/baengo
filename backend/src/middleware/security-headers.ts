import { Context, Next } from 'hono'

export async function securityHeaders(c: Context, next: Next) {
  // Add security headers to response
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'")
  c.header('X-Frame-Options', 'DENY')
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('X-XSS-Protection', '1; mode=block')
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  
  await next()
}
