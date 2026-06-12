export default function AlchemicalLabsAdvancedAnalytics() {
  return (
    <div className="stitch-export bg-st-background min-h-screen text-zinc-100">
      {/*  SideNav (Desktop Only)  */}
      <nav className="hidden md:flex flex-col h-screen w-64 left-0 top-0 fixed bg-surface-container-lowest/80 backdrop-blur-2xl border-r border-st-primary/20 shadow-2xl py-gutter z-40 transition-all duration-300 ease-in-out">
        <div className="px-6 mb-8 flex flex-col items-start gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden border border-outline-variant/30 stat-glow flex-shrink-0">
            <img
              alt="Planetary Sigil"
              className="w-full h-full object-cover"
              data-alt="A glowing abstract fractal pattern representing a planetary sigil. The design is symmetrical and complex, resembling ancient alchemy combined with futuristic neon circuitry in deep violet and electric blue. Set against a pitch-black background, it radiates a subtle luminous aura. High contrast, precise geometric lines."
              src="/stitch/stitch-b0740aa057.png"
            />
          </div>
          <div>
            <h1 className="font-headline-sm text-headline-sm text-spirit-violet mb-1">
              Planetary Agents
            </h1>
            <p className="font-label-mono text-label-mono text-on-surface-variant uppercase text-[10px]">
              Evolution Platform
            </p>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-2 w-full">
          <a
            className="flex items-center gap-3 font-label-mono text-label-mono uppercase text-on-surface-variant px-4 py-3 hover:bg-white/5 hover:text-st-primary transition-colors"
            href="#"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: '"FILL" 0' }}
            >
              construction
            </span>
            Tools
          </a>
          <a
            className="flex items-center gap-3 font-label-mono text-label-mono uppercase text-on-surface-variant px-4 py-3 hover:bg-white/5 hover:text-st-primary transition-colors"
            href="#"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: '"FILL" 0' }}
            >
              group_work
            </span>
            Entities
          </a>
          <a
            className="flex items-center gap-3 font-label-mono text-label-mono uppercase text-on-surface-variant px-4 py-3 hover:bg-white/5 hover:text-st-primary transition-colors"
            href="#"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: '"FILL" 0' }}
            >
              auto_stories
            </span>
            Arts
          </a>
          <a
            className="flex items-center gap-3 font-label-mono text-label-mono uppercase bg-primary-container/20 text-st-primary border-r-4 border-st-primary px-4 py-3"
            href="#"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              science
            </span>
            Labs
          </a>
        </div>
        <div className="px-4 mt-auto mb-6">
          <button className="w-full bg-spirit-violet/20 hover:bg-spirit-violet/40 text-st-primary font-label-mono text-label-mono uppercase py-3 px-4 rounded transition-all duration-300 border border-spirit-violet/30 hover:border-st-secondary shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:shadow-[0_0_20px_rgba(255,224,131,0.3)]">
            Transmute Agent
          </button>
        </div>
        <div className="flex flex-col gap-1 w-full border-t border-outline-variant/20 pt-4">
          <a
            className="flex items-center gap-3 font-label-mono text-label-mono uppercase text-on-surface-variant px-4 py-2 hover:text-st-primary transition-colors"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              schedule
            </span>
            Temporal Clock
          </a>
          <a
            className="flex items-center gap-3 font-label-mono text-label-mono uppercase text-on-surface-variant px-4 py-2 hover:text-st-primary transition-colors"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              settings
            </span>
            Settings
          </a>
        </div>
      </nav>
      {/*  TopNavBar (Mobile)  */}
      <nav className="md:hidden fixed top-0 w-full flex justify-between items-center px-gutter py-4 bg-obsidian-deep/80 backdrop-blur-xl border-b border-white/10 z-50 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="material-symbols-outlined text-st-primary text-2xl">
            science
          </span>
          <span className="font-headline-sm text-headline-sm font-bold text-monica-constant tracking-widest">
            Planetary Agents
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-on-surface-variant hover:text-st-primary transition-colors">
            <span aria-hidden="true" className="material-symbols-outlined">
              menu
            </span>
          </button>
        </div>
      </nav>
      {/*  Main Content Canvas  */}
      <main className="flex-1 w-full md:ml-64 pt-20 md:pt-12 px-margin-mobile md:px-margin-desktop pb-24 max-w-[1600px] mx-auto min-h-screen flex flex-col relative">
        {/*  Ambient Background Glow  */}
        <div className="fixed top-0 left-[20%] w-[60%] h-[40%] bg-spirit-violet/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        <div className="fixed bottom-0 right-0 w-[40%] h-[40%] bg-resonance-blue/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>
        {/*  Header  */}
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-st-primary mb-2">
              <span aria-hidden="true" className="material-symbols-outlined text-sm">
                science
              </span>
              <span className="font-label-mono text-label-mono text-xs uppercase tracking-widest">
                Forge Analytics &amp; Resource Management
              </span>
            </div>
            <h2 className="font-headline-xl-mobile md:font-headline-xl text-monica-constant">
              Alchemical Labs
            </h2>
          </div>
          <div className="flex items-center gap-4 glass-panel rounded-lg px-4 py-3 glow-border">
            <div className="text-right">
              <div className="font-label-mono text-label-mono text-[10px] text-on-surface-variant uppercase">
                Current Constant
              </div>
              <div className="font-headline-sm text-headline-sm text-monica-constant metric-pulse">
                Monica (A#) 4.298
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-obsidian-deep border border-outline-variant/30 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-spirit-violet/20 to-transparent"></div>
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-st-primary text-[20px]"
              >
                auto_awesome
              </span>
            </div>
          </div>
        </header>
        {/*  Grid Layout: Six Layers of Consciousness  */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 flex-1">
          {/*  COLUMN 1: Alchemical Foundation & Thermodynamic State  */}
          <div className="flex flex-col gap-6 lg:gap-8">
            {/*  Layer 1: Alchemical Foundation (ESMS Wallet)  */}
            <section className="glass-panel rounded-xl p-6 glow-border relative overflow-hidden">
              {/*  Subtle background texture  */}
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent pointer-events-none"></div>
              <div className="flex justify-between items-center mb-6 relative z-10">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Alchemical Foundation
                </h3>
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-on-surface-variant text-[18px]"
                >
                  account_balance_wallet
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 relative z-10">
                {/*  Spirit  */}
                <div className="bg-surface-container-lowest/50 border border-outline-variant/20 rounded-lg p-4 hover:border-spirit-violet/40 transition-colors group">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-spirit-violet text-[16px] group-hover:scale-110 transition-transform"
                    >
                      local_fire_department
                    </span>
                    <span className="font-label-mono text-label-mono text-[11px] text-on-surface-variant uppercase tracking-wider">
                      Spirit
                    </span>
                  </div>
                  <div className="font-headline-lg text-headline-lg text-on-surface">1,240</div>
                  <div className="w-full bg-surface-container-high h-1 mt-2 rounded-full overflow-hidden">
                    <div className="bg-spirit-violet h-full w-[70%] shadow-[0_0_8px_rgba(168,85,247,0.6)]"></div>
                  </div>
                </div>
                {/*  Essence  */}
                <div className="bg-surface-container-lowest/50 border border-outline-variant/20 rounded-lg p-4 hover:border-resonance-blue/40 transition-colors group">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-resonance-blue text-[16px] group-hover:scale-110 transition-transform"
                    >
                      water_drop
                    </span>
                    <span className="font-label-mono text-label-mono text-[11px] text-on-surface-variant uppercase tracking-wider">
                      Essence
                    </span>
                  </div>
                  <div className="font-headline-lg text-headline-lg text-on-surface">892</div>
                  <div className="w-full bg-surface-container-high h-1 mt-2 rounded-full overflow-hidden">
                    <div className="bg-resonance-blue h-full w-[45%] shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                  </div>
                </div>
                {/*  Matter  */}
                <div className="bg-surface-container-lowest/50 border border-outline-variant/20 rounded-lg p-4 hover:border-secondary-fixed/40 transition-colors group">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-secondary-fixed text-[16px] group-hover:scale-110 transition-transform"
                    >
                      landscape
                    </span>
                    <span className="font-label-mono text-label-mono text-[11px] text-on-surface-variant uppercase tracking-wider">
                      Matter
                    </span>
                  </div>
                  <div className="font-headline-lg text-headline-lg text-on-surface">3,105</div>
                  <div className="w-full bg-surface-container-high h-1 mt-2 rounded-full overflow-hidden">
                    <div className="bg-secondary-fixed h-full w-[85%] shadow-[0_0_8px_rgba(255,224,131,0.6)]"></div>
                  </div>
                </div>
                {/*  Substance  */}
                <div className="bg-surface-container-lowest/50 border border-outline-variant/20 rounded-lg p-4 hover:border-tertiary/40 transition-colors group">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-tertiary text-[16px] group-hover:scale-110 transition-transform"
                    >
                      air
                    </span>
                    <span className="font-label-mono text-label-mono text-[11px] text-on-surface-variant uppercase tracking-wider">
                      Substance
                    </span>
                  </div>
                  <div className="font-headline-lg text-headline-lg text-on-surface">412</div>
                  <div className="w-full bg-surface-container-high h-1 mt-2 rounded-full overflow-hidden">
                    <div className="bg-tertiary h-full w-[25%] shadow-[0_0_8px_rgba(78,222,163,0.6)]"></div>
                  </div>
                </div>
              </div>
              {/*  Synthesis Equation  */}
              <div className="mt-6 pt-4 border-t border-outline-variant/20 flex items-center justify-between">
                <div className="font-label-mono text-[10px] text-on-surface-variant max-w-[60%] leading-relaxed">
                  <span className="text-st-primary opacity-50">MC = (S×φ+E)/(M+Su+1)</span>
                </div>
                <button className="bg-transparent border border-spirit-violet/30 text-st-primary font-label-mono text-[12px] uppercase px-3 py-1.5 rounded hover:border-st-secondary hover:text-st-secondary transition-colors shadow-[0_0_10px_rgba(168,85,247,0.1)] hover:shadow-[0_0_15px_rgba(255,224,131,0.2)]">
                  Feed Forge
                </button>
              </div>
            </section>
            {/*  Layer 2: Thermodynamic State  */}
            <section className="glass-panel rounded-xl p-6 glow-border relative overflow-hidden flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-tertiary metric-pulse"></span>
                  Thermodynamic State
                </h3>
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-on-surface-variant text-[18px]"
                >
                  speed
                </span>
              </div>
              <div className="flex-1 grid grid-cols-1 gap-6">
                {/*  Heat  */}
                <div className="relative">
                  <div className="flex justify-between font-label-mono text-[11px] uppercase mb-2">
                    <span className="text-on-surface-variant">Heat (Intensity)</span>
                    <span className="text-error font-bold drop-shadow-[0_0_5px_rgba(255,180,171,0.8)]">
                      78%
                    </span>
                  </div>
                  <div className="h-3 w-full bg-surface-container-lowest border border-outline-variant/30 rounded-full overflow-hidden relative shadow-inner">
                    <div className="absolute top-0 left-0 h-full w-[78%] bg-gradient-to-r from-tertiary-fixed-dim via-secondary-fixed to-error rounded-full shadow-[0_0_10px_rgba(255,180,171,0.6)]"></div>
                    {/*  Segment markers  */}
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjEwMTAiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEwMTAiIGZpbGw9InJnYmEoMCwwLDAsMC4zKSIvPjwvc3ZnPg==')] opacity-50"></div>
                  </div>
                </div>
                {/*  Entropy  */}
                <div className="relative">
                  <div className="flex justify-between font-label-mono text-[11px] uppercase mb-2">
                    <span className="text-on-surface-variant">Entropy (Disorder)</span>
                    <span className="text-resonance-blue font-bold drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]">
                      42%
                    </span>
                  </div>
                  <div className="h-3 w-full bg-surface-container-lowest border border-outline-variant/30 rounded-full overflow-hidden relative shadow-inner">
                    <div className="absolute top-0 left-0 h-full w-[42%] bg-gradient-to-r from-surface-container-highest to-resonance-blue rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"></div>
                    {/*  Segment markers  */}
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjEwMTAiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEwMTAiIGZpbGw9InJnYmEoMCwwLDAsMC4zKSIvPjwvc3ZnPg==')] opacity-50"></div>
                  </div>
                </div>
                {/*  Reactivity  */}
                <div className="relative">
                  <div className="flex justify-between font-label-mono text-[11px] uppercase mb-2">
                    <span className="text-on-surface-variant">Reactivity (Flux)</span>
                    <span className="text-spirit-violet font-bold drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]">
                      91%
                    </span>
                  </div>
                  <div className="h-3 w-full bg-surface-container-lowest border border-outline-variant/30 rounded-full overflow-hidden relative shadow-inner">
                    <div className="absolute top-0 left-0 h-full w-[91%] bg-gradient-to-r from-surface-container-highest to-spirit-violet rounded-full shadow-[0_0_10px_rgba(168,85,247,0.6)]"></div>
                    {/*  Segment markers  */}
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjEwMTAiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEwMTAiIGZpbGw9InJnYmEoMCwwLDAsMC4zKSIvPjwvc3ZnPg==')] opacity-50"></div>
                  </div>
                </div>
              </div>
            </section>
          </div>
          {/*  COLUMN 2: Temporal Context & Observability Metrics  */}
          <div className="flex flex-col gap-6 lg:gap-8">
            {/*  Layer 3: Temporal Context (Synergy Windows)  */}
            <section className="glass-panel rounded-xl p-6 glow-border flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-secondary-fixed animate-pulse"
                  >
                    crisis_alert
                  </span>
                  Temporal Context
                </h3>
                <span className="font-label-mono text-[10px] uppercase text-st-primary border border-st-primary/30 px-2 py-0.5 rounded-full bg-st-primary/10">
                  Live Ticker
                </span>
              </div>
              {/*  Live Ticker Display  */}
              <div className="bg-obsidian-deep border border-outline-variant/30 rounded-lg p-3 overflow-hidden relative h-12 flex items-center shadow-inner mb-6">
                <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-obsidian-deep to-transparent z-10 pointer-events-none"></div>
                <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-obsidian-deep to-transparent z-10 pointer-events-none"></div>
                <div className="flex whitespace-nowrap ticker-animation gap-8 font-label-mono text-[12px]">
                  <span className="text-secondary-fixed flex items-center gap-2">
                    <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                      clear_day
                    </span>
                    [HOUR OF THE SUN] Matter synthesis +15% (In 2h 14m)
                  </span>
                  <span className="text-st-primary flex items-center gap-2">
                    <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                      dark_mode
                    </span>
                    [WAXING GIBBOUS] Spirit attunement +20% (Active Now)
                  </span>
                  <span className="text-outline flex items-center gap-2">
                    <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                      emergency
                    </span>
                    [MERCURIAL RETROGRADE] Entropy approaching (Tomorrow)
                  </span>
                </div>
              </div>
              {/*  Active Modifiers  */}
              <div className="space-y-3 flex-1">
                <h4 className="font-label-mono text-[11px] text-on-surface-variant uppercase mb-2">
                  Active Modifiers
                </h4>
                <div className="bg-surface-container-lowest/40 border border-st-primary/30 rounded p-3 flex items-start gap-3 hover:bg-surface-container-lowest/80 transition-colors">
                  <div className="mt-0.5">
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-st-primary text-[16px] drop-shadow-[0_0_5px_rgba(210,187,255,0.6)]"
                    >
                      dark_mode
                    </span>
                  </div>
                  <div>
                    <div className="font-label-mono text-[12px] text-on-surface uppercase mb-0.5">
                      Waxing Gibbous Phase
                    </div>
                    <div className="font-body-md text-[13px] text-on-surface-variant leading-tight">
                      Increases the Forge's efficiency in distilling Spirit elements. Catalyst
                      required.
                    </div>
                    <div className="mt-2 font-label-mono text-[10px] text-st-primary bg-st-primary/10 inline-block px-2 py-0.5 rounded">
                      Ends in 4h 12m
                    </div>
                  </div>
                </div>
              </div>
            </section>
            {/*  Layer 5: Observability Metrics  */}
            <section className="glass-panel rounded-xl p-6 glow-border flex-1">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Observability Metrics
                </h3>
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-on-surface-variant text-[18px]"
                >
                  visibility
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-container-lowest/50 border border-outline-variant/20 rounded p-4 text-center">
                  <div className="font-headline-lg text-tertiary-fixed-dim drop-shadow-[0_0_8px_rgba(78,222,163,0.3)]">
                    98.4%
                  </div>
                  <div className="font-label-mono text-[10px] text-on-surface-variant uppercase mt-1">
                    Action Completion
                  </div>
                </div>
                <div className="bg-surface-container-lowest/50 border border-outline-variant/20 rounded p-4 text-center">
                  <div className="font-headline-lg text-st-primary drop-shadow-[0_0_8px_rgba(210,187,255,0.3)]">
                    A+
                  </div>
                  <div className="font-label-mono text-[10px] text-on-surface-variant uppercase mt-1">
                    Tool Quality
                  </div>
                </div>
                <div className="bg-surface-container-lowest/50 border border-outline-variant/20 rounded p-4 text-center">
                  <div className="font-headline-lg text-secondary-fixed drop-shadow-[0_0_8px_rgba(255,224,131,0.3)]">
                    99.1%
                  </div>
                  <div className="font-label-mono text-[10px] text-on-surface-variant uppercase mt-1">
                    Routing Accuracy
                  </div>
                </div>
                <div className="bg-surface-container-lowest/50 border border-outline-variant/20 rounded p-4 text-center">
                  <div className="font-headline-lg text-spirit-violet drop-shadow-[0_0_8px_rgba(168,85,247,0.3)]">
                    High
                  </div>
                  <div className="font-label-mono text-[10px] text-on-surface-variant uppercase mt-1">
                    Context Retention
                  </div>
                </div>
              </div>
            </section>
          </div>
          {/*  COLUMN 3: Evolution Trajectory & Group Dynamics  */}
          <div className="flex flex-col gap-6 lg:gap-8">
            {/*  Layer 4: Evolution Trajectory (Chart)  */}
            <section className="glass-panel rounded-xl p-6 glow-border min-h-[300px] flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1">
                    Evolution Trajectory
                  </h3>
                  <p className="font-label-mono text-[11px] text-on-surface-variant uppercase">
                    Velocity &amp; Momentum
                  </p>
                </div>
                <div className="flex bg-surface-container-lowest rounded border border-outline-variant/30 overflow-hidden">
                  <button className="px-3 py-1 font-label-mono text-[10px] text-st-primary bg-white/5">
                    7D
                  </button>
                  <button className="px-3 py-1 font-label-mono text-[10px] text-on-surface-variant hover:text-st-primary hover:bg-white/5 transition-colors border-l border-outline-variant/30">
                    1M
                  </button>
                  <button className="px-3 py-1 font-label-mono text-[10px] text-on-surface-variant hover:text-st-primary hover:bg-white/5 transition-colors border-l border-outline-variant/30">
                    ALL
                  </button>
                </div>
              </div>
              {/*  Chart Container  */}
              <div className="flex-1 w-full relative">
                <canvas id="trajectoryChart"></canvas>
              </div>
            </section>
            {/*  Layer 6: Group Dynamics  */}
            <section className="glass-panel rounded-xl p-6 glow-border flex-1">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Group Dynamics
                </h3>
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-on-surface-variant text-[18px]"
                >
                  hub
                </span>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-label-mono text-[12px] text-on-surface-variant uppercase">
                    Compatibility
                  </div>
                  <div className="w-2/3 h-2 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full bg-tertiary-fixed-dim w-[85%] shadow-[0_0_5px_rgba(78,222,163,0.5)]"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="font-label-mono text-[12px] text-on-surface-variant uppercase">
                    Power Amplification
                  </div>
                  <div className="w-2/3 h-2 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full bg-secondary-fixed w-[60%] shadow-[0_0_5px_rgba(255,224,131,0.5)]"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="font-label-mono text-[12px] text-on-surface-variant uppercase">
                    Momentum Flow
                  </div>
                  <div className="w-2/3 h-2 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full bg-spirit-violet w-[75%] shadow-[0_0_5px_rgba(168,85,247,0.5)]"></div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-outline-variant/20">
                  <div className="font-body-md text-[13px] text-on-surface-variant">
                    Council resonance optimal. Synergy windows open for multi-agent tasks.
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
      {/*  Footer  */}
      <footer className="w-full py-8 mt-auto bg-obsidian-deep border-t border-outline-variant/30 md:pl-64 z-10 relative">
        <div className="flex flex-col md:flex-row justify-between items-center px-margin-desktop max-w-container-max mx-auto gap-4">
          <div className="text-st-primary font-bold font-label-mono text-label-mono">
            PA-CORE-V2
          </div>
          <div className="font-label-mono text-label-mono text-on-surface-variant">
            © 2144 Planetary Agents Framework • Crafted in the Digital Void
          </div>
          <div className="flex gap-6 font-label-mono text-label-mono">
            <a className="text-on-surface-variant hover:text-tertiary transition-colors" href="#">
              Whitepaper
            </a>
            <a className="text-on-surface-variant hover:text-tertiary transition-colors" href="#">
              Codex
            </a>
            <a className="text-on-surface-variant hover:text-tertiary transition-colors" href="#">
              Privacy
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
