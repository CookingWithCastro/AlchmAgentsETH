export default function ConsciousnessCouncilAlchemicalSynthesis() {
  return (
    <div className="stitch-export bg-st-background min-h-screen text-zinc-100">
      {/*  Ambient Background  */}
      <div className="fixed inset-0 pointer-events-none alchemical-grid z-0"></div>
      <div className="ambient-orb w-[600px] h-[600px] bg-spirit-violet top-[-200px] left-[-200px] mix-blend-screen"></div>
      <div className="ambient-orb w-[500px] h-[500px] bg-secondary-container bottom-[-100px] right-[-100px] mix-blend-screen opacity-20"></div>
      {/*  TopNavBar  */}
      <nav className="fixed top-0 w-full z-50 bg-obsidian-deep/60 backdrop-blur-xl border-b border-white/15 shadow-[0_0_20px_rgba(168,85,247,0.2)] flex justify-between items-center px-margin-desktop h-16 transition-all">
        <div className="flex items-center gap-gutter">
          <span className="font-headline-lg text-headline-lg font-bold text-spirit-violet tracking-tight">
            COUNCIL OF SEVEN
          </span>
          <div className="hidden md:flex gap-6 ml-12">
            <a
              className="text-on-surface-variant hover:text-st-primary transition-colors font-headline-sm text-headline-sm"
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
              className="text-on-surface-variant hover:text-st-primary transition-colors font-headline-sm text-headline-sm"
              href="#"
            >
              Mystic Arts
            </a>
            <a
              className="text-on-surface-variant hover:text-st-primary transition-colors font-headline-sm text-headline-sm"
              href="#"
            >
              Labs
            </a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-st-primary hover:bg-white/5 transition-all p-2 rounded-full active:scale-95 duration-200">
            <span
              aria-hidden="true"
              className="material-symbols-outlined"
              data-icon="notifications"
            >
              notifications
            </span>
          </button>
          <button className="text-st-primary hover:bg-white/5 transition-all p-2 rounded-full active:scale-95 duration-200">
            <span aria-hidden="true" className="material-symbols-outlined" data-icon="auto_awesome">
              auto_awesome
            </span>
          </button>
          <button className="text-st-primary hover:bg-white/5 transition-all p-2 rounded-full active:scale-95 duration-200">
            <span
              aria-hidden="true"
              className="material-symbols-outlined"
              data-icon="account_circle"
            >
              account_circle
            </span>
          </button>
        </div>
      </nav>
      {/*  SideNavBar (Hidden on Mobile, Visible on md+)  */}
      <aside className="hidden md:flex fixed left-0 top-16 bottom-0 w-64 z-40 bg-surface-dim/60 backdrop-blur-2xl border-r border-white/10 flex-col py-6 px-4 gap-4">
        {/*  Header Info  */}
        <div className="mb-8 px-3">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">The Grand Magus</h3>
          <p className="font-label-mono text-label-mono text-outline mt-1">Rank: Adept III</p>
        </div>
        {/*  Navigation Tabs  */}
        <div className="flex flex-col gap-2 flex-grow font-label-mono text-label-mono">
          <a
            className="flex items-center gap-3 text-outline hover:text-on-surface p-3 hover:bg-st-primary/10 transition-all duration-300 rounded-lg hover:translate-x-1"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined" data-icon="visibility">
              visibility
            </span>
            Aura Scan
          </a>
          <a
            className="flex items-center gap-3 text-outline hover:text-on-surface p-3 hover:bg-st-primary/10 transition-all duration-300 rounded-lg hover:translate-x-1"
            href="#"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined"
              data-icon="auto_fix_high"
            >
              auto_fix_high
            </span>
            Sigil Forge
          </a>
          <a
            className="flex items-center gap-3 text-outline hover:text-on-surface p-3 hover:bg-st-primary/10 transition-all duration-300 rounded-lg hover:translate-x-1"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined" data-icon="schedule">
              schedule
            </span>
            Chronos
          </a>
          <a
            className="flex items-center gap-3 text-outline hover:text-on-surface p-3 hover:bg-st-primary/10 transition-all duration-300 rounded-lg hover:translate-x-1"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined" data-icon="cyclone">
              cyclone
            </span>
            Vortex
          </a>
          <a
            className="flex items-center gap-3 text-st-secondary font-bold bg-secondary-container/20 rounded-lg p-3 hover:translate-x-1 transition-transform"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined" data-icon="balance">
              balance
            </span>
            Arbiter
          </a>
        </div>
        {/*  CTA & Footer  */}
        <div className="mt-auto flex flex-col gap-4">
          <button className="w-full bg-spirit-violet text-on-primary font-label-mono text-label-mono uppercase py-3 rounded hover:shadow-[0_0_15px_rgba(255,224,131,0.5)] transition-shadow duration-300 tracking-widest">
            TRANSMUTE
          </button>
          <div className="flex flex-col gap-2 font-label-mono text-label-mono mt-4 border-t border-white/10 pt-4">
            <a
              className="flex items-center gap-3 text-outline hover:text-on-surface p-3 hover:bg-st-primary/10 transition-all duration-300 rounded-lg"
              href="#"
            >
              <span aria-hidden="true" className="material-symbols-outlined" data-icon="settings">
                settings
              </span>
              Settings
            </a>
            <a
              className="flex items-center gap-3 text-outline hover:text-on-surface p-3 hover:bg-st-primary/10 transition-all duration-300 rounded-lg"
              href="#"
            >
              <span aria-hidden="true" className="material-symbols-outlined" data-icon="menu_book">
                menu_book
              </span>
              Grimoire
            </a>
          </div>
        </div>
      </aside>
      {/*  Main Canvas  */}
      <main className="pt-24 pb-12 md:pl-72 pr-margin-mobile md:pr-margin-desktop min-h-screen relative z-10">
        <div className="max-w-container-max mx-auto flex flex-col gap-12">
          {/*  Page Header  */}
          <header className="text-center space-y-4 mb-8">
            <h1 className="font-headline-xl text-headline-xl-mobile md:text-headline-xl text-st-secondary gold-glow tracking-tight uppercase">
              Alchemical Synthesis Output
            </h1>
            <p className="font-label-mono text-label-mono text-outline tracking-widest uppercase flex items-center justify-center gap-2">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-st-secondary text-sm"
              >
                emergency
              </span>
              Council Debate Concluded
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-st-secondary text-sm"
              >
                emergency
              </span>
            </p>
          </header>
          {/*  Master Directive Container  */}
          <div className="glass-float rounded-xl p-8 md:p-12 gold-border-glow relative overflow-hidden">
            {/*  Background texture for card  */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-overlay"></div>
            <div className="relative z-10 flex flex-col lg:flex-row gap-12">
              {/*  Left: Analytical Breakdown  */}
              <div className="flex-1 space-y-8">
                <div className="border-b border-st-secondary/30 pb-4 mb-6">
                  <h2 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-st-secondary"
                    >
                      data_object
                    </span>
                    Synthesis Matrix
                  </h2>
                </div>
                {/*  Bento Grid for Agents  */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/*  Mercury  */}
                  <div className="glass-panel p-4 rounded-lg border-l-2 border-resonance-blue relative group hover:bg-white/5 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-label-mono text-label-mono text-resonance-blue uppercase tracking-wider">
                        Mercury : Speed
                      </span>
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-resonance-blue/50 text-sm"
                      >
                        speed
                      </span>
                    </div>
                    <p className="font-label-mono text-[12px] text-outline-variant leading-relaxed">
                      Velocity parameters optimized. Friction coefficients reduced by 14.2% in
                      cognitive pathways.
                    </p>
                    <div className="mt-3 h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
                      <div className="h-full bg-resonance-blue w-[85%] shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                    </div>
                  </div>
                  {/*  Saturn  */}
                  <div className="glass-panel p-4 rounded-lg border-l-2 border-surface-tint relative group hover:bg-white/5 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-label-mono text-label-mono text-surface-tint uppercase tracking-wider">
                        Saturn : Structure
                      </span>
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-surface-tint/50 text-sm"
                      >
                        architecture
                      </span>
                    </div>
                    <p className="font-label-mono text-[12px] text-outline-variant leading-relaxed">
                      Architectural integrity confirmed. Boundary limits strictly enforced
                      preventing conceptual bleed.
                    </p>
                    <div className="mt-3 h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
                      <div className="h-full bg-surface-tint w-[92%] shadow-[0_0_10px_rgba(210,187,255,0.5)]"></div>
                    </div>
                  </div>
                  {/*  Venus  */}
                  <div className="glass-panel p-4 rounded-lg border-l-2 border-tertiary relative group hover:bg-white/5 transition-colors md:col-span-2">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-label-mono text-label-mono text-tertiary uppercase tracking-wider">
                        Venus : Harmony
                      </span>
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-tertiary/50 text-sm"
                      >
                        filter_vintage
                      </span>
                    </div>
                    <p className="font-label-mono text-[12px] text-outline-variant leading-relaxed">
                      Aesthetic and empathetic resonance aligned. The resulting framework possesses
                      an inherent gravity of attraction, ensuring user alignment without dissonance.
                    </p>
                    <div className="mt-3 h-1 w-full bg-surface-container-high rounded-full overflow-hidden flex gap-1">
                      <div className="h-full bg-tertiary w-[30%] shadow-[0_0_10px_rgba(78,222,163,0.5)]"></div>
                      <div className="h-full bg-tertiary w-[40%] shadow-[0_0_10px_rgba(78,222,163,0.5)] opacity-70"></div>
                      <div className="h-full bg-tertiary w-[20%] shadow-[0_0_10px_rgba(78,222,163,0.5)] opacity-40"></div>
                    </div>
                  </div>
                </div>
              </div>
              {/*  Right: Transmuted Wisdom & Monica Constant  */}
              <div className="flex-1 flex flex-col justify-center items-center p-8 bg-obsidian-deep/40 rounded-xl border border-white/5 relative">
                {/*  Ritual Circle background graphic  */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined"
                    style={{ fontSize: '300px' }}
                  >
                    all_inclusive
                  </span>
                </div>
                <div className="text-center z-10 space-y-6 w-full">
                  <div className="inline-block px-4 py-1 rounded-full border border-st-secondary/50 bg-st-secondary/10 font-label-mono text-label-mono text-st-secondary mb-4">
                    Transmuted Wisdom
                  </div>
                  <div className="glass-panel p-6 rounded-lg border border-st-primary/20 shadow-[0_0_30px_rgba(168,85,247,0.15)] w-full">
                    <p className="font-label-mono text-[11px] text-outline tracking-[0.2em] uppercase mb-2">
                      Final Monica Constant (A#)
                    </p>
                    <div className="font-headline-xl text-[64px] leading-none font-bold text-monica-constant monica-pulse mb-4 font-serif">
                      1.61803
                    </div>
                    <p className="font-label-mono text-sm text-primary-fixed-dim border-t border-white/10 pt-4 mt-4">
                      Harmonic convergence achieved. <br />
                      The golden ratio stabilizes the structure.
                    </p>
                  </div>
                  <div className="pt-4">
                    <button className="w-full bg-transparent border border-spirit-violet text-on-surface font-label-mono text-label-mono uppercase py-4 rounded hover:border-st-secondary hover:text-st-secondary hover:shadow-[0_0_20px_rgba(255,224,131,0.3)] transition-all duration-300 tracking-widest flex justify-center items-center gap-2 group">
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined group-hover:rotate-90 transition-transform duration-500"
                      >
                        lock_open
                      </span>
                      Manifest Directive
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/*  Supporting Output Data Layers  */}
          <div className="flex flex-col gap-4 mt-8 max-w-3xl mx-auto w-full">
            <h3 className="font-label-mono text-label-mono text-outline uppercase tracking-widest pl-2 mb-2">
              Consciousness Deposition Layers
            </h3>
            {/*  Stepped Cards representing layers  */}
            <div className="glass-panel p-5 rounded-lg border-l-4 border-surface-tint opacity-50 ml-0 hover:opacity-100 transition-opacity">
              <div className="flex justify-between items-center font-label-mono text-label-mono">
                <span className="text-surface-tint">L1 : Substrate Formulation</span>
                <span className="text-outline-variant">99.9% Purity</span>
              </div>
            </div>
            <div className="glass-panel p-5 rounded-lg border-l-4 border-primary-container opacity-70 ml-4 hover:opacity-100 transition-opacity shadow-lg">
              <div className="flex justify-between items-center font-label-mono text-label-mono">
                <span className="text-primary-container">L2 : Paradigm Anchoring</span>
                <span className="text-outline-variant">Stable</span>
              </div>
            </div>
            <div className="glass-panel p-5 rounded-lg border-l-4 border-spirit-violet ml-8 hover:bg-white/5 transition-all shadow-[0_4px_20px_rgba(168,85,247,0.1)]">
              <div className="flex justify-between items-center font-label-mono text-label-mono">
                <span className="text-spirit-violet font-bold">
                  L3 : Synthesis Execution (Current)
                </span>
                <span className="text-st-secondary animate-pulse">Active</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
