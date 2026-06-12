import { notFound } from 'next/navigation'

/**
 * The (sandbox) group is prototypes and test pages — Stitch HTML exports,
 * chart fixtures, demo flows. They are dev-only: in production all ~28
 * routes 404 instead of shipping prototype data on public URLs.
 * Set SANDBOX_ROUTES_ENABLED=true to expose them on a deployment anyway
 * (e.g. a design-review preview).
 */
export default function SandboxLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production' && process.env.SANDBOX_ROUTES_ENABLED !== 'true') {
    notFound()
  }
  return <>{children}</>
}
