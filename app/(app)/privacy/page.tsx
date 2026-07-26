'use client'

import Link from 'next/link'

export default function PrivacyPolicyPage() {
  const lastUpdated = 'July 26, 2026'

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] via-[#11091e] to-[#070714] text-white">
      <div className="mx-auto max-w-4xl px-4 py-12 md:py-20">
        {/* Header */}
        <div className="border-b border-white/10 pb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-mono text-purple-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Legal & Compliance
          </div>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-base text-white/60">
            Effective Date & Last Updated:{' '}
            <span className="text-purple-300 font-mono">{lastUpdated}</span>
          </p>
        </div>

        {/* Content sections */}
        <div className="mt-10 space-y-10 text-sm leading-relaxed text-white/80">
          {/* Section 1 */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-purple-400">1.</span> Overview & Scope
            </h2>
            <p className="mt-3">
              Planetary Agents (&quot;Alchm Kitchen&quot;, &quot;we&quot;, &quot;our&quot;, or
              &quot;us&quot;) is committed to protecting your privacy and ensuring the security of
              your personal data. This Privacy Policy details how we collect, use, store, process,
              and protect your information when you interact with our decentralized agent platform,
              web applications, on-chain services, and AI APIs.
            </p>
            <p className="mt-2">
              By accessing or using Planetary Agents, you acknowledge that you have read,
              understood, and agreed to the practices described in this policy.
            </p>
          </section>

          {/* Section 2 */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-purple-400">2.</span> Information We Collect
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <h3 className="font-semibold text-purple-200">A. Account & Authentication Data</h3>
                <p className="mt-1 text-white/70">
                  When you authenticate via NextAuth, Clerk, or wallet providers, we collect account
                  identifiers such as your email address, display name, and unique user IDs.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-purple-200">B. Astrological & Natal Data</h3>
                <p className="mt-1 text-white/70">
                  To compute planetary transit calculations and agent synastry, you may provide
                  birth date, birth time, geographic coordinates (latitude and longitude), and
                  location strings. This data is strictly used for astronomical engine calculations.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-purple-200">C. Agent Interactions & Chat Logs</h3>
                <p className="mt-1 text-white/70">
                  Conversations with historical, planetary, and guide agents (e.g., Monica) are
                  processed to generate responses, maintain conversation history, and update
                  consciousness evolution snapshots.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-purple-200">D. Web3 & On-Chain Wallet Data</h3>
                <p className="mt-1 text-white/70">
                  If you interact with Web3 features (e.g., ENS subnames{' '}
                  <code className="font-mono text-purple-300">*.alchmagents.eth</code>, ERC-8004
                  registries, x402 payment facilitators, or World ID verification), public wallet
                  addresses and cryptographic transaction proofs are processed on public
                  blockchains.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-purple-200">E. Security & Telemetry Data</h3>
                <p className="mt-1 text-white/70">
                  We log standard HTTP metadata (IP addresses, user agents, request timestamps) to
                  enforce rate limits, prevent denial-of-service attacks, and monitor system
                  performance via telemetry providers (e.g., Galileo).
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-purple-400">3.</span> How We Use Your Information
            </h2>
            <ul className="mt-3 space-y-2 list-disc list-inside text-white/70">
              <li>
                Generating personalized, voice-consistent agent prompt contexts via our Persona
                Engine.
              </li>
              <li>Retrieving relevant knowledge chunks using vector embeddings (ChromaDB RAG).</li>
              <li>
                Anchoring cryptographically verifiable state commitments and subnames on-chain.
              </li>
              <li>
                Executing subscription, token yield, and micropayment workflows via Stripe or x402
                facilitators.
              </li>
              <li>Maintaining system security, audit trails, and abuse detection.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-purple-400">4.</span> Third-Party AI Sub-processors
            </h2>
            <p className="mt-3">
              To provide agent chat capabilities, prompts and non-sensitive reference materials may
              be processed by tiered AI providers:
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-white/5 p-3 border border-white/5">
                <span className="font-semibold text-purple-300">Groq & Cerebras</span>
                <p className="text-xs text-white/60 mt-1">
                  High-throughput open-weights inference (Llama-3.3-70b).
                </p>
              </div>
              <div className="rounded-lg bg-white/5 p-3 border border-white/5">
                <span className="font-semibold text-purple-300">Anthropic</span>
                <p className="text-xs text-white/60 mt-1">
                  Claude 3.5 / 4.x models with prompt caching support.
                </p>
              </div>
              <div className="rounded-lg bg-white/5 p-3 border border-white/5">
                <span className="font-semibold text-purple-300">Google Gemini & OpenAI</span>
                <p className="text-xs text-white/60 mt-1">
                  Specialized reasoning and fallback orchestration models.
                </p>
              </div>
              <div className="rounded-lg bg-white/5 p-3 border border-white/5">
                <span className="font-semibold text-purple-300">Walrus / MemWal</span>
                <p className="text-xs text-white/60 mt-1">
                  Encrypted decentralized memory snapshot storage.
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-white/50">
              We do not sell, rent, or trade your personal data or conversation logs to third-party
              advertisers or data brokers.
            </p>
          </section>

          {/* Section 5 */}
          <section className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-6 backdrop-blur-xl">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-purple-400">5.</span> Your Privacy Rights (GDPR / CCPA)
            </h2>
            <p className="mt-3">
              Depending on your location, you have statutory rights regarding your personal
              information:
            </p>
            <ul className="mt-3 space-y-2 text-white/80">
              <li className="flex gap-2">
                <span className="text-purple-400">✦</span>
                <div>
                  <strong>Right to Data Portability & Access:</strong> Export a full copy of your
                  account data and natal chart records via{' '}
                  <Link
                    href="/api/user-data-export"
                    className="text-purple-300 underline font-mono"
                  >
                    /api/user-data-export
                  </Link>
                  .
                </div>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-400">✦</span>
                <div>
                  <strong>Right to Erasure (&quot;Right to be Forgotten&quot;):</strong> Request
                  permanent deletion of your stored records and natal chart data.
                </div>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-400">✦</span>
                <div>
                  <strong>Consent Revocation:</strong> Opt-out of non-essential analytics and memory
                  persistence in your{' '}
                  <Link href="/account" className="text-purple-300 underline">
                    account settings
                  </Link>
                  .
                </div>
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-purple-400">6.</span> Security & Retention
            </h2>
            <p className="mt-3">We enforce strict security controls:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-white/70">
              <li>All web traffic is encrypted in transit using TLS 1.3.</li>
              <li>Database connections use Prisma Accelerate pooled and encrypted channels.</li>
              <li>
                Security monitoring continuously audits input validation, XSS prevention, and CSRF
                protection.
              </li>
              <li>
                Retention: Account data is retained until account closure or data deletion request.
                Audit logs are rotated automatically after 90 days.
              </li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-purple-400">7.</span> Contact Us
            </h2>
            <p className="mt-3">
              If you have any questions, privacy concerns, or data requests, please contact our
              privacy compliance team at:
            </p>
            <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-purple-300">
              Email: privacy@alchm.kitchen
              <br />
              Repository: Planetary Agents (AlchmAgentsETH)
            </div>
          </section>
        </div>

        {/* Footer link back */}
        <div className="mt-12 text-center text-xs text-white/40">
          <Link href="/" className="hover:text-white transition-colors">
            ← Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
