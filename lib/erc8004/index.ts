/**
 * ERC-8004 on-chain agent registry — Google Cloud BigQuery indexing layer.
 *
 * - registry.ts            → mainnet singleton addresses, ABIs, event topics, id helpers
 * - registration-file.ts   → the agent "homepage" JSON (x402Support / active / supportedTrust / services)
 * - bigquery-queries.ts     → SQL generator (partition-pruned, SUBSTR/SAFE_CAST decode)
 * - bigquery-indexer.ts     → Node.js indexing service + ranking-app leaderboard
 */

export * from './registry'
export * from './registration-file'
export * from './ensip'
export * from './register-client'
export * from './bigquery-queries'
export * from './bigquery-indexer'
