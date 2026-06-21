/**
 * Canonical public deployments for Pentacle Star Vaults.
 *
 * These addresses are safe to ship to the browser. Environment variables may override
 * them for a redeploy, but the checked-in Arc testnet deployment keeps preview and fresh
 * installs connected to the same contracts as production.
 */
export const PENTACLES_ARC_TESTNET_DEPLOYMENT = {
  chainId: 5_042_002,
  esms: '0x124ECa1bb1E106D3614A22A256f9A412FfeEAd8F',
  starVault: '0x34eAC0fe797df2889d9dc59Cb98dCe24154BB9B6',
  constellationDeed: '0x6B4EE164320e9E5583C0F6BEe14D5BABb5ba5095',
  constellationAmm: '0x34d860Cb460ecD2595584138d22Ad6fe7DAeA3BB',
} as const

/** ESMS shop settlement is mirrored to Base Sepolia; star staking remains on Arc. */
export const PENTACLES_BASE_SEPOLIA_DEPLOYMENT = {
  chainId: 84_532,
  esms: '0x124ECa1bb1E106D3614A22A256f9A412FfeEAd8F',
} as const
