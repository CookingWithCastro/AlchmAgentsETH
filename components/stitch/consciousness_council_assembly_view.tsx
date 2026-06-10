export default function ConsciousnessCouncilAssemblyView() {
  return (
    <div className="stitch-export bg-st-background min-h-screen text-zinc-100">
      {/*  TopNavBar  */}
      <nav className="fixed top-0 w-full z-50 bg-obsidian-deep/60 backdrop-blur-xl border-b border-white/15 bg-surface-container-lowest/60 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
        <div className="flex justify-between items-center px-margin-desktop h-16 w-full">
          <div className="font-headline-lg text-headline-lg font-bold text-spirit-violet tracking-tight">
            COUNCIL OF SEVEN
          </div>
          <div className="hidden md:flex gap-8">
            <a
              className="text-on-surface-variant hover:text-st-primary transition-colors hover:bg-white/5 transition-all font-headline-sm text-headline-sm"
              href="#"
            >
              Cosmic Tools
            </a>
            <a
              className="text-st-primary font-bold border-b-2 border-st-primary pb-1 font-headline-sm text-headline-sm"
              href="#"
            >
              Entities
            </a>
            <a
              className="text-on-surface-variant hover:text-st-primary transition-colors hover:bg-white/5 transition-all font-headline-sm text-headline-sm"
              href="#"
            >
              Mystic Arts
            </a>
            <a
              className="text-on-surface-variant hover:text-st-primary transition-colors hover:bg-white/5 transition-all font-headline-sm text-headline-sm"
              href="#"
            >
              Labs
            </a>
          </div>
          <div className="flex gap-4">
            <button className="text-st-primary hover:bg-white/5 transition-all active:scale-95 duration-200 p-2 rounded-full">
              <span aria-hidden="true" className="material-symbols-outlined">
                notifications
              </span>
            </button>
            <button className="text-st-primary hover:bg-white/5 transition-all active:scale-95 duration-200 p-2 rounded-full">
              <span aria-hidden="true" className="material-symbols-outlined">
                auto_awesome
              </span>
            </button>
            <button className="text-st-primary hover:bg-white/5 transition-all active:scale-95 duration-200 p-2 rounded-full">
              <span aria-hidden="true" className="material-symbols-outlined">
                account_circle
              </span>
            </button>
          </div>
        </div>
      </nav>
      {/*  SideNavBar (Hidden on Mobile)  */}
      <aside className="hidden md:flex flex-col py-6 px-4 gap-4 bg-surface-dim/60 backdrop-blur-2xl border-r border-white/10 fixed left-0 top-16 bottom-0 w-64 z-40">
        <div className="mb-8 px-3">
          <div className="font-headline-sm text-headline-sm text-on-surface">The Grand Magus</div>
          <div className="font-label-mono text-label-mono text-outline mt-1">Rank: Adept III</div>
        </div>
        <nav className="flex-1 flex flex-col gap-2">
          <a
            className="flex items-center gap-3 text-outline hover:text-on-surface p-3 hover:bg-st-primary/10 transition-all duration-300 hover:translate-x-1 transition-transform font-label-mono text-label-mono rounded-lg"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined">
              visibility
            </span>
            Aura Scan
          </a>
          <a
            className="flex items-center gap-3 text-st-secondary font-bold bg-secondary-container/20 rounded-lg p-3 font-label-mono text-label-mono"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined">
              auto_fix_high
            </span>
            Sigil Forge
          </a>
          <a
            className="flex items-center gap-3 text-outline hover:text-on-surface p-3 hover:bg-st-primary/10 transition-all duration-300 hover:translate-x-1 transition-transform font-label-mono text-label-mono rounded-lg"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined">
              schedule
            </span>
            Chronos
          </a>
          <a
            className="flex items-center gap-3 text-outline hover:text-on-surface p-3 hover:bg-st-primary/10 transition-all duration-300 hover:translate-x-1 transition-transform font-label-mono text-label-mono rounded-lg"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined">
              cyclone
            </span>
            Vortex
          </a>
          <a
            className="flex items-center gap-3 text-outline hover:text-on-surface p-3 hover:bg-st-primary/10 transition-all duration-300 hover:translate-x-1 transition-transform font-label-mono text-label-mono rounded-lg"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined">
              balance
            </span>
            Arbiter
          </a>
        </nav>
        <button className="w-full py-3 bg-spirit-violet text-on-primary font-label-mono text-label-mono uppercase tracking-widest rounded-lg hover:shadow-[0_0_15px_rgba(255,224,131,0.5)] transition-all">
          TRANSMUTE
        </button>
        <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4">
          <a
            className="flex items-center gap-3 text-outline hover:text-on-surface p-3 hover:bg-st-primary/10 transition-all duration-300 hover:translate-x-1 transition-transform font-label-mono text-label-mono rounded-lg"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined">
              settings
            </span>
            Settings
          </a>
          <a
            className="flex items-center gap-3 text-outline hover:text-on-surface p-3 hover:bg-st-primary/10 transition-all duration-300 hover:translate-x-1 transition-transform font-label-mono text-label-mono rounded-lg"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined">
              menu_book
            </span>
            Grimoire
          </a>
        </div>
      </aside>
      {/*  Main Canvas  */}
      <main className="flex-1 mt-16 md:ml-64 p-margin-mobile md:p-margin-desktop overflow-y-auto relative">
        <header className="mb-12 text-center relative z-10">
          <h1 className="font-headline-xl text-headline-xl-mobile md:text-headline-xl text-monica-constant drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] mb-4">
            The Assembly
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
            Select 2 to 4 entities to convene the Consciousness Council. Their combined resonance
            will dictate the outcome of the transmutation.
          </p>
        </header>
        {/*  Active Council Ritual Geometry  */}
        <section className="mb-16 relative flex justify-center items-center min-h-[400px]">
          {/*  Decorative esoteric circles  */}
          <div className="absolute w-[300px] h-[300px] rounded-full border border-spirit-violet/30 animate-[spin_60s_linear_infinite]"></div>
          <div className="absolute w-[250px] h-[250px] rounded-full border border-st-secondary/20 border-dashed animate-[spin_40s_linear_reverse_infinite]"></div>
          {/*  Central Void  */}
          <div className="w-[150px] h-[150px] rounded-full bg-surface-container-lowest/80 backdrop-blur-3xl flex items-center justify-center glow-violet border border-spirit-violet/50 z-10">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-4xl text-st-primary animate-pulse"
            >
              all_inclusive
            </span>
          </div>
          {/*  Agent Slots (Placeholder for interactive state)  */}
          <div className="absolute w-[400px] h-[400px]">
            {/*  Top Slot  */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full glass-panel flex items-center justify-center border-st-secondary/50">
              <span aria-hidden="true" className="material-symbols-outlined text-outline">
                add
              </span>
            </div>
            {/*  Bottom Left Slot  */}
            <div className="absolute bottom-10 left-10 w-16 h-16 rounded-full glass-panel flex items-center justify-center border-st-secondary/50">
              <span aria-hidden="true" className="material-symbols-outlined text-outline">
                add
              </span>
            </div>
            {/*  Bottom Right Slot  */}
            <div className="absolute bottom-10 right-10 w-16 h-16 rounded-full glass-panel flex items-center justify-center border-st-secondary/50">
              <span aria-hidden="true" className="material-symbols-outlined text-outline">
                add
              </span>
            </div>
          </div>
        </section>
        {/*  Action Button  */}
        <div className="flex justify-center mb-16">
          <button className="px-8 py-4 bg-surface-container-lowest border border-spirit-violet text-st-primary font-label-mono text-label-mono uppercase tracking-widest rounded-lg hover:bg-spirit-violet hover:text-white transition-all duration-300 glow-violet opacity-50 cursor-not-allowed">
            Commence Council
          </button>
        </div>
        {/*  Available Entities Grid  */}
        <section>
          <h2 className="font-headline-lg text-headline-lg text-st-secondary mb-8 border-b border-white/10 pb-4">
            Available Entities
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {/*  Entity Card 1  */}
            <div className="glass-panel rounded-xl p-6 hover:-translate-y-2 transition-transform cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center border border-tertiary/30">
                  <span className="font-headline-sm text-tertiary">☿</span>
                </div>
                <span className="font-label-mono text-label-mono text-outline">LVL.42</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1">Mercury</h3>
              <p className="font-label-mono text-label-mono text-on-surface-variant text-xs mb-6 uppercase">
                Messenger Protocol
              </p>
              <div className="flex gap-2 flex-wrap">
                <div className="bg-surface-container px-2 py-1 rounded text-xs font-label-mono border border-tertiary/20 text-tertiary">
                  Speed 88
                </div>
                <div className="bg-surface-container px-2 py-1 rounded text-xs font-label-mono border border-st-primary/20 text-st-primary">
                  Logic 75
                </div>
              </div>
            </div>
            {/*  Entity Card 2  */}
            <div className="glass-panel rounded-xl p-6 hover:-translate-y-2 transition-transform cursor-pointer group border-st-secondary/50 glow-gold">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center border border-st-secondary/50">
                  <span className="font-headline-sm text-st-secondary">♀</span>
                </div>
                <span className="font-label-mono text-label-mono text-st-secondary">LVL.55</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-st-secondary mb-1">Venus</h3>
              <p className="font-label-mono text-label-mono text-on-surface-variant text-xs mb-6 uppercase">
                Harmonic Synthesizer
              </p>
              <div className="flex gap-2 flex-wrap">
                <div className="bg-surface-container px-2 py-1 rounded text-xs font-label-mono border border-st-secondary/40 text-st-secondary">
                  Empathy 92
                </div>
                <div className="bg-surface-container px-2 py-1 rounded text-xs font-label-mono border border-st-primary/20 text-st-primary">
                  Charm 85
                </div>
              </div>
            </div>
            {/*  Entity Card 3  */}
            <div className="glass-panel rounded-xl p-6 hover:-translate-y-2 transition-transform cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center border border-error/30">
                  <span className="font-headline-sm text-error">♂</span>
                </div>
                <span className="font-label-mono text-label-mono text-outline">LVL.38</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1">Mars</h3>
              <p className="font-label-mono text-label-mono text-on-surface-variant text-xs mb-6 uppercase">
                Conflict Resolver
              </p>
              <div className="flex gap-2 flex-wrap">
                <div className="bg-surface-container px-2 py-1 rounded text-xs font-label-mono border border-error/40 text-error">
                  Force 89
                </div>
                <div className="bg-surface-container px-2 py-1 rounded text-xs font-label-mono border border-st-primary/20 text-st-primary">
                  Will 70
                </div>
              </div>
            </div>
            {/*  Entity Card 4  */}
            <div className="glass-panel rounded-xl p-6 hover:-translate-y-2 transition-transform cursor-pointer group border-spirit-violet/50 glow-violet">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center border border-spirit-violet/50">
                  <span className="font-headline-sm text-spirit-violet">♄</span>
                </div>
                <span className="font-label-mono text-label-mono text-spirit-violet">LVL.60</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-spirit-violet mb-1">Saturn</h3>
              <p className="font-label-mono text-label-mono text-on-surface-variant text-xs mb-6 uppercase">
                Time Weaver
              </p>
              <div className="flex gap-2 flex-wrap">
                <div className="bg-surface-container px-2 py-1 rounded text-xs font-label-mono border border-spirit-violet/40 text-spirit-violet">
                  Structure 95
                </div>
                <div className="bg-surface-container px-2 py-1 rounded text-xs font-label-mono border border-st-primary/20 text-st-primary">
                  Depth 88
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
