# Integration Research: Dynamic + Circle App Kit

To connect your Dynamic wallet session with the Circle App Kit, extract the standard EIP-1193 provider from Dynamic's primaryWallet and feed it into the Viem adapter.

## Configuration Pattern

```typescript
import { useDynamicContext } from '@dynamic-labs/sdk-react-core'
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2'
import { AppKit } from '@circle-fin/app-kit'

// 1. Inside your React component / hook:
const { primaryWallet } = useDynamicContext()

const initArcAppKit = async () => {
  if (!primaryWallet) return

  // 2. Extract standard EIP-1193 provider from Dynamic
  const provider = await primaryWallet.connector.getProvider()

  // 3. Create the Viem Adapter
  const adapter = await createViemAdapterFromProvider({
    provider: provider,
  })

  // 4. Initialize the App Kit
  const appKit = new AppKit({
    adapter: adapter,
  })

  // 5. Query unified balances across chains
  const { balances } = await appKit.getBalances()
  console.log('Unified USDC balances:', balances)
}
```
