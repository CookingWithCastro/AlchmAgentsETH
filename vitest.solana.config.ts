import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['test/solana/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
  resolve: {
    alias: { '@': path.resolve(dirname, '.') },
  },
})
