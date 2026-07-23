export const SPACETIME_TOKEN_STORAGE_KEY = 'pa:spacetime:token'

export interface SpacetimeConfig {
  uri: string
  moduleName: string
}

export function getSpacetimeConfig(): SpacetimeConfig | null {
  const uri = process.env.NEXT_PUBLIC_SPACETIME_URI || 'wss://maincloud.spacetimedb.com'
  // The deployed Pentacles database name on Maincloud.
  const moduleName = process.env.NEXT_PUBLIC_SPACETIME_MODULE || 'cookingwithcastrollc'

  return { uri, moduleName }
}

export function isLiveFeedEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SPACETIME_LIVE_FEED === 'true'
}

export function isLiveOracleEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SPACETIME_LIVE_ORACLE === 'true'
}
