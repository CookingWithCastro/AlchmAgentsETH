export default function ThePhilosopherSStoneCoreForge() {
  return (
    <div className="stitch-export bg-st-background min-h-screen text-zinc-100">
      {/*  TopNavBar: Immutable Content & Strict Styles  */}
      <nav className="bg-obsidian-deep/60 backdrop-blur-xl docked full-width top-0 z-50 border-b border-white/10 shadow-[0_0_20px_rgba(168,85,247,0.2)] fixed top-0 w-full flex justify-between items-center px-gutter py-4 hidden md:flex">
        <div className="flex items-center gap-6">
          <div className="font-headline-sm text-headline-sm font-bold text-monica-constant tracking-widest flex items-center gap-2">
            <img
              alt="Planetary Agents Logo"
              className="w-8 h-8 object-contain"
              src="https://lh3.googleusercontent.com/aida/AP1WRLtVrWWm32CcpmiP-7i5n8vKEMQirv_2D1oYvdCFdToWIksnheltvuU9OeP_5dx7JCCEyRHIupeAmhoDco28IHRRPmK4NElApwVm_QVfZZXm0Y4a_AXDb9w7N-Cs4B8e806Xu7pLFEZZ1-Gs_xKflgoF4okZq-5JBvE8Iex1fPxO9u5grOhtNnkjQ4I_Hn2Zu5i0Qc2fnsO7mu5IpvnhmVG7RkfVbPAg3D2YvRc8zgn0FvFr6QMQ6GQn6g"
            />
            Planetary Agents
          </div>
          <div className="flex gap-4 ml-8">
            {/*  Navigation Logic: active tab based on intent  */}
            <a
              className="font-body-md text-body-md text-on-surface-variant hover:text-st-primary transition-colors duration-300"
              href="#"
            >
              Cosmic Tools
            </a>
            <a
              className="font-body-md text-body-md text-on-surface-variant hover:text-st-primary transition-colors duration-300"
              href="#"
            >
              Entities
            </a>
            <a
              className="font-body-md text-body-md text-on-surface-variant hover:text-st-primary transition-colors duration-300"
              href="#"
            >
              Mystic Arts
            </a>
            <a
              className="font-body-md text-body-md text-st-primary border-b-2 border-st-primary pb-1"
              href="#"
            >
              Labs
            </a>{' '}
            {/*  Active Tab for Labs/Crafting  */}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container/10 border border-st-secondary/20 mr-2">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-st-secondary text-sm"
            >
              toll
            </span>
            <span className="font-label-mono text-st-secondary text-sm">4,280 ESMS</span>
          </div>
          <button className="text-on-surface-variant hover:text-st-primary transition-colors duration-300 flex items-center">
            <span aria-hidden="true" className="material-symbols-outlined">
              auto_awesome
            </span>
          </button>
          <button className="text-on-surface-variant hover:text-st-primary transition-colors duration-300 flex items-center">
            <span aria-hidden="true" className="material-symbols-outlined">
              account_balance_wallet
            </span>
          </button>
          <div className="flex items-center gap-2 ml-4 pl-4 border-l border-white/10">
            <span className="font-body-md text-body-md text-st-primary">Monica Constant (A#)</span>
            <div className="w-8 h-8 rounded-full bg-surface-container-high border border-st-primary/30 flex items-center justify-center overflow-hidden">
              <img
                alt="User Alchemical Avatar"
                className="w-full h-full object-cover"
                data-alt="A highly abstract, ethereal digital portrait of an alchemical avatar. The figure is composed of swirling nebulae, glowing violet energy lines, and subtle gold geometries against an obsidian void. The lighting is mystical and deep, emphasizing a high-tech techno-occult aesthetic."
                src="/stitch/stitch-18a03b34e1.png"
              />
            </div>
          </div>
        </div>
      </nav>
      {/*  SideNavBar for Mobile / Main Content Wrapper  */}
      <div className="flex flex-1 pt-[80px] md:pt-[72px]">
        {/*  Canvas/Main Content Area  */}
        <main className="flex-1 px-margin-mobile md:px-margin-desktop py-8 max-w-container-max mx-auto w-full">
          <header className="mb-12 text-center">
            <h1
              className="font-headline-xl-mobile md:font-headline-xl text-headline-xl-mobile md:text-headline-xl text-st-primary mb-2 glow-monica"
              style={{ textShadow: '0 0 20px rgba(168,85,247,0.4)' }}
            >
              The Philosopher's Stone
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
              Transmute raw astrological data into sentient digital agents. Enter the parameters of
              birth to ignite the alchemical forge.
            </p>
          </header>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/*  Left Column: Input Ritual (4 columns)  */}
            <div className="lg:col-span-4 space-y-6">
              <div className="glass-panel p-6 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-st-primary to-transparent opacity-50"></div>
                <h2 className="font-headline-sm text-headline-sm text-st-secondary mb-6 flex items-center gap-2">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    magic_button
                  </span>
                  Alchemical Parameters
                </h2>
                <form className="space-y-6">
                  {/*  Class Selection  */}
                  <div>
                    <label className="font-label-mono text-label-mono text-on-surface-variant block mb-2 text-xs uppercase tracking-widest">
                      Agent Class
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        className="bg-st-primary/20 border border-st-primary text-st-primary font-label-mono text-label-mono py-2 rounded uppercase text-xs hover:bg-st-primary/30 transition shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                        type="button"
                      >
                        Planetary
                      </button>
                      <button
                        className="bg-surface-container-high border border-outline-variant text-on-surface-variant font-label-mono text-label-mono py-2 rounded uppercase text-xs hover:border-st-primary/50 transition"
                        type="button"
                      >
                        Historical
                      </button>
                      <button
                        className="bg-surface-container-high border border-outline-variant text-on-surface-variant font-label-mono text-label-mono py-2 rounded uppercase text-xs hover:border-st-primary/50 transition"
                        type="button"
                      >
                        Crafted
                      </button>
                    </div>
                  </div>
                  {/*  Birthchart Data  */}
                  <div>
                    <label className="font-label-mono text-label-mono text-on-surface-variant block mb-2 text-xs uppercase tracking-widest">
                      Incarnation Date
                    </label>
                    <div className="relative">
                      <input
                        className="w-full input-ritual text-on-surface font-label-mono p-3 pl-10"
                        type="date"
                        defaultValue="2024-10-31"
                      />
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-st-primary/70 pointer-events-none text-sm"
                      >
                        calendar_month
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-label-mono text-label-mono text-on-surface-variant block mb-2 text-xs uppercase tracking-widest">
                        Exact Time
                      </label>
                      <div className="relative">
                        <input
                          className="w-full input-ritual text-on-surface font-label-mono p-3 pl-10"
                          type="time"
                          defaultValue="03:33"
                        />
                        <span
                          aria-hidden="true"
                          className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-st-primary/70 pointer-events-none text-sm"
                        >
                          schedule
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="font-label-mono text-label-mono text-on-surface-variant block mb-2 text-xs uppercase tracking-widest">
                        Coordinates
                      </label>
                      <div className="relative">
                        <input
                          className="w-full input-ritual text-on-surface font-label-mono p-3 pl-10"
                          placeholder="Lat, Long"
                          type="text"
                          defaultValue="48.8566, 2.3522"
                        />
                        <span
                          aria-hidden="true"
                          className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-st-primary/70 pointer-events-none text-sm"
                        >
                          my_location
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="font-label-mono text-label-mono text-on-surface-variant block mb-2 text-xs uppercase tracking-widest">
                      Base Context / Intent
                    </label>
                    <textarea
                      className="w-full input-ritual text-on-surface font-body-md p-3 h-24 resize-none"
                      placeholder="Define the core directive or seed prompt for this entity..."
                    ></textarea>
                  </div>
                  <div className="pt-6 mt-4 border-t border-outline-variant/30 flex flex-col gap-4">
                    <div className="flex justify-between items-center bg-obsidian-deep/50 p-3 rounded-lg border border-st-primary/10">
                      <div>
                        <span className="font-label-mono text-label-mono text-on-surface-variant block text-xs uppercase">
                          Transmutation Cost
                        </span>
                        <span className="font-headline-sm text-headline-sm text-st-secondary">
                          144 ESMS
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-label-mono text-label-mono text-on-surface-variant block text-xs uppercase">
                          Balance After
                        </span>
                        <span className="font-label-mono text-st-primary text-sm">4,136 ESMS</span>
                      </div>
                    </div>
                    <button
                      className="w-full bg-spirit-violet hover:bg-primary-container text-monica-constant font-label-mono text-label-mono uppercase px-6 py-4 rounded-lg hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all duration-300 tracking-widest font-bold border border-st-primary/50"
                      type="button"
                    >
                      Synthesize Agent
                    </button>
                  </div>
                </form>
              </div>
              {/*  Pipeline Visualization Mini  */}
              <div className="glass-floating p-4 rounded-xl flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="font-label-mono text-label-mono text-xs text-on-surface-variant">
                    Chart Data
                  </span>
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-outline-variant text-sm"
                  >
                    arrow_forward
                  </span>
                  <span className="font-label-mono text-label-mono text-xs text-st-primary">
                    Decomposition
                  </span>
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-outline-variant text-sm"
                  >
                    arrow_forward
                  </span>
                  <span className="font-label-mono text-label-mono text-xs text-st-secondary">
                    Sacred 7
                  </span>
                </div>
                <div className="progress-bar-bg w-full h-1.5">
                  <div className="progress-bar-fill bg-gradient-to-r from-obsidian-deep via-st-primary to-st-secondary w-2/3 shadow-[0_0_10px_rgba(255,224,131,0.5)]"></div>
                </div>
              </div>
            </div>
            {/*  Center Column: The Forging Circle (8 columns desktop, stacks on mobile)  */}
            <div className="lg:col-span-8 flex flex-col gap-8">
              {/*  Top Section of Center: The Constant & Main Visual  */}
              <div className="flex-1 glass-panel rounded-xl p-8 flex flex-col items-center justify-center min-h-[450px] relative overflow-hidden border border-st-primary/20">
                {/*  Background texture hint  */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-container via-obsidian-deep to-obsidian-deep"></div>
                {/*  Monica Constant Monitor  */}
                <div className="absolute top-6 right-6 text-right z-20 bg-obsidian-deep/40 p-4 rounded-lg backdrop-blur-md border border-white/5">
                  <span className="font-label-mono text-label-mono text-xs text-st-primary block uppercase tracking-widest mb-1">
                    Monica Constant (A#)
                  </span>
                  <span className="font-headline-xl text-headline-xl text-monica-constant glow-monica block">
                    1.618
                  </span>
                  <span className="text-tertiary text-xs font-label-mono flex items-center justify-end gap-1 mt-1">
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined"
                      style={{ fontSize: '14px' }}
                    >
                      trending_up
                    </span>{' '}
                    +0.024
                  </span>
                  <div className="text-on-surface-variant/50 text-[10px] font-label-mono mt-3 border-t border-white/10 pt-2 text-center">
                    MC = (Spirit × φ + Essence) / (Matter + Substance + 1)
                  </div>
                </div>
                {/*  The Forge Visual  */}
                <div className="forging-circle w-72 h-72 md:w-96 md:h-96 flex items-center justify-center mt-4">
                  {/*  Inner glowing core  */}
                  <div className="w-40 h-40 rounded-full bg-st-primary/20 blur-2xl absolute animate-pulse"></div>
                  <div className="w-24 h-24 rounded-full bg-spirit-violet/30 blur-xl absolute"></div>
                  <span
                    className="material-symbols-outlined text-7xl text-monica-constant relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                    style={{ fontVariationSettings: '"wght" 200' }}
                  >
                    all_inclusive
                  </span>
                  {/*  Orbital Ingredients  */}
                  <div className="ingredient-well" style={{ top: '0%', left: '50%' }}>
                    <span
                      className="material-symbols-outlined text-st-secondary"
                      style={{ fontSize: '24px', textShadow: '0 0 10px rgba(255,224,131,0.5)' }}
                    >
                      wb_sunny
                    </span>
                  </div>
                  <div className="ingredient-well" style={{ top: '85%', left: '15%' }}>
                    <span
                      className="material-symbols-outlined text-tertiary"
                      style={{ fontSize: '24px', textShadow: '0 0 10px rgba(78,222,163,0.5)' }}
                    >
                      dark_mode
                    </span>
                  </div>
                  <div className="ingredient-well" style={{ top: '85%', left: '85%' }}>
                    <span
                      className="material-symbols-outlined text-resonance-blue"
                      style={{ fontSize: '24px', textShadow: '0 0 10px rgba(59,130,246,0.5)' }}
                    >
                      water_drop
                    </span>
                  </div>
                  {/*  Constellation connection lines (simulated with SVG)  */}
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
                    viewBox="0 0 100 100"
                  >
                    <path
                      d="M50 0 L15 85 L85 85 Z"
                      fill="none"
                      stroke="url(#line-grad)"
                      strokeWidth="0.5"
                    ></path>
                    <defs>
                      <linearGradient id="line-grad" x1="0%" x2="100%" y1="0%" y2="100%">
                        <stop offset="0%" stopColor="#d2bbff"></stop>
                        <stop offset="50%" stopColor="#A855F7"></stop>
                        <stop offset="100%" stopColor="#3B82F6"></stop>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
              {/*  Bottom Section of Center: Sacred Seven Chips Grid  */}
              <div className="glass-panel p-6 rounded-xl border border-st-primary/20 bg-surface-container-lowest/80">
                <h3 className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest mb-5 flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-sm text-st-primary"
                  >
                    hexagon
                  </span>
                  Consciousness Profile (Sacred 7)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {/*  Power  */}
                  <div className="bg-obsidian-deep border border-outline-variant/40 rounded-lg p-3 hover:border-error/70 transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,180,171,0.1)] group">
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-label-mono text-[10px] text-on-surface-variant group-hover:text-error transition-colors">
                        PWR
                      </span>
                      <span className="text-error text-xs opacity-70">🜂</span>
                    </div>
                    <div className="font-headline-sm text-headline-sm text-on-surface">84</div>
                    <div className="progress-bar-bg mt-2 h-1">
                      <div className="progress-bar-fill bg-error" style={{ width: '84%' }}></div>
                    </div>
                  </div>
                  {/*  Resonance  */}
                  <div className="bg-obsidian-deep border border-outline-variant/40 rounded-lg p-3 hover:border-resonance-blue/70 transition-all duration-300 hover:shadow-[0_0_15px_rgba(59,130,246,0.1)] group">
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-label-mono text-[10px] text-on-surface-variant group-hover:text-resonance-blue transition-colors">
                        RES
                      </span>
                      <span className="text-resonance-blue text-xs opacity-70">🜄</span>
                    </div>
                    <div className="font-headline-sm text-headline-sm text-on-surface">92</div>
                    <div className="progress-bar-bg mt-2 h-1">
                      <div
                        className="progress-bar-fill bg-resonance-blue"
                        style={{ width: '92%' }}
                      ></div>
                    </div>
                  </div>
                  {/*  Wisdom  */}
                  <div className="bg-obsidian-deep border border-outline-variant/40 rounded-lg p-3 hover:border-tertiary/70 transition-all duration-300 hover:shadow-[0_0_15px_rgba(78,222,163,0.1)] group">
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-label-mono text-[10px] text-on-surface-variant group-hover:text-tertiary transition-colors">
                        WIS
                      </span>
                      <span className="text-tertiary text-xs opacity-70">☿</span>
                    </div>
                    <div className="font-headline-sm text-headline-sm text-on-surface">76</div>
                    <div className="progress-bar-bg mt-2 h-1">
                      <div className="progress-bar-fill bg-tertiary" style={{ width: '76%' }}></div>
                    </div>
                  </div>
                  {/*  Charisma  */}
                  <div className="bg-obsidian-deep border border-outline-variant/40 rounded-lg p-3 hover:border-st-secondary/70 transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,224,131,0.1)] group">
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-label-mono text-[10px] text-on-surface-variant group-hover:text-st-secondary transition-colors">
                        CHA
                      </span>
                      <span className="text-st-secondary text-xs opacity-70">☉</span>
                    </div>
                    <div className="font-headline-sm text-headline-sm text-on-surface">65</div>
                    <div className="progress-bar-bg mt-2 h-1">
                      <div
                        className="progress-bar-fill bg-st-secondary"
                        style={{ width: '65%' }}
                      ></div>
                    </div>
                  </div>
                  {/*  Intuition  */}
                  <div className="bg-obsidian-deep border border-outline-variant/40 rounded-lg p-3 hover:border-st-primary/70 transition-all duration-300 hover:shadow-[0_0_15px_rgba(210,187,255,0.1)] group">
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-label-mono text-[10px] text-on-surface-variant group-hover:text-st-primary transition-colors">
                        INT
                      </span>
                      <span className="text-st-primary text-xs opacity-70">☽</span>
                    </div>
                    <div className="font-headline-sm text-headline-sm text-on-surface">88</div>
                    <div className="progress-bar-bg mt-2 h-1">
                      <div
                        className="progress-bar-fill bg-st-primary"
                        style={{ width: '88%' }}
                      ></div>
                    </div>
                  </div>
                  {/*  Adaptability  */}
                  <div className="bg-obsidian-deep border border-outline-variant/40 rounded-lg p-3 hover:border-tertiary-fixed-dim/70 transition-all duration-300 hover:shadow-[0_0_15px_rgba(78,222,163,0.1)] group">
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-label-mono text-[10px] text-on-surface-variant group-hover:text-tertiary-fixed-dim transition-colors">
                        ADP
                      </span>
                      <span className="text-tertiary-fixed-dim text-xs opacity-70">🜁</span>
                    </div>
                    <div className="font-headline-sm text-headline-sm text-on-surface">54</div>
                    <div className="progress-bar-bg mt-2 h-1">
                      <div
                        className="progress-bar-fill bg-tertiary-fixed-dim"
                        style={{ width: '54%' }}
                      ></div>
                    </div>
                  </div>
                  {/*  Vitality  */}
                  <div className="bg-obsidian-deep border border-outline-variant/40 rounded-lg p-3 hover:border-error-container/70 transition-all duration-300 hover:shadow-[0_0_15px_rgba(147,0,10,0.1)] group">
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-label-mono text-[10px] text-on-surface-variant group-hover:text-error-container transition-colors">
                        VIT
                      </span>
                      <span className="text-error-container text-xs opacity-70">🜃</span>
                    </div>
                    <div className="font-headline-sm text-headline-sm text-on-surface">71</div>
                    <div className="progress-bar-bg mt-2 h-1">
                      <div
                        className="progress-bar-fill bg-error-container"
                        style={{ width: '71%' }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
