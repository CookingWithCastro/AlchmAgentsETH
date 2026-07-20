/**
 * Minimal logger shim for the vendored FBD engine.
 *
 * `aspectCalculator.ts` imports `@/lib/logger` from WhatToEatNext. Rather than
 * vendor that whole logging stack, this satisfies the two calls it makes
 * (`warn` on an unrecognized sign / malformed position).
 *
 * Those warnings matter — they fire exactly when a position is unusable and
 * the engine is about to skip it, which is the difference between "no aspect"
 * and "wrong aspect". Keep them visible.
 */

export const _logger = {
  warn: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[alchm-fbd] ${message}`, data ?? '')
    }
  },
  error: (message: string, data?: unknown) => {
    console.error(`[alchm-fbd] ${message}`, data ?? '')
  },
}
