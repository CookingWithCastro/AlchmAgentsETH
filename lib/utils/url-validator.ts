/**
 * SSRF URL Validation Utility (OWASP API7:2023 Conformance)
 * Prevents Server-Side Request Forgery by rejecting requests targeting loopback addresses,
 * private networks (RFC 1918 / RFC 4193 / RFC 6598), and cloud metadata endpoints.
 */

import { URL } from 'url'

// Disallowed hostnames and IP patterns
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254', // AWS / GCP / Azure Instance Metadata Service (IMDS)
  'metadata.google.internal',
  'instance-data',
])

// Private IP Range regex patterns
const PRIVATE_IP_PATTERNS = [
  /^127\./, // Loopback
  /^10\./, // Private RFC 1918 Class A
  /^172\.(1[6-9]|2[0-9]|3[01])\./, // Private RFC 1918 Class B
  /^192\.168\./, // Private RFC 1918 Class C
  /^169\.254\./, // Link-local / Metadata RFC 3927
  /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./, // Carrier-grade NAT RFC 6598
  /^fc00:/i, // IPv6 Unique Local Address RFC 4193
  /^fe80:/i, // IPv6 Link-local
]

export interface UrlValidationResult {
  valid: boolean
  reason?: string
  url?: URL
}

/**
 * Validates a target URL to ensure it is safe to fetch server-side.
 */
export function validateUrlForSSRF(targetUrl: string): UrlValidationResult {
  if (!targetUrl || typeof targetUrl !== 'string') {
    return { valid: false, reason: 'URL string is required' }
  }

  let parsed: URL
  try {
    parsed = new URL(targetUrl)
  } catch {
    return { valid: false, reason: 'Invalid URL format' }
  }

  // Only allow http: and https: protocols
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      valid: false,
      reason: `Unsupported protocol '${parsed.protocol}'. Only http and https are allowed.`,
    }
  }

  const hostname = parsed.hostname.toLowerCase().trim()

  // Check explicit blocked hostnames
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return {
      valid: false,
      reason: `Hostname '${hostname}' is a restricted local or metadata address.`,
    }
  }

  // Check IP ranges
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return {
        valid: false,
        reason: `IP address '${hostname}' resolves to a restricted private network range.`,
      }
    }
  }

  return { valid: true, url: parsed }
}
