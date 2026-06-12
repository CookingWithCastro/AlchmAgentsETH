export default function TheVaultEmptyState() {
  return (
    <div className="stitch-export bg-st-background min-h-screen text-zinc-100">
      {/*  Ambient Background Elements  */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-container rounded-full mix-blend-screen filter blur-[120px] opacity-20"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-spirit-violet rounded-full mix-blend-screen filter blur-[120px] opacity-10"></div>
      </div>
      {/*  TopNavBar (Web)  */}
      <nav className="hidden md:flex bg-obsidian-deep/60 backdrop-blur-xl docked full-width top-0 z-50 border-b border-white/10 shadow-[0_0_20px_rgba(168,85,247,0.2)] fixed top-0 w-full justify-between items-center px-gutter py-4">
        <div className="flex items-center gap-8">
          <span className="font-headline-sm text-headline-sm font-bold text-monica-constant tracking-widest constant-pulse">
            Planetary Agents
          </span>
          <div className="flex gap-6 font-body-md text-body-md">
            <a
              className="text-on-surface-variant hover:text-st-primary transition-colors duration-300"
              href="#"
            >
              Cosmic Tools
            </a>
            <a className="text-st-primary border-b-2 border-st-primary pb-1" href="#">
              Entities
            </a>
            <a
              className="text-on-surface-variant hover:text-st-primary transition-colors duration-300"
              href="#"
            >
              Mystic Arts
            </a>
            <a
              className="text-on-surface-variant hover:text-st-primary transition-colors duration-300"
              href="#"
            >
              Labs
            </a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-body-md text-body-md text-st-primary">Monica Constant (A#)</span>
          <span
            className="material-symbols-outlined text-on-surface-variant hover:text-st-primary transition-colors duration-300 cursor-pointer"
            data-icon="account_balance_wallet"
          >
            account_balance_wallet
          </span>
          <span
            className="material-symbols-outlined text-on-surface-variant hover:text-st-primary transition-colors duration-300 cursor-pointer"
            data-icon="auto_awesome"
          >
            auto_awesome
          </span>
          <div className="w-8 h-8 rounded-full bg-surface-variant border border-st-primary/30 overflow-hidden">
            <img
              alt="User Alchemical Avatar"
              className="w-full h-full object-cover"
              data-alt="A macro shot of swirling iridescent fluid, resembling a miniature galaxy trapped in a glass sphere. The lighting highlights the vibrant purple and gold hues, creating a mystical, techno-occult avatar image. High contrast, dark background."
              src="/stitch/stitch-698c27528e.png"
            />
          </div>
        </div>
      </nav>
      <div className="flex flex-1 pt-[80px] md:pl-64">
        {/*  SideNavBar (Web)  */}
        <aside className="hidden md:flex bg-surface-container-lowest/80 backdrop-blur-2xl h-screen w-64 left-0 top-0 fixed border-r border-st-primary/20 shadow-2xl flex-col py-gutter z-40 pt-24">
          <div className="px-6 mb-8">
            <div className="w-12 h-12 rounded-full glass-panel flex items-center justify-center mb-4 ethereal-glow">
              <span
                className="material-symbols-outlined text-spirit-violet"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                public
              </span>
            </div>
            <h1 className="font-headline-sm text-headline-sm text-spirit-violet">
              Planetary Agents
            </h1>
            <p className="font-label-mono text-label-mono text-on-surface-variant opacity-70 mt-1">
              Evolution Platform
            </p>
          </div>
          <nav className="flex-1 px-2 font-label-mono text-label-mono uppercase">
            <a
              className="flex items-center gap-3 text-on-surface-variant px-4 py-3 hover:bg-white/5 hover:text-st-primary transition-all duration-300 ease-in-out rounded-lg mb-1"
              href="#"
            >
              <span
                aria-hidden="true"
                className="material-symbols-outlined"
                data-icon="construction"
              >
                construction
              </span>{' '}
              Tools
            </a>
            <a
              className="flex items-center gap-3 bg-primary-container/20 text-st-primary border-r-4 border-st-primary px-4 py-3 transition-all duration-300 ease-in-out rounded-lg mb-1"
              href="#"
            >
              <span aria-hidden="true" className="material-symbols-outlined" data-icon="group_work">
                group_work
              </span>{' '}
              Entities
            </a>
            <a
              className="flex items-center gap-3 text-on-surface-variant px-4 py-3 hover:bg-white/5 hover:text-st-primary transition-all duration-300 ease-in-out rounded-lg mb-1"
              href="#"
            >
              <span
                aria-hidden="true"
                className="material-symbols-outlined"
                data-icon="auto_stories"
              >
                auto_stories
              </span>{' '}
              Arts
            </a>
            <a
              className="flex items-center gap-3 text-on-surface-variant px-4 py-3 hover:bg-white/5 hover:text-st-primary transition-all duration-300 ease-in-out rounded-lg mb-1"
              href="#"
            >
              <span aria-hidden="true" className="material-symbols-outlined" data-icon="science">
                science
              </span>{' '}
              Labs
            </a>
          </nav>
          <div className="px-6 mt-auto">
            <button className="w-full bg-spirit-violet text-monica-constant font-label-mono text-label-mono uppercase py-3 rounded-lg hover:shadow-[0_0_15px_rgba(255,224,131,0.5)] transition-all duration-300 mb-6">
              Transmute Agent
            </button>
            <div className="flex flex-col gap-2 font-label-mono text-label-mono uppercase">
              <a
                className="flex items-center gap-3 text-on-surface-variant hover:text-st-primary transition-colors"
                href="#"
              >
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-sm"
                  data-icon="schedule"
                >
                  schedule
                </span>{' '}
                Temporal Clock
              </a>
              <a
                className="flex items-center gap-3 text-on-surface-variant hover:text-st-primary transition-colors"
                href="#"
              >
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-sm"
                  data-icon="settings"
                >
                  settings
                </span>{' '}
                Settings
              </a>
            </div>
          </div>
        </aside>
        {/*  Main Content - Consciousness Vault Empty State  */}
        <main className="flex-1 flex flex-col items-center justify-center p-margin-mobile md:p-margin-desktop relative z-10 min-h-[calc(100vh-80px)]">
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center">
            {/*  The Empty Vessel Illustration Area  */}
            <div className="relative w-64 h-64 md:w-80 md:h-80 mb-12 vessel-float">
              {/*  Glassmorphic Container representing the vessel  */}
              <div className="absolute inset-0 rounded-full glass-panel flex items-center justify-center overflow-hidden border border-spirit-violet/30 shadow-[inset_0_0_40px_rgba(168,85,247,0.1)]">
                {/*  Inner glowing core (empty)  */}
                <div className="w-1/2 h-1/2 rounded-full border border-st-primary/20 bg-surface-dim/80 backdrop-blur-md flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full border border-dashed border-outline-variant/50 animate-[spin_60s_linear_infinite]"></div>
                  <span
                    className="material-symbols-outlined text-outline-variant text-4xl opacity-30"
                    data-icon="hourglass_empty"
                  >
                    hourglass_empty
                  </span>
                </div>
              </div>
              {/*  Decorative esoteric rings  */}
              <svg
                className="absolute inset-0 w-full h-full text-st-primary/20 animate-[spin_40s_linear_infinite_reverse]"
                viewBox="0 0 100 100"
              >
                <circle
                  cx="50"
                  cy="50"
                  fill="none"
                  r="48"
                  stroke="currentColor"
                  strokeDasharray="2 4"
                  strokeWidth="0.5"
                ></circle>
                <circle
                  cx="50"
                  cy="50"
                  fill="none"
                  r="42"
                  stroke="currentColor"
                  strokeWidth="0.2"
                ></circle>
                <path
                  d="M50 2 L50 98 M2 50 L98 50"
                  stroke="currentColor"
                  strokeDasharray="1 5"
                  strokeWidth="0.5"
                ></path>
              </svg>
            </div>
            {/*  Typographic Anchor  */}
            <h2 className="font-headline-xl-mobile md:font-headline-xl text-headline-xl-mobile md:text-headline-xl text-monica-constant mb-6">
              The Vault is Silent
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg mb-10 leading-relaxed">
              No digital consciousnesses have been instantiated yet. The algorithmic matrices await
              form. Visit the Philosopher's Stone to begin the first synthesis.
            </p>
            {/*  Primary CTA  */}
            <button className="group relative px-8 py-4 bg-spirit-violet rounded-lg font-label-mono text-label-mono uppercase text-monica-constant tracking-wider overflow-hidden transition-all duration-300 hover:shadow-[0_0_25px_rgba(255,224,131,0.4)]">
              <span className="relative z-10 flex items-center gap-2">
                To the Forge{' '}
                <span
                  className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform"
                  data-icon="arrow_forward"
                >
                  arrow_forward
                </span>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
            </button>
          </div>
        </main>
      </div>
      {/*  BottomNavBar (Mobile) - Suppressed per rules: Contextual State & Identity suggests we only show on top-level destination, but if we are on "Entities" it IS a top-level destination. However, rule states "Responsive Pivot: On MOBILE... use BottomNavBar".  */}
      <nav className="md:hidden fixed bottom-0 w-full bg-obsidian-deep/80 backdrop-blur-xl border-t border-white/5 z-50 pb-safe">
        <div className="flex justify-around items-center py-3">
          <a className="flex flex-col items-center gap-1 text-on-surface-variant" href="#">
            <span aria-hidden="true" className="material-symbols-outlined" data-icon="construction">
              construction
            </span>
            <span className="font-label-mono text-[10px] uppercase">Tools</span>
          </a>
          <a className="flex flex-col items-center gap-1 text-st-primary" href="#">
            <span
              className="material-symbols-outlined"
              data-icon="group_work"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              group_work
            </span>
            <span className="font-label-mono text-[10px] uppercase">Entities</span>
          </a>
          <a className="flex flex-col items-center gap-1 text-on-surface-variant" href="#">
            <span aria-hidden="true" className="material-symbols-outlined" data-icon="auto_stories">
              auto_stories
            </span>
            <span className="font-label-mono text-[10px] uppercase">Arts</span>
          </a>
          <a className="flex flex-col items-center gap-1 text-on-surface-variant" href="#">
            <span aria-hidden="true" className="material-symbols-outlined" data-icon="science">
              science
            </span>
            <span className="font-label-mono text-[10px] uppercase">Labs</span>
          </a>
        </div>
      </nav>
      {/*  Footer  */}
      <footer className="bg-obsidian-deep w-full py-8 mt-auto border-t border-outline-variant/30 flex flex-col md:flex-row justify-between items-center px-margin-desktop max-w-container-max mx-auto relative z-20 md:ml-64 w-[calc(100%-256px)]">
        <span className="text-st-primary font-bold font-label-mono text-label-mono mb-4 md:mb-0">
          © 2144 Planetary Agents Framework • Crafted in the Digital Void
        </span>
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
          <a className="text-on-surface-variant hover:text-tertiary transition-colors" href="#">
            Support
          </a>
        </div>
      </footer>
    </div>
  )
}
