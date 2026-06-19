import { LiveVaultGallery } from '@/components/alchemy/LiveVaultGallery'

/**
 * Entities — The Vault (Stitch realization plan, Phase 4 + 5, Module 2).
 * Collection is live and backed by the canonical historical personas. The
 * previous design-only tabs were removed from the production route.
 */

function LiveCollection() {
  return (
    <div className="min-h-screen bg-st-background">
      <header className="px-margin-mobile md:px-margin-desktop pt-12 max-w-container-max mx-auto">
        <h1 className="font-headline-xl-mobile md:font-headline-xl text-headline-xl-mobile md:text-headline-xl text-on-background glow-monica">
          The Vault
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant mt-3 max-w-2xl">
          Explore the canonical historical minds available for communion and live agent duels.
        </p>
      </header>
      <LiveVaultGallery />
    </div>
  )
}

export default function VaultPage() {
  return <LiveCollection />
}
