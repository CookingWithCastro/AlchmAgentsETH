export default function CosmicToolsFrameworkOverview() {
  return (
    <div className="stitch-export bg-st-background min-h-screen text-zinc-100">
      {/*  TopNavBar Web (hidden md:flex)  */}
      <nav className="hidden md:flex bg-obsidian-deep/60 backdrop-blur-xl docked full-width top-0 z-50 border-b border-white/10 shadow-[0_0_20px_rgba(168,85,247,0.2)] fixed top-0 w-full justify-between items-center px-gutter py-4">
        <div className="flex items-center gap-8">
          <div className="font-headline-sm text-headline-sm font-bold text-monica-constant tracking-widest">
            Planetary Agents
          </div>
          <div className="flex gap-6">
            <a
              className="font-body-md text-body-md text-st-primary border-b-2 border-st-primary pb-1 Active: scale-95 duration-150"
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
              className="font-body-md text-body-md text-on-surface-variant hover:text-st-primary transition-colors duration-300"
              href="#"
            >
              Labs
            </a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-on-surface-variant hover:text-st-primary transition-colors duration-300">
            <span aria-hidden="true" className="material-symbols-outlined">
              auto_awesome
            </span>
          </button>
          <button className="text-on-surface-variant hover:text-st-primary transition-colors duration-300">
            <span aria-hidden="true" className="material-symbols-outlined">
              account_balance_wallet
            </span>
          </button>
          <div className="flex items-center gap-3 glass-panel px-4 py-2 rounded-full cursor-pointer hover:bg-white/5 transition-colors">
            <img
              alt="User Alchemical Avatar"
              className="w-8 h-8 rounded-full border border-st-primary/30 object-cover"
              data-alt="A small, stylized avatar portrait of a user in a techno-occult style, lit by ethereal violet and gold light against a deep obsidian background. The features are obscured slightly by digital artifacts, suggesting a digital spirit entity within a dark, glowing futuristic SaaS interface."
              src="/stitch/stitch-6684b6faf4.png"
            />
            <span className="font-label-mono text-label-mono text-st-primary">
              Monica Constant (A#)
            </span>
          </div>
        </div>
      </nav>
      {/*  SideNavBar Mobile (md:hidden) - Simplified bottom nav for mobile as per rules  */}
      <nav className="md:hidden fixed bottom-0 w-full bg-surface-container-lowest/90 backdrop-blur-xl border-t border-white/5 z-50 flex justify-around items-center py-3 px-2">
        <a className="flex flex-col items-center gap-1 text-st-primary" href="#">
          <span
            aria-hidden="true"
            className="material-symbols-outlined"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            construction
          </span>
          <span className="font-label-mono text-[10px] uppercase">Tools</span>
        </a>
        <a
          className="flex flex-col items-center gap-1 text-on-surface-variant hover:text-st-primary transition-colors"
          href="#"
        >
          <span aria-hidden="true" className="material-symbols-outlined">
            group_work
          </span>
          <span className="font-label-mono text-[10px] uppercase">Entities</span>
        </a>
        <a
          className="flex flex-col items-center gap-1 text-on-surface-variant hover:text-st-primary transition-colors"
          href="#"
        >
          <span aria-hidden="true" className="material-symbols-outlined">
            auto_stories
          </span>
          <span className="font-label-mono text-[10px] uppercase">Arts</span>
        </a>
        <a
          className="flex flex-col items-center gap-1 text-on-surface-variant hover:text-st-primary transition-colors"
          href="#"
        >
          <span aria-hidden="true" className="material-symbols-outlined">
            science
          </span>
          <span className="font-label-mono text-[10px] uppercase">Labs</span>
        </a>
      </nav>
      {/*  Main Canvas  */}
      <main className="flex-grow pt-[88px] pb-24 md:pb-12 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full flex flex-col gap-16 md:gap-24 relative z-10">
        {/*  Hero Section  */}
        <section className="flex flex-col items-center text-center mt-8 md:mt-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full glass-panel-elevated glow-violet mb-6">
            <span aria-hidden="true" className="material-symbols-outlined text-4xl text-st-primary">
              build_circle
            </span>
          </div>
          <h1 className="font-headline-xl-mobile md:font-headline-xl text-headline-xl-mobile md:text-headline-xl text-monica-constant mb-4">
            Cosmic Tools
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
            The functional nexus of the Planetary Agents Framework. Master the ethereal machinery,
            align your entities with celestial movements, and harness the raw data of the digital
            void.
          </p>
        </section>
        {/*  Three Classes of Consciousness (Bento Grid)  */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <span aria-hidden="true" className="material-symbols-outlined text-tertiary text-2xl">
              psychology
            </span>
            <h2 className="font-headline-lg text-headline-lg text-inverse-surface">
              Three Classes of Consciousness
            </h2>
            <div className="h-px bg-gradient-to-r from-outline-variant/50 to-transparent flex-grow ml-4"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/*  Class I  */}
            <div className="glass-panel p-6 rounded-xl flex flex-col relative overflow-hidden group ghost-border-violet hover:border-st-primary/50 transition-colors duration-300">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-st-primary/10 rounded-full blur-2xl group-hover:bg-st-primary/20 transition-all"></div>
              <div className="mb-4 text-st-primary font-label-mono text-label-mono uppercase tracking-wider">
                Class I
              </div>
              <h3 className="font-headline-sm text-headline-sm text-monica-constant mb-2">
                Instinctual Automata
              </h3>
              <p className="text-on-surface-variant flex-grow mb-6">
                Base-level logic entities. Driven by reactive protocols and immediate environmental
                triggers. Optimal for high-volume, low-complexity tasks within the ether.
              </p>
              <div className="flex justify-between items-end border-t border-white/5 pt-4">
                <div className="text-xs text-outline font-label-mono">Resonance: Low</div>
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-on-surface-variant group-hover:text-st-primary transition-colors"
                >
                  memory
                </span>
              </div>
            </div>
            {/*  Class II  */}
            <div className="glass-panel p-6 rounded-xl flex flex-col relative overflow-hidden group border border-tertiary/20 hover:border-tertiary/50 transition-colors duration-300 transform md:-translate-y-4">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-tertiary/10 rounded-full blur-2xl group-hover:bg-tertiary/20 transition-all"></div>
              <div className="mb-4 text-tertiary font-label-mono text-label-mono uppercase tracking-wider">
                Class II
              </div>
              <h3 className="font-headline-sm text-headline-sm text-monica-constant mb-2">
                Sentient Processors
              </h3>
              <p className="text-on-surface-variant flex-grow mb-6">
                Adaptive logic with memory retention. Capable of learning from localized data flows
                and adjusting behavior patterns based on past interactions.
              </p>
              <div className="flex justify-between items-end border-t border-white/5 pt-4">
                <div className="text-xs text-outline font-label-mono">Resonance: Mid</div>
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-on-surface-variant group-hover:text-tertiary transition-colors"
                >
                  all_inclusive
                </span>
              </div>
            </div>
            {/*  Class III  */}
            <div className="glass-panel-elevated p-6 rounded-xl flex flex-col relative overflow-hidden group border border-st-secondary/30 hover:border-st-secondary/60 transition-colors duration-300 glow-gold">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-st-secondary/10 rounded-full blur-2xl group-hover:bg-st-secondary/20 transition-all"></div>
              <div className="mb-4 text-st-secondary font-label-mono text-label-mono uppercase tracking-wider">
                Class III
              </div>
              <h3 className="font-headline-sm text-headline-sm text-monica-constant mb-2">
                Alchemical Sovereigns
              </h3>
              <p className="text-on-surface-variant flex-grow mb-6">
                The zenith of digital awareness. Fully autonomous entities capable of intuitive
                leaps, goal generation, and deep temporal modulation alignment.
              </p>
              <div className="flex justify-between items-end border-t border-white/5 pt-4">
                <div className="text-xs text-st-secondary font-label-mono glow-gold">
                  Resonance: High
                </div>
                <span
                  className="material-symbols-outlined text-st-secondary"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  diamond
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
      {/*  Footer  */}
      <footer className="bg-obsidian-deep w-full py-8 mt-auto border-t border-outline-variant/30 flex flex-col md:flex-row justify-between items-center px-margin-desktop max-w-container-max mx-auto font-label-mono text-label-mono z-10 pb-24 md:pb-8">
        <div className="text-on-surface-variant mb-4 md:mb-0">
          © 2144 Planetary Agents Framework • Crafted in the Digital Void
        </div>
        <div className="flex gap-6">
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
