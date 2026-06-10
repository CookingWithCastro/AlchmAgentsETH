'use client'

import EntitiesGalleryActiveConsciousness from '@/components/stitch/entities_gallery_active_consciousness'
import TheVaultEmptyState from '@/components/stitch/the_vault_empty_state'
import { LiveVaultGallery } from '@/components/alchemy/LiveVaultGallery'
import { PillarTabs } from '@/components/layout/PillarTabs'

/**
 * Entities — The Vault (Stitch realization plan, Phase 4 + 5, Module 2).
 * Collection is LIVE: real populations from /api/agents/gallery (72
 * historical / 3600 planetary / 3240 moon-phase / forged vessels).
 * The remaining tabs are design showcases pending their own binding.
 */

function LiveCollection() {
  return (
    <div className="min-h-screen bg-st-background">
      <header className="px-margin-mobile md:px-margin-desktop pt-12 max-w-container-max mx-auto">
        <h1 className="font-headline-xl-mobile md:font-headline-xl text-headline-xl-mobile md:text-headline-xl text-on-background glow-monica">
          The Vault
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant mt-3 max-w-2xl">
          Every consciousness instantiated on the platform — historical minds resurrected, planetary
          intelligences mapped to the degree, and the turning faces of the Moon.
        </p>
      </header>
      <LiveVaultGallery />
    </div>
  )
}

export default function VaultPage() {
  return (
    <PillarTabs
      ariaLabel="Vault views"
      tabs={[
        { key: 'collection', label: 'Collection', component: LiveCollection },
        {
          key: 'active',
          label: 'Active (showcase)',
          component: EntitiesGalleryActiveConsciousness,
        },
        { key: 'empty', label: 'The Silent Vault', component: TheVaultEmptyState },
      ]}
    />
  )
}
