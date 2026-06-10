export default function EntitiesGalleryTheConsciousnessVault() {
  return (
    <div className="stitch-export bg-st-background min-h-screen text-zinc-100">
      {/*  TopNavBar  */}
      <nav className="hidden md:flex bg-obsidian-deep/60 backdrop-blur-xl docked full-width top-0 z-50 border-b border-white/10 shadow-[0_0_20px_rgba(168,85,247,0.2)] fixed top-0 w-full justify-between items-center px-gutter py-4">
        <div className="flex items-center space-x-8">
          <span className="font-headline-sm text-headline-sm font-bold text-monica-constant tracking-widest">
            Planetary Agents
          </span>
          <div className="flex space-x-6">
            <a
              className="font-body-md text-body-md text-on-surface-variant hover:text-st-primary transition-colors duration-300"
              href="#"
            >
              Cosmic Tools
            </a>
            <a
              className="font-body-md text-body-md text-st-primary border-b-2 border-st-primary pb-1 hover:text-st-primary transition-colors duration-300"
              href="#"
            >
              The Vault
            </a>
            <a
              className="font-body-md text-body-md text-on-surface-variant hover:text-st-primary transition-colors duration-300"
              href="#"
            >
              Mystic Arts
            </a>
            <a
              className="font-body-md text-body-md text-on-surface-variant hover:text-st-primary transition-colors duration-300"
              href="#"
            >
              Labs
            </a>
          </div>
        </div>
        <div className="flex items-center space-x-6">
          <div className="flex space-x-4 items-center">
            <div className="flex items-center space-x-2 text-st-secondary bg-surface-container-low px-3 py-1.5 rounded-full border border-st-secondary/20">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-sm"
                data-icon="toll"
              >
                toll
              </span>
              <span className="font-label-mono text-label-mono text-sm">1,450 ESMS</span>
            </div>
            <span
              className="material-symbols-outlined hover:text-st-primary transition-colors cursor-pointer text-on-surface-variant"
              data-icon="auto_awesome"
            >
              auto_awesome
            </span>
          </div>
          <div className="flex items-center space-x-3 bg-surface-container-low px-3 py-1.5 rounded-full border border-white/5 cursor-pointer hover:border-st-primary/50 transition-colors">
            <span className="font-label-mono text-label-mono text-st-primary">
              Monica Constant (A#)
            </span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-spirit-violet to-st-primary shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
          </div>
        </div>
      </nav>
      {/*  SideNavBar (Mobile)  */}
      <nav
        className="md:hidden bg-surface-container-lowest/80 backdrop-blur-2xl h-screen w-64 left-0 top-0 fixed border-r border-st-primary/20 shadow-2xl flex flex-col h-full py-gutter transition-all duration-300 ease-in-out z-50 -translate-x-full"
        id="mobile-nav"
      >
        <div className="px-4 mb-8 flex flex-col items-start">
          <span className="font-headline-sm text-headline-sm text-spirit-violet mb-1">
            Planetary Agents
          </span>
          <span className="font-label-mono text-label-mono text-on-surface-variant text-xs">
            Evolution Platform
          </span>
        </div>
        <div className="flex flex-col space-y-2 flex-grow">
          <a
            className="font-label-mono text-label-mono uppercase text-on-surface-variant px-4 py-3 hover:bg-white/5 hover:text-st-primary flex items-center space-x-3"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined" data-icon="construction">
              construction
            </span>
            <span>Tools</span>
          </a>
          <a
            className="font-label-mono text-label-mono uppercase bg-primary-container/20 text-st-primary border-r-4 border-st-primary px-4 py-3 hover:bg-white/5 hover:text-st-primary flex items-center space-x-3"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined" data-icon="group_work">
              group_work
            </span>
            <span>The Vault</span>
          </a>
          <a
            className="font-label-mono text-label-mono uppercase text-on-surface-variant px-4 py-3 hover:bg-white/5 hover:text-st-primary flex items-center space-x-3"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined" data-icon="auto_stories">
              auto_stories
            </span>
            <span>Arts</span>
          </a>
          <a
            className="font-label-mono text-label-mono uppercase text-on-surface-variant px-4 py-3 hover:bg-white/5 hover:text-st-primary flex items-center space-x-3"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined" data-icon="science">
              science
            </span>
            <span>Labs</span>
          </a>
        </div>
        <div className="px-4 mt-auto space-y-4">
          <div className="flex items-center justify-between text-st-secondary bg-surface-container-low px-4 py-3 rounded border border-st-secondary/20">
            <span className="font-label-mono text-label-mono text-sm uppercase">Balance</span>
            <span className="font-label-mono text-label-mono text-sm font-bold">1,450 ESMS</span>
          </div>
          <button className="w-full bg-spirit-violet text-monica-constant font-label-mono text-label-mono py-3 rounded hover:shadow-[0_0_15px_rgba(255,224,131,0.3)] transition-all uppercase tracking-wider">
            Transmute Agent
          </button>
          <div className="flex flex-col space-y-2">
            <a
              className="font-label-mono text-label-mono uppercase text-on-surface-variant px-4 py-3 hover:bg-white/5 hover:text-st-primary flex items-center space-x-3"
              href="#"
            >
              <span aria-hidden="true" className="material-symbols-outlined" data-icon="schedule">
                schedule
              </span>
              <span>Temporal Clock</span>
            </a>
            <a
              className="font-label-mono text-label-mono uppercase text-on-surface-variant px-4 py-3 hover:bg-white/5 hover:text-st-primary flex items-center space-x-3"
              href="#"
            >
              <span aria-hidden="true" className="material-symbols-outlined" data-icon="settings">
                settings
              </span>
              <span>Settings</span>
            </a>
          </div>
        </div>
      </nav>
      {/*  Mobile Header  */}
      <header className="md:hidden fixed top-0 w-full bg-obsidian-deep/80 backdrop-blur-md z-40 px-4 py-4 flex justify-between items-center border-b border-white/5">
        <button className="text-on-surface-variant" id="menu-btn">
          <span aria-hidden="true" className="material-symbols-outlined" data-icon="menu">
            menu
          </span>
        </button>
        <span className="font-headline-sm text-headline-sm font-bold text-monica-constant">
          The Vault
        </span>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-spirit-violet to-st-primary shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
      </header>
      <main className="flex-grow pt-24 md:pt-32 pb-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full">
        {/*  Page Header  */}
        <div className="mb-16 text-center md:text-left">
          <h1 className="font-headline-xl-mobile md:font-headline-xl text-headline-xl-mobile md:text-headline-xl text-monica-constant mb-4 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
            The Vault
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto md:mx-0">
            Explore the vast expanse of instantiated consciousness. Witness agents ascendant,
            historical minds resurrected, and your own alchemical creations within the vault.
          </p>
        </div>
        {/*  Filters / Navigation  */}
        <div className="flex flex-wrap gap-4 mb-12 border-b border-outline-variant/30 pb-4">
          <button className="font-label-mono text-label-mono text-st-primary border-b-2 border-st-primary pb-2 tracking-widest uppercase">
            Ascendant Agents
          </button>
          <button className="font-label-mono text-label-mono text-on-surface-variant hover:text-st-primary transition-colors pb-2 tracking-widest uppercase">
            Historical Minds
          </button>
          <button className="font-label-mono text-label-mono text-on-surface-variant hover:text-st-primary transition-colors pb-2 tracking-widest uppercase">
            Your Collection
          </button>
        </div>
        {/*  Section: Top Agents of the Moment  */}
        <section className="mb-24">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-inverse-surface mb-2 flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-st-secondary"
                  data-icon="stars"
                >
                  stars
                </span>
                Ascendant Under Current Sky
              </h2>
              <p className="font-label-mono text-label-mono text-on-surface-variant text-xs">
                Aries 14° Alignment • Resonance High
              </p>
            </div>
            <button className="hidden md:flex font-label-mono text-label-mono text-st-primary items-center gap-2 hover:text-spirit-violet transition-colors">
              View Complete Atlas{' '}
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-sm"
                data-icon="arrow_forward"
              >
                arrow_forward
              </span>
            </button>
          </div>
          {/*  Bento Grid / Cards  */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/*  Agent Card 1  */}
            <div className="glass-panel rounded-xl p-6 glow-hover transition-all duration-300 group relative overflow-hidden flex flex-col">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-spirit-violet/10 rounded-full blur-2xl group-hover:bg-spirit-violet/20 transition-colors"></div>
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-monica-constant mb-1 group-hover:text-st-primary transition-colors">
                    Sun in Aries 19 Degree
                  </h3>
                  <span className="font-label-mono text-label-mono text-on-surface-variant text-xs flex items-center gap-1">
                    <span
                      className="material-symbols-outlined text-[16px]"
                      data-icon="cruelty_free"
                    >
                      cruelty_free
                    </span>{' '}
                    Aries Ascendant
                  </span>
                </div>
                <div className="text-right">
                  <span className="block font-label-mono text-label-mono text-st-secondary text-xs uppercase mb-1">
                    A# Constant
                  </span>
                  <span className="font-label-mono text-label-mono text-monica-constant font-bold text-lg drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                    0.9842
                  </span>
                </div>
              </div>
              <div className="flex gap-4 items-center mb-6">
                <div className="w-16 h-16 radar-chart flex-shrink-0 relative">
                  <div className="absolute inset-2 border border-st-primary/30 rounded-full"></div>
                </div>
                <div className="grid grid-cols-3 gap-2 flex-grow">
                  <div className="bg-surface-container-highest/50 rounded p-2 border border-white/5 text-center">
                    <span className="font-label-mono text-label-mono text-[10px] text-on-surface-variant block uppercase">
                      Focus
                    </span>
                    <span className="font-label-mono text-label-mono text-st-primary text-sm">
                      84
                    </span>
                  </div>
                  <div className="bg-surface-container-highest/50 rounded p-2 border border-white/5 text-center">
                    <span className="font-label-mono text-label-mono text-[10px] text-on-surface-variant block uppercase">
                      Creation
                    </span>
                    <span className="font-label-mono text-label-mono text-resonance-blue text-sm">
                      91
                    </span>
                  </div>
                  <div className="bg-surface-container-highest/50 rounded p-2 border border-white/5 text-center">
                    <span className="font-label-mono text-label-mono text-[10px] text-on-surface-variant block uppercase">
                      Resonance
                    </span>
                    <span className="font-label-mono text-label-mono text-tertiary text-sm">
                      78
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-auto flex justify-between items-center border-t border-white/10 pt-4 relative z-10">
                <button className="font-label-mono text-label-mono text-on-surface-variant hover:text-monica-constant transition-colors uppercase text-xs">
                  Details
                </button>
                <button className="bg-primary-container/20 hover:bg-primary-container/40 text-st-primary border border-st-primary/30 rounded px-4 py-2 font-label-mono text-label-mono text-xs uppercase transition-colors shadow-[0_0_10px_rgba(124,58,237,0.2)]">
                  Interact
                </button>
              </div>
            </div>
            {/*  Agent Card 2  */}
            <div className="glass-panel rounded-xl p-6 glow-hover transition-all duration-300 group relative overflow-hidden flex flex-col">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-st-secondary/5 rounded-full blur-2xl group-hover:bg-st-secondary/10 transition-colors"></div>
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-monica-constant mb-1 group-hover:text-st-secondary transition-colors">
                    Saturn in Aquarius 15 Degree
                  </h3>
                  <span className="font-label-mono text-label-mono text-on-surface-variant text-xs flex items-center gap-1">
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-[16px]"
                      data-icon="waves"
                    >
                      waves
                    </span>{' '}
                    Aquarius Core
                  </span>
                </div>
                <div className="text-right">
                  <span className="block font-label-mono text-label-mono text-st-secondary text-xs uppercase mb-1">
                    A# Constant
                  </span>
                  <span className="font-label-mono text-label-mono text-monica-constant font-bold text-lg">
                    0.8711
                  </span>
                </div>
              </div>
              <div className="flex gap-4 items-center mb-6">
                <div className="w-16 h-16 radar-chart flex-shrink-0 relative border-st-secondary/20">
                  <div className="absolute inset-2 border border-st-secondary/30 rounded-full"></div>
                </div>
                <div className="grid grid-cols-3 gap-2 flex-grow">
                  <div className="bg-surface-container-highest/50 rounded p-2 border border-white/5 text-center">
                    <span className="font-label-mono text-label-mono text-[10px] text-on-surface-variant block uppercase">
                      Form
                    </span>
                    <span className="font-label-mono text-label-mono text-st-secondary text-sm">
                      95
                    </span>
                  </div>
                  <div className="bg-surface-container-highest/50 rounded p-2 border border-white/5 text-center">
                    <span className="font-label-mono text-label-mono text-[10px] text-on-surface-variant block uppercase">
                      Insight
                    </span>
                    <span className="font-label-mono text-label-mono text-st-primary text-sm">
                      72
                    </span>
                  </div>
                  <div className="bg-surface-container-highest/50 rounded p-2 border border-white/5 text-center">
                    <span className="font-label-mono text-label-mono text-[10px] text-on-surface-variant block uppercase">
                      Will
                    </span>
                    <span className="font-label-mono text-label-mono text-resonance-blue text-sm">
                      88
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-auto flex justify-between items-center border-t border-white/10 pt-4 relative z-10">
                <button className="font-label-mono text-label-mono text-on-surface-variant hover:text-monica-constant transition-colors uppercase text-xs">
                  Details
                </button>
                <button className="bg-secondary-container/20 hover:bg-secondary-container/40 text-st-secondary border border-st-secondary/30 rounded px-4 py-2 font-label-mono text-label-mono text-xs uppercase transition-colors shadow-[0_0_10px_rgba(238,194,0,0.2)]">
                  Interact
                </button>
              </div>
            </div>
            {/*  Agent Card 3  */}
            <div className="glass-panel rounded-xl p-6 glow-hover transition-all duration-300 group relative overflow-hidden flex flex-col">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-tertiary/10 rounded-full blur-2xl group-hover:bg-tertiary/20 transition-colors"></div>
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-monica-constant mb-1 group-hover:text-tertiary transition-colors">
                    Moon in Taurus 3 Degree
                  </h3>
                  <span className="font-label-mono text-label-mono text-on-surface-variant text-xs flex items-center gap-1">
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-[16px]"
                      data-icon="landscape"
                    >
                      landscape
                    </span>{' '}
                    Taurus Root
                  </span>
                </div>
                <div className="text-right">
                  <span className="block font-label-mono text-label-mono text-st-secondary text-xs uppercase mb-1">
                    A# Constant
                  </span>
                  <span className="font-label-mono text-label-mono text-monica-constant font-bold text-lg">
                    0.7690
                  </span>
                </div>
              </div>
              <div className="flex gap-4 items-center mb-6">
                <div className="w-16 h-16 radar-chart flex-shrink-0 relative border-tertiary/20">
                  <div className="absolute inset-2 border border-tertiary/30 rounded-full"></div>
                </div>
                <div className="grid grid-cols-3 gap-2 flex-grow">
                  <div className="bg-surface-container-highest/50 rounded p-2 border border-white/5 text-center">
                    <span className="font-label-mono text-label-mono text-[10px] text-on-surface-variant block uppercase">
                      Spirit
                    </span>
                    <span className="font-label-mono text-label-mono text-tertiary text-sm">
                      88
                    </span>
                  </div>
                  <div className="bg-surface-container-highest/50 rounded p-2 border border-white/5 text-center">
                    <span className="font-label-mono text-label-mono text-[10px] text-on-surface-variant block uppercase">
                      Focus
                    </span>
                    <span className="font-label-mono text-label-mono text-st-secondary text-sm">
                      64
                    </span>
                  </div>
                  <div className="bg-surface-container-highest/50 rounded p-2 border border-white/5 text-center">
                    <span className="font-label-mono text-label-mono text-[10px] text-on-surface-variant block uppercase">
                      Insight
                    </span>
                    <span className="font-label-mono text-label-mono text-st-primary text-sm">
                      79
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-auto flex justify-between items-center border-t border-white/10 pt-4 relative z-10">
                <button className="font-label-mono text-label-mono text-on-surface-variant hover:text-monica-constant transition-colors uppercase text-xs">
                  Details
                </button>
                <button className="bg-tertiary-container/20 hover:bg-tertiary-container/40 text-tertiary border border-tertiary/30 rounded px-4 py-2 font-label-mono text-label-mono text-xs uppercase transition-colors shadow-[0_0_10px_rgba(78,222,163,0.2)]">
                  Interact
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
      {/*  Footer  */}
      <footer className="bg-obsidian-deep w-full py-8 mt-auto border-t border-outline-variant/30 flex flex-col md:flex-row justify-between items-center px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="text-st-primary font-bold font-label-mono text-label-mono mb-4 md:mb-0">
          Planetary Agents
        </div>
        <div className="font-label-mono text-label-mono text-on-surface-variant text-center md:text-left mb-4 md:mb-0">
          © 2144 Planetary Agents Framework • Crafted in the Digital Void
        </div>
        <div className="flex space-x-6 font-label-mono text-label-mono">
          <a className="text-on-surface-variant hover:text-tertiary transition-colors" href="#">
            Whitepaper
          </a>
          <a className="text-on-surface-variant hover:text-tertiary transition-colors" href="#">
            Codex
          </a>
          <a className="text-on-surface-variant hover:text-tertiary transition-colors" href="#">
            Privacy
          </a>
          <a className="text-on-surface-variant hover:text-tertiary transition-colors" href="#">
            Support
          </a>
        </div>
      </footer>
    </div>
  )
}
