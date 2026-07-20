// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook'

import js from '@eslint/js'
import nextPlugin from '@next/eslint-plugin-next'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y'
import typescriptPlugin from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import prettierConfig from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'

const IGNORED_PATTERNS = [
  '**/node_modules/**',
  '**/.next/**',
  '**/.turbo/**',
  '**/.vercel/**',
  '**/out/**',
  '**/dist/**',
  '**/build/**',
  'coverage/**',
  '**/.cache/**',
  '**/.yarn/**',
  '.git/**',
  'public/**',
  'prisma/migrations/**',
  'scripts/**',
  '__tests__/**',
  'tests/**',
  'test-results*/**',
  'scratch/**',
  'design/prototypes/**',
  'backend/**',
  'contracts/**',

  // Ignore all contents under lib/ and app/ by default to prevent noisy legacy lint issues
  'lib/**/*',
  'app/**/*',

  // Un-ignore only the correctness-cleaned files to protect them from regression
  '!app/(app)/philosophers-stone/modern-page-v2.tsx',
  '!app/(app)/philosophers-stone/modern-page.tsx',
  '!app/api/admin/system-stats/route.ts',
  '!app/api/agent-attachments/route.ts',
  '!app/api/agent-evolution/route.ts',
  '!app/api/agents/unified/route.ts',
  '!app/api/feed/historical-agents/route.ts',
  '!app/api/notifications/route.ts',
  '!app/api/transit-monitoring-jobs/route.ts',
  '!components/misc/temporal-timeline.tsx',
  '!lib/agents/historical-feed-contract.ts',
  '!lib/demo-agents-data.ts',
  '!lib/langchain/agent-tools.ts',
  '!lib/personalized-ai/training-interface-design.ts',
  '!lib/runes/natal-sigil-runes.ts',
  '!lib/runes/pattern-to-rune-converter.ts',

  '**/*.json',
  '**/*.md',
  '**/*.log',
  '**/*.ipynb',
  '**/*.py',
  '**/*.sh',
  '**/*.env*',
  'dev.db',
]

const SOURCE_GLOBS = [
  'app/api/agent-interaction/**/*.{ts,tsx}',
  'app/api/consciousness-crafting/**/*.{ts,tsx}',
  'app/api/user-charts/**/*.{ts,tsx}',
  'app/api/profile/**/*.{ts,tsx}',
  'app/api/create-agent/**/*.{ts,tsx}',
  'app/philosophers-stone/**/*.{ts,tsx}',
  'lib/api-client/**/*.ts',
  'lib/consciousness/**/*.ts',
  'lib/utils.ts',
]

const COMMON_RULES = {
  ...js.configs.recommended.rules,
  ...reactPlugin.configs.recommended.rules,
  ...reactHooksPlugin.configs.recommended.rules,
  ...jsxA11yPlugin.configs.recommended.rules,
  ...nextPlugin.configs.recommended.rules,
  ...nextPlugin.configs['core-web-vitals'].rules,
  'react/react-in-jsx-scope': 'off',
  'react/prop-types': 'off',
  'react/jsx-uses-react': 'off',
  'react/jsx-uses-vars': 'error',
  'jsx-a11y/anchor-is-valid': 'off',
  'no-console': 'off',
  'no-debugger': 'error',
  'no-duplicate-imports': 'error',
  'prefer-const': 'error',
  'no-var': 'error',
  'object-shorthand': 'error',
  'prefer-template': 'error',
  'prettier/prettier': [
    'error',
    {
      semi: false,
      singleQuote: true,
      trailingComma: 'es5',
      tabWidth: 2,
      useTabs: false,
      printWidth: 100,
      endOfLine: 'lf',
    },
  ],
}

const config = [
  { ignores: IGNORED_PATTERNS },
  // Codebase-wide correctness/rules-of-hooks lockdown block
  {
    files: ['lib/**/*.{ts,tsx,js,jsx,mjs,cjs}', 'app/**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-empty': 'off',
      'no-constant-condition': 'off',
      'no-useless-escape': 'off',
      'no-extra-boolean-cast': 'off',
      'no-prototype-builtins': 'off',
      'no-control-regex': 'off',
      'no-async-promise-executor': 'off',
      'no-misleading-character-class': 'off',
      'no-sparse-arrays': 'off',
      'no-cond-assign': 'off',
      'react-hooks/rules-of-hooks': 'error',
    },
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
      '@next/next': nextPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      'react-hooks/exhaustive-deps': 'off',
    },
  },
  {
    files: SOURCE_GLOBS,
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        globalThis: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        setImmediate: 'readonly',
        performance: 'readonly',
        Blob: 'readonly',
        WebSocket: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        TextEncoder: 'readonly',
        ReadableStream: 'readonly',
        AbortController: 'readonly',
        navigator: 'readonly',
        window: 'readonly',
        localStorage: 'readonly',
        alert: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
      },
    },
    settings: { react: { version: 'detect' } },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
      '@next/next': nextPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      ...COMMON_RULES,
      ...typescriptPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-var-requires': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['*.config.{js,ts}', '*.config.*.{js,ts}'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
  {
    files: ['**/__tests__/**/*', '**/*.{test,spec}.{js,ts,tsx}'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  // Client-bundle boundary. Everything under components/ can end up in a client
  // component, and webpack must resolve its whole import graph for the browser.
  // A `node:` builtin anywhere in that graph fails the build outright with
  // `UnhandledSchemeError: Reading from "node:crypto" is not handled by plugins`,
  // which is what took /arena (and every Vercel deploy) down.
  {
    files: ['components/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['node:*'],
              message:
                'Node builtins cannot be bundled for the browser. Use a Web API equivalent, or move this behind a route handler / server action.',
            },
            {
              group: [
                '@/lib/agents/persona/*',
                '**/lib/agents/persona/*',
                '@/lib/agents/duel/jing-move',
                '**/lib/agents/duel/jing-move',
                '@/lib/agents/duel/word-duel',
                '**/lib/agents/duel/word-duel',
                '@/lib/walrus/*',
                '**/lib/walrus/*',
              ],
              message:
                'Server-only: these modules reach node: builtins or the model SDKs, so importing them from components/ breaks the webpack browser build. For Jing constants and types import @/lib/agents/duel/jing-rules; otherwise call this through a route handler.',
            },
          ],
        },
      ],
    },
  },
  prettierConfig,
  ...storybook.configs['flat/recommended'],
]

export default config
