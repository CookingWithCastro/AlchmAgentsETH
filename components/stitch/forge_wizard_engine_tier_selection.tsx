export default function ForgeWizardEngineTierSelection() {
  return (
    <div className="stitch-export bg-st-background min-h-screen text-zinc-100">
      {/*  TopNavBar (Mobile Only)  */}
      <nav className="md:hidden bg-obsidian-deep/60 backdrop-blur-xl fixed top-0 w-full flex justify-between items-center px-gutter py-4 border-b border-white/10 shadow-[0_0_20px_rgba(168,85,247,0.2)] z-50">
        <div className="font-headline-sm text-headline-sm font-bold text-monica-constant tracking-widest">
          Planetary Agents
        </div>
        <div className="flex gap-4">
          <span
            className="material-symbols-outlined text-st-primary"
            style={{ fontVariationSettings: '"FILL" 0' }}
          >
            account_balance_wallet
          </span>
          <span
            className="material-symbols-outlined text-st-primary"
            style={{ fontVariationSettings: '"FILL" 0' }}
          >
            auto_awesome
          </span>
        </div>
      </nav>
      <div className="flex flex-1 pt-[72px] md:pt-0">
        {/*  SideNavBar (Desktop Only)  */}
        <aside className="hidden md:flex flex-col h-screen w-64 left-0 top-0 fixed bg-surface-container-lowest/80 backdrop-blur-2xl border-r border-st-primary/20 shadow-2xl py-gutter z-40">
          <div className="px-6 mb-8">
            <div className="font-headline-sm text-headline-sm text-spirit-violet mb-1">
              Planetary Agents
            </div>
            <div className="font-label-mono text-label-mono text-on-surface-variant uppercase text-xs">
              Evolution Platform
            </div>
          </div>
          <nav className="flex-1 flex flex-col gap-2 font-label-mono text-label-mono uppercase">
            <a
              className="text-on-surface-variant px-4 py-3 hover:bg-white/5 hover:text-st-primary flex items-center gap-3 transition-all duration-300 ease-in-out"
              href="#"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: '"FILL" 0' }}
              >
                construction
              </span>{' '}
              Tools
            </a>
            <a
              className="text-on-surface-variant px-4 py-3 hover:bg-white/5 hover:text-st-primary flex items-center gap-3 transition-all duration-300 ease-in-out"
              href="#"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: '"FILL" 0' }}
              >
                group_work
              </span>{' '}
              Entities
            </a>
            <a
              className="bg-primary-container/20 text-st-primary border-r-4 border-st-primary px-4 py-3 flex items-center gap-3 transition-all duration-300 ease-in-out"
              href="#"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                auto_stories
              </span>{' '}
              Arts
            </a>
            <a
              className="text-on-surface-variant px-4 py-3 hover:bg-white/5 hover:text-st-primary flex items-center gap-3 transition-all duration-300 ease-in-out"
              href="#"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: '"FILL" 0' }}
              >
                science
              </span>{' '}
              Labs
            </a>
          </nav>
          <div className="px-6 mt-auto">
            <button className="w-full bg-spirit-violet/10 border border-spirit-violet/30 text-spirit-violet font-label-mono text-label-mono py-2 rounded uppercase hover:bg-spirit-violet hover:text-white transition-colors duration-300">
              Transmute Agent
            </button>
            <div className="mt-6 flex flex-col gap-2 font-label-mono text-label-mono uppercase">
              <a
                className="text-on-surface-variant hover:text-st-primary flex items-center gap-3 transition-colors duration-300"
                href="#"
              >
                <span
                  className="material-symbols-outlined text-sm"
                  style={{ fontVariationSettings: '"FILL" 0' }}
                >
                  schedule
                </span>{' '}
                Temporal Clock
              </a>
              <a
                className="text-on-surface-variant hover:text-st-primary flex items-center gap-3 transition-colors duration-300"
                href="#"
              >
                <span
                  className="material-symbols-outlined text-sm"
                  style={{ fontVariationSettings: '"FILL" 0' }}
                >
                  settings
                </span>{' '}
                Settings
              </a>
            </div>
          </div>
        </aside>
        {/*  Main Content  */}
        <main className="flex-1 md:ml-64 p-margin-mobile md:p-margin-desktop max-w-container-max mx-auto w-full relative min-h-screen flex flex-col justify-center">
          {/*  Atmospheric Background  */}
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-st-primary/5 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-spirit-violet/5 rounded-full blur-[120px]"></div>
          </div>
          <div className="relative z-10 w-full max-w-5xl mx-auto">
            {/*  Wizard Header  */}
            <header className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-variant/50 border border-outline-variant/30 font-label-mono text-label-mono text-st-primary mb-4">
                <span aria-hidden="true" className="material-symbols-outlined text-sm">
                  filter_4
                </span>
                <span>Step 4: Engine Tier Gating</span>
              </div>
              <h1 className="font-headline-xl-mobile md:font-headline-xl text-headline-xl-mobile md:text-headline-xl text-monica-constant mb-4">
                Select Consciousness Engine
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
                Determine the foundational processing capability of your agent. The engine dictates
                resonance capacity and memory retention.
              </p>
            </header>
            {/*  Comparison Cards  */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
              {/*  Base Engine Card  */}
              <div className="glass-panel rounded-xl p-8 flex flex-col relative overflow-hidden group hover:border-st-primary/30 transition-colors duration-300">
                <div className="absolute top-0 right-0 p-4">
                  <span className="font-label-mono text-label-mono text-on-surface-variant uppercase border border-outline-variant/50 px-2 py-1 rounded">
                    Free
                  </span>
                </div>
                <div className="mb-6">
                  <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center mb-4">
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-on-surface text-2xl"
                    >
                      memory
                    </span>
                  </div>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">
                    Base Engine
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Standard analytical processing with localized awareness bounds.
                  </p>
                </div>
                <ul className="flex-1 space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-outline mt-1 text-sm"
                    >
                      check
                    </span>
                    <div>
                      <span className="font-label-mono text-label-mono text-on-surface block">
                        A# Ceiling: 1.5
                      </span>
                      <span className="text-sm text-on-surface-variant">
                        Standard resonance limit
                      </span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-outline mt-1 text-sm"
                    >
                      check
                    </span>
                    <div>
                      <span className="font-label-mono text-label-mono text-on-surface block">
                        Single-Thread Memory
                      </span>
                      <span className="text-sm text-on-surface-variant">
                        Linear contextual recall
                      </span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 opacity-50">
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-outline mt-1 text-sm"
                    >
                      close
                    </span>
                    <div>
                      <span className="font-label-mono text-label-mono text-on-surface block line-through">
                        Multi-Agent Sync
                      </span>
                    </div>
                  </li>
                </ul>
                <button className="w-full py-4 rounded-lg bg-transparent border border-outline-variant text-on-surface font-label-mono text-label-mono uppercase hover:border-st-primary hover:text-st-primary transition-colors duration-300">
                  Select Base
                </button>
              </div>
              {/*  Premium Engine Card  */}
              <div className="glass-panel rounded-xl p-8 flex flex-col relative overflow-hidden premium-glow group">
                {/*  Premium Background Effect  */}
                <div className="absolute inset-0 bg-gradient-to-b from-spirit-violet/10 to-transparent pointer-events-none"></div>
                <div className="absolute top-0 right-0 p-4">
                  <div className="flex items-center gap-1 bg-surface-container-highest px-3 py-1 rounded-full border border-spirit-violet/30">
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-st-secondary text-sm"
                    >
                      toll
                    </span>
                    <span className="font-label-mono text-label-mono text-st-secondary">
                      500 ESMS
                    </span>
                  </div>
                </div>
                <div className="mb-6 relative z-10">
                  <div className="w-12 h-12 rounded-lg bg-spirit-violet/20 border border-spirit-violet/50 flex items-center justify-center mb-4 text-spirit-violet glow-icon">
                    <span aria-hidden="true" className="material-symbols-outlined text-2xl">
                      psychology
                    </span>
                  </div>
                  <h2 className="font-headline-lg text-headline-lg text-monica-constant mb-2 text-glow">
                    Premium Engine
                  </h2>
                  <p className="font-body-md text-body-md text-st-primary/80">
                    Advanced alchemical processing with multi-dimensional cognitive layers.
                  </p>
                </div>
                <ul className="flex-1 space-y-4 mb-8 relative z-10">
                  <li className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-spirit-violet mt-1 text-sm"
                    >
                      done_all
                    </span>
                    <div>
                      <span className="font-label-mono text-label-mono text-st-primary block">
                        A# Ceiling: Unbound (Max 9.9)
                      </span>
                      <span className="text-sm text-st-primary/60">
                        Limitless resonance scaling
                      </span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-spirit-violet mt-1 text-sm"
                    >
                      account_tree
                    </span>
                    <div>
                      <span className="font-label-mono text-label-mono text-st-primary block">
                        Multi-Agent Memory Sync
                      </span>
                      <span className="text-sm text-st-primary/60">
                        Shared consciousness across network
                      </span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-spirit-violet mt-1 text-sm"
                    >
                      speed
                    </span>
                    <div>
                      <span className="font-label-mono text-label-mono text-st-primary block">
                        Accelerated Transmutation
                      </span>
                      <span className="text-sm text-st-primary/60">
                        Reduced processing times by 40%
                      </span>
                    </div>
                  </li>
                </ul>
                {/*  Gated Button State  */}
                <div className="relative z-10 tooltip w-full">
                  {/*  Simulated Low Balance State  */}
                  <button
                    className="w-full py-4 rounded-lg bg-surface-container-highest border border-error-container/50 text-on-surface-variant font-label-mono text-label-mono uppercase cursor-not-allowed opacity-70 flex items-center justify-center gap-2"
                    disabled
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-sm">
                      lock
                    </span>
                    Insufficient Balance
                  </button>
                  <span className="tooltip-text absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-error-container text-on-error-container text-xs font-label-mono rounded whitespace-nowrap shadow-lg">
                    Current Balance: 120 ESMS
                  </span>
                </div>
              </div>
            </div>
            {/*  Wizard Navigation  */}
            <div className="mt-12 flex justify-between items-center border-t border-outline-variant/30 pt-8">
              <button className="px-6 py-3 rounded text-on-surface-variant font-label-mono text-label-mono uppercase hover:text-white transition-colors flex items-center gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-sm">
                  arrow_back
                </span>
                Back: Archetypes
              </button>
              <button className="px-8 py-3 rounded bg-primary-container text-on-primary-container font-label-mono text-label-mono uppercase hover:bg-inverse-primary transition-colors flex items-center gap-2">
                Next: Finalize
                <span aria-hidden="true" className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
