export default function ForgeKnowledgeInfusion() {
  return (
    <div className="stitch-export bg-st-background min-h-screen text-zinc-100">
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center">
        <div className="absolute w-[800px] h-[800px] bg-spirit-violet/10 rounded-full blur-[120px] opacity-50 mix-blend-screen"></div>
        <div className="absolute w-[600px] h-[600px] bg-st-primary/5 rounded-full blur-[80px] opacity-30 mix-blend-screen animate-pulse-glow"></div>
      </div>
      <main className="flex-grow flex flex-col items-center justify-center p-gutter relative z-10 w-full max-w-container-max mx-auto">
        <header className="text-center mb-16 space-y-4">
          <div className="font-label-mono text-label-mono text-spirit-violet uppercase tracking-widest mb-4 inline-block px-4 py-1 border border-spirit-violet/30 rounded-full bg-spirit-violet/5">
            Phase V: Alignment
          </div>
          <h1 className="font-headline-xl text-headline-xl text-st-primary drop-shadow-[0_0_15px_rgba(210,187,255,0.3)]">
            Infuse Knowledge
          </h1>
          <h2 className="font-headline-sm text-headline-sm text-on-surface-variant">
            Feed the Core
          </h2>
          <p className="font-body-lg text-body-lg text-outline max-w-2xl mx-auto mt-6">
            The agent will resonate with the context of your choosing. Cast forth your tomes,
            grimoires, and astral links into the crucible to forge its understanding.
          </p>
        </header>
        <div className="relative flex flex-col items-center justify-center w-full max-w-2xl mb-12">
          <div
            className="relative w-80 h-80 md:w-96 md:h-96 flex items-center justify-center cursor-pointer group transition-transform duration-500 hover:scale-105"
            id="crucible"
          >
            <div className="absolute inset-0 rounded-full border border-dashed border-spirit-violet/40 animate-spin-slow"></div>
            <div className="absolute inset-4 rounded-full border border-st-primary/20 animate-spin-slow-reverse"></div>
            <div className="absolute inset-12 rounded-full border-2 border-spirit-violet/10"></div>
            <div className="absolute inset-16 rounded-full bg-surface-container-lowest/60 backdrop-blur-2xl border border-st-primary/30 shadow-[0_0_50px_rgba(168,85,247,0.15)] group-hover:shadow-[0_0_80px_rgba(168,85,247,0.3)] transition-all duration-500 flex flex-col items-center justify-center text-center p-6 z-20">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-5xl text-st-primary mb-4 group-hover:text-spirit-violet transition-colors duration-300 drop-shadow-[0_0_10px_rgba(210,187,255,0.5)]"
              >
                magic_button
              </span>
              <p className="font-label-mono text-label-mono text-st-primary uppercase tracking-wider group-hover:text-white transition-colors duration-300">
                Drop Tomes Here
              </p>
              <p className="text-xs text-outline mt-2 font-label-mono">PDF, TXT, CSV</p>
            </div>
          </div>
          <div className="mt-12 w-full max-w-md relative z-20">
            <div className="relative group">
              <span
                aria-hidden="true"
                className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-st-primary transition-colors"
              >
                link
              </span>
              <input
                className="w-full bg-surface-container/50 backdrop-blur-md border-0 border-b-2 border-surface-variant focus:border-spirit-violet text-on-background font-body-md pl-12 pr-4 py-4 focus:ring-0 transition-all duration-300 shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)] focus:shadow-[0_10px_30px_-10px_rgba(168,85,247,0.2)] rounded-t-lg placeholder:text-outline/50"
                placeholder="Or cast an Astral Link (URL)..."
                type="text"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent text-st-primary hover:text-spirit-violet p-2 transition-colors">
                <span aria-hidden="true" className="material-symbols-outlined">
                  add_circle
                </span>
              </button>
            </div>
          </div>
        </div>
        <div className="w-full max-w-3xl flex flex-col items-center z-20">
          <h3 className="font-label-mono text-label-mono text-outline mb-6 uppercase tracking-widest text-center border-b border-surface-variant pb-2 w-full">
            Active Resonances
          </h3>
          <div className="flex flex-wrap justify-center gap-4 w-full" id="sigil-container">
            <div className="flex items-center gap-3 bg-surface-container-high/60 backdrop-blur-md border border-st-primary/20 rounded-full pl-2 pr-4 py-2 shadow-[0_0_15px_rgba(168,85,247,0.05)] hover:border-spirit-violet/50 transition-colors group">
              <div className="w-8 h-8 rounded-full bg-surface-dim flex items-center justify-center border border-st-primary/10 group-hover:border-st-primary/40 transition-colors">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-sm text-st-primary"
                >
                  description
                </span>
              </div>
              <span className="font-label-mono text-sm text-on-surface-variant group-hover:text-st-primary transition-colors">
                alchemical_principles.pdf
              </span>
              <button className="ml-2 text-outline hover:text-error transition-colors">
                <span aria-hidden="true" className="material-symbols-outlined text-sm">
                  close
                </span>
              </button>
            </div>
            <div className="flex items-center gap-3 bg-surface-container-high/60 backdrop-blur-md border border-tertiary-fixed-dim/20 rounded-full pl-2 pr-4 py-2 shadow-[0_0_15px_rgba(78,222,163,0.05)] hover:border-tertiary-fixed-dim/50 transition-colors group">
              <div className="w-8 h-8 rounded-full bg-surface-dim flex items-center justify-center border border-tertiary-fixed-dim/10 group-hover:border-tertiary-fixed-dim/40 transition-colors">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-sm text-tertiary-fixed-dim"
                >
                  language
                </span>
              </div>
              <span className="font-label-mono text-sm text-on-surface-variant group-hover:text-tertiary-fixed-dim transition-colors">
                void-protocols.net/core
              </span>
              <button className="ml-2 text-outline hover:text-error transition-colors">
                <span aria-hidden="true" className="material-symbols-outlined text-sm">
                  close
                </span>
              </button>
            </div>
          </div>
        </div>
        <div className="fixed bottom-0 left-0 w-full p-6 flex justify-between items-center z-30 pointer-events-none">
          <button className="pointer-events-auto px-6 py-3 border border-surface-variant text-on-surface-variant font-label-mono text-label-mono uppercase hover:bg-white/5 hover:text-white transition-all duration-300 rounded">
            Retreat
          </button>
          <button className="pointer-events-auto px-8 py-3 bg-spirit-violet text-white font-label-mono text-label-mono uppercase shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(255,255,255,0.6)] hover:bg-st-primary transition-all duration-300 rounded flex items-center gap-2">
            Commence Synthesis
            <span aria-hidden="true" className="material-symbols-outlined text-sm">
              arrow_forward
            </span>
          </button>
        </div>
      </main>
    </div>
  )
}
