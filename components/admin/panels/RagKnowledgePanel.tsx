'use client'

import { Database, FileSearch, HardDrive, Gauge, ExternalLink, HelpCircle } from 'lucide-react'
import { RAGMonitor } from '@/components/rag/rag-monitor'
import Link from 'next/link'

interface RagKnowledgeProps {
  productionUrl: string
}

export default function RagKnowledgePanel({ productionUrl }: RagKnowledgeProps) {
  const panelButtonClass =
    'flex items-center justify-between gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-bold text-zinc-250 transition hover:border-sky-500/30 hover:bg-sky-500/10 hover:text-sky-100 font-sans'

  return (
    <div className="space-y-6 font-sans">
      {/* Overview Metaphysical RAG Card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-teal-950/40 via-emerald-950/30 to-zinc-950 p-6 backdrop-blur-md">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="space-y-1.5 relative z-10">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
            <Database className="h-3 w-3" />
            Active Vector Collection Status
          </div>
          <h3 className="text-2xl font-black tracking-tight text-zinc-50 font-sans">
            Knowledge Retrieval Engine
          </h3>
          <p className="text-xs text-zinc-400 max-w-xl">
            Live ingestion, indexing, and vector query analytics. Manages ChromaDB bindings and
            embedding alignments dynamically for agent conversations.
          </p>
        </div>
      </div>

      {/* Main RAG Monitor embed */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/25 p-5 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3 mb-4">
          <h4 className="font-bold text-sm text-zinc-100 uppercase tracking-widest flex items-center gap-2">
            <FileSearch className="h-4 w-4 text-sky-400" />
            Knowledge Base Observability (ChromaDB)
          </h4>
          <Link
            href="/admin/rag-analytics"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-300 rounded-xl text-xs font-bold font-sans transition-all duration-300"
          >
            <FileSearch className="h-3.5 w-3.5" />
            Detailed Analytics page →
          </Link>
        </div>

        <div className="rounded-xl overflow-hidden bg-black/10 border border-white/5 p-4 text-zinc-100">
          <RAGMonitor variant="detailed" autoRefresh refreshInterval={10000} />
        </div>
      </div>

      {/* Knowledge Base Actions Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Actions panel */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-5 backdrop-blur-md flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-sm text-zinc-100 uppercase tracking-widest border-b border-white/5 pb-3 mb-4">
              Diagnostic Vector Commands
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link href="/api/vector-store/health" className={panelButtonClass}>
                <span className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-sky-400 shrink-0" />
                  Vector Store Health
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-650" />
              </Link>
              <Link href="/api/knowledge-updater" className={panelButtonClass}>
                <span className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-emerald-400 shrink-0" />
                  Knowledge Updater
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-650" />
              </Link>
              <Link href="/api/rag/cache" className={panelButtonClass}>
                <span className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-amber-400 shrink-0" />
                  Flush RAG Cache
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-650" />
              </Link>
              <a
                href={`${productionUrl}/api/vector-store/health`}
                target="_blank"
                rel="noreferrer"
                className={panelButtonClass}
              >
                <span className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-violet-400 shrink-0" />
                  Production Vector API
                </span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-zinc-650" />
              </a>
            </div>
          </div>
        </div>

        {/* Mechanism Explainers */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-5 backdrop-blur-md">
          <h4 className="font-bold text-sm text-zinc-100 uppercase tracking-widest border-b border-white/5 pb-3 mb-4 flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-zinc-400" />
            Knowledge Base Context Info
          </h4>

          <div className="space-y-3.5 text-xs text-zinc-450 leading-relaxed font-sans">
            <div>
              <span className="font-bold text-zinc-300 block mb-0.5">
                Semantic Web Scraping API
              </span>
              <p>
                Dynamic ingestion is enabled through the Knowledge Updater API
                (`/api/knowledge-updater`). It uses `CheerioWebBaseLoader` for web targets and
                `PDFLoader` for uploading manuals directly into ChromaDB.
              </p>
            </div>
            <div>
              <span className="font-bold text-zinc-300 block mb-0.5">Active Embeddings Cache</span>
              <p>
                Embedding calls leverage OpenAI and LlamaIndex to compute metaphysical similarity
                weights. The results are cached for 24h to avoid redundant model invocation
                overhead.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="2.5"
      stroke="currentColor"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}
