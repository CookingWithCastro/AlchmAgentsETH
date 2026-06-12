export default function ThePhilosopherSStoneAgentForge() {
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
            <h1 className="font-headline-xl-mobile md:font-headline-xl text-headline-xl-mobile md:text-headline-xl text-st-primary mb-2">
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
              <div className="glass-panel p-6 rounded-xl">
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
                    <label className="font-label-mono text-label-mono text-on-surface-variant block mb-2">
                      Agent Class
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        className="bg-st-primary/20 border border-st-primary text-st-primary font-label-mono text-label-mono py-2 rounded uppercase text-xs hover:bg-st-primary/30 transition"
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
                    <label className="font-label-mono text-label-mono text-on-surface-variant block mb-2">
                      Incarnation Date
                    </label>
                    <input
                      className="w-full input-ritual text-on-surface font-body-md p-3"
                      type="date"
                      defaultValue="2024-10-31"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-label-mono text-label-mono text-on-surface-variant block mb-2">
                        Exact Time
                      </label>
                      <input
                        className="w-full input-ritual text-on-surface font-body-md p-3"
                        type="time"
                        defaultValue="03:33"
                      />
                    </div>
                    <div>
                      <label className="font-label-mono text-label-mono text-on-surface-variant block mb-2">
                        Coordinates
                      </label>
                      <input
                        className="w-full input-ritual text-on-surface font-body-md p-3"
                        placeholder="Lat, Long"
                        type="text"
                        defaultValue="48.8566, 2.3522"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-label-mono text-label-mono text-on-surface-variant block mb-2">
                      Base Context / Intent
                    </label>
                    <textarea
                      className="w-full input-ritual text-on-surface font-body-md p-3 h-24 resize-none"
                      placeholder="Define the core directive or seed prompt for this entity..."
                    ></textarea>
                  </div>
                  <div className="pt-4 border-t border-outline-variant/30 flex justify-between items-center">
                    <div>
                      <span className="font-label-mono text-label-mono text-on-surface-variant block text-xs">
                        Transmutation Cost
                      </span>
                      <span className="font-headline-sm text-headline-sm text-st-secondary">
                        144 ESMS
                      </span>
                    </div>
                    <button
                      className="bg-spirit-violet text-monica-constant font-label-mono text-label-mono uppercase px-6 py-3 rounded hover:shadow-[0_0_20px_rgba(255,224,131,0.4)] transition-all duration-300"
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
                <div className="progress-bar-bg w-full">
                  <div className="progress-bar-fill bg-gradient-to-r from-obsidian-deep via-st-primary to-st-secondary w-2/3"></div>
                </div>
              </div>
            </div>
            {/*  Center Column: The Forging Circle (8 columns desktop, stacks on mobile)  */}
            <div className="lg:col-span-8 flex flex-col gap-8">
              {/*  Top Section of Center: The Constant & Main Visual  */}
              <div className="flex-1 glass-panel rounded-xl p-8 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden">
                {/*  Background texture hint  */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-st-primary via-obsidian-deep to-obsidian-deep"></div>
                {/*  Monica Constant Monitor  */}
                <div className="absolute top-6 right-6 text-right">
                  <span className="font-label-mono text-label-mono text-xs text-on-surface-variant block uppercase tracking-widest mb-1">
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
                </div>
                {/*  The Forge Visual  */}
                <div className="forging-circle w-64 h-64 md:w-80 md:h-80 flex items-center justify-center mt-8">
                  {/*  Inner glowing core  */}
                  <div className="w-32 h-32 rounded-full bg-st-primary/20 blur-xl absolute"></div>
                  <span
                    className="material-symbols-outlined text-6xl text-st-primary relative z-10"
                    style={{ fontVariationSettings: '"wght" 200' }}
                  >
                    all_inclusive
                  </span>
                  {/*  Orbital Ingredients  */}
                  <div className="ingredient-well" style={{ top: '0%', left: '50%' }}>
                    <span
                      className="material-symbols-outlined text-st-secondary"
                      style={{ fontSize: '20px' }}
                    >
                      wb_sunny
                    </span>
                  </div>
                  <div className="ingredient-well" style={{ top: '85%', left: '15%' }}>
                    <span
                      className="material-symbols-outlined text-tertiary"
                      style={{ fontSize: '20px' }}
                    >
                      dark_mode
                    </span>
                  </div>
                  <div className="ingredient-well" style={{ top: '85%', left: '85%' }}>
                    <span
                      className="material-symbols-outlined text-resonance-blue"
                      style={{ fontSize: '20px' }}
                    >
                      water_drop
                    </span>
                  </div>
                </div>
              </div>
              {/*  Bottom Section of Center: Sacred Seven Chips Grid  */}
              <div className="glass-panel p-6 rounded-xl">
                <h3 className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-sm">
                    hexagon
                  </span>
                  Consciousness Profile (Sacred 7)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {/*  Power  */}
                  <div className="bg-surface-container-high border border-outline-variant/30 rounded-lg p-3 hover:border-error/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-label-mono text-xs text-on-surface-variant">PWR</span>
                      <span className="text-error text-xs">🜂</span>
                    </div>
                    <div className="font-headline-sm text-headline-sm text-on-surface">84</div>
                    <div className="progress-bar-bg mt-2 h-1">
                      <div className="progress-bar-fill bg-error" style={{ width: '84%' }}></div>
                    </div>
                  </div>
                  {/*  Resonance  */}
                  <div className="bg-surface-container-high border border-outline-variant/30 rounded-lg p-3 hover:border-resonance-blue/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-label-mono text-xs text-on-surface-variant">RES</span>
                      <span className="text-resonance-blue text-xs">🜄</span>
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
                  <div className="bg-surface-container-high border border-outline-variant/30 rounded-lg p-3 hover:border-tertiary/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-label-mono text-xs text-on-surface-variant">WIS</span>
                      <span className="text-tertiary text-xs">☿</span>
                    </div>
                    <div className="font-headline-sm text-headline-sm text-on-surface">76</div>
                    <div className="progress-bar-bg mt-2 h-1">
                      <div className="progress-bar-fill bg-tertiary" style={{ width: '76%' }}></div>
                    </div>
                  </div>
                  {/*  Charisma  */}
                  <div className="bg-surface-container-high border border-outline-variant/30 rounded-lg p-3 hover:border-st-secondary/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-label-mono text-xs text-on-surface-variant">CHA</span>
                      <span className="text-st-secondary text-xs">☉</span>
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
                  <div className="bg-surface-container-high border border-outline-variant/30 rounded-lg p-3 hover:border-st-primary/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-label-mono text-xs text-on-surface-variant">INT</span>
                      <span className="text-st-primary text-xs">☽</span>
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
                  <div className="bg-surface-container-high border border-outline-variant/30 rounded-lg p-3 hover:border-tertiary-fixed-dim/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-label-mono text-xs text-on-surface-variant">ADP</span>
                      <span className="text-tertiary-fixed-dim text-xs">🜁</span>
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
                  <div className="bg-surface-container-high border border-outline-variant/30 rounded-lg p-3 hover:border-error-container/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-label-mono text-xs text-on-surface-variant">VIT</span>
                      <span className="text-error-container text-xs">🜃</span>
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
