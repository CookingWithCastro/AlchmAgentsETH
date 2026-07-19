/// <reference types="vitest/config" />
// Default Vitest configuration — runs the test/ suite (unit + integration).
// Storybook browser tests live in vitest.storybook.config.ts; putting them in a
// `projects` array here made this config run ZERO tests for `vitest run test/`.
import { defineConfig } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'node:url'
const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: [
      'test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'test/chat-system/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    exclude: ['node_modules', 'dist', '.next', 'coverage', 'backend/node_modules'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['components/**/*.{js,ts,jsx,tsx}', 'lib/**/*.{js,ts}', 'app/**/*.{js,ts,jsx,tsx}'],
      exclude: [
        'node_modules',
        'test',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        // app/api/** is intentionally NOT excluded: route handlers (incl. the
        // security-sensitive transit group-chat paths) should count toward coverage so
        // gaps stay visible rather than silently uncovered.
        'components/ui/**',
      ],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@/components': path.resolve(__dirname, './components'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/app': path.resolve(__dirname, './app'),
      '@/hooks': path.resolve(__dirname, './hooks'),
      '@/test': path.resolve(__dirname, './test'),
    },
  },
})
