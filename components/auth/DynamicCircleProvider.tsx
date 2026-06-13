'use client'

import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core'
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum'
import { ReactNode } from 'react'

const DYNAMIC_ENVIRONMENT_ID =
  process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID || 'REPLACE_WITH_YOUR_DYNAMIC_ENV_ID'

export function DynamicCircleProvider({ children }: { children: ReactNode }) {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: DYNAMIC_ENVIRONMENT_ID,
        walletConnectors: [EthereumWalletConnectors],
      }}
    >
      {children}
    </DynamicContextProvider>
  )
}
