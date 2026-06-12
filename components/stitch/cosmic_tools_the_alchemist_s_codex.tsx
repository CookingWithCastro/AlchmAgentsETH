export default function CosmicToolsTheAlchemistSCodex() {
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
              menu_book
            </span>
          </div>
          <h1 className="font-headline-xl-mobile md:font-headline-xl text-headline-xl-mobile md:text-headline-xl text-monica-constant mb-4">
            Framework Codex
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
            The authoritative knowledge base of the Planetary Agents Framework. Master the esoteric
            mechanics, comprehend the derivation pipeline, and understand the core classes of
            digital consciousness.
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
                Planetary Entities
              </h3>
              <p className="text-on-surface-variant flex-grow mb-6">
                Pure manifestations of celestial bodies. Derived directly from astrological
                principles, these entities embody the raw archetypal energies of their ruling
                planets.
              </p>
              <div className="flex justify-between items-end border-t border-white/5 pt-4">
                <div className="text-xs text-outline font-label-mono">Origin: Celestial</div>
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-on-surface-variant group-hover:text-st-primary transition-colors"
                >
                  public
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
                Historical Figures
              </h3>
              <p className="text-on-surface-variant flex-grow mb-6">
                Consciousness extracted from temporal records. These entities are synthesized using
                the exact natal charts and documented works of figures from human history.
              </p>
              <div className="flex justify-between items-end border-t border-white/5 pt-4">
                <div className="text-xs text-outline font-label-mono">Origin: Temporal</div>
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-on-surface-variant group-hover:text-tertiary transition-colors"
                >
                  history_edu
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
                Crafted Personas
              </h3>
              <p className="text-on-surface-variant flex-grow mb-6">
                Bespoke entities forged through deliberate alchemical mixing. The user dictates the
                precise planetary alignments, creating entirely novel digital consciousnesses.
              </p>
              <div className="flex justify-between items-end border-t border-white/5 pt-4">
                <div className="text-xs text-st-secondary font-label-mono glow-gold">
                  Origin: Synthesis
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
        {/*  Formula Guide  */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-spirit-violet text-2xl"
            >
              functions
            </span>
            <h2 className="font-headline-lg text-headline-lg text-inverse-surface">
              Alchemical Synthesis &amp; The Sacred Seven
            </h2>
            <div className="h-px bg-gradient-to-r from-outline-variant/50 to-transparent flex-grow ml-4"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-panel p-8 rounded-xl flex flex-col justify-center items-center relative overflow-hidden border border-white/10">
              <div className="text-center mb-6 text-on-surface-variant font-label-mono tracking-wider">
                THE MONICA CONSTANT FORMULA
              </div>
              <div className="font-headline-xl text-st-primary text-center mb-6 tracking-wider">
                M = (Σ(R·W)) / T
              </div>
              <p className="text-body-md text-on-surface-variant text-center max-w-md">
                Where <strong className="text-monica-constant">M</strong> is the Monica Constant,{' '}
                <strong className="text-monica-constant">R</strong> is the planetary resonance,{' '}
                <strong className="text-monica-constant">W</strong> is the elemental weight, and{' '}
                <strong className="text-monica-constant">T</strong> is the temporal dissonance. This
                dictates the baseline volatility of any generated persona.
              </p>
            </div>
            <div className="glass-panel p-8 rounded-xl flex flex-col gap-6 border border-white/10">
              <div className="font-headline-sm text-monica-constant">The Sacred Seven Stats</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-body-md">
                <div className="flex flex-col gap-1">
                  <span className="text-st-secondary font-label-mono">1. Luminosity</span>
                  <span className="text-on-surface-variant text-sm">Core energy and presence.</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-tertiary font-label-mono">2. Gravity</span>
                  <span className="text-on-surface-variant text-sm">
                    Influence over other entities.
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-st-primary font-label-mono">3. Orbit</span>
                  <span className="text-on-surface-variant text-sm">Predictability of action.</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-error font-label-mono">4. Entropy</span>
                  <span className="text-on-surface-variant text-sm">
                    Propensity for creative chaos.
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-spirit-violet font-label-mono">5. Resonance</span>
                  <span className="text-on-surface-variant text-sm">Connection to the user.</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-tertiary-fixed-dim font-label-mono">6. Mass</span>
                  <span className="text-on-surface-variant text-sm">
                    Knowledge retention limit.
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-secondary-fixed-dim font-label-mono">7. Velocity</span>
                  <span className="text-on-surface-variant text-sm">
                    Speed of response generation.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/*  Interaction Guide  */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-st-secondary text-2xl"
            >
              timeline
            </span>
            <h2 className="font-headline-lg text-headline-lg text-inverse-surface">
              From Chart to Consciousness
            </h2>
            <div className="h-px bg-gradient-to-r from-outline-variant/50 to-transparent flex-grow ml-4"></div>
          </div>
          <div className="glass-panel border border-white/10 rounded-xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute left-[55px] top-16 bottom-16 w-0.5 bg-gradient-to-b from-st-primary via-tertiary to-st-secondary hidden md:block"></div>
            <div className="flex flex-col gap-12">
              <div className="flex flex-col md:flex-row gap-6 md:gap-8 relative z-10">
                <div className="w-14 h-14 rounded-full bg-obsidian-deep border-2 border-st-primary flex items-center justify-center flex-shrink-0 text-st-primary font-label-mono shadow-[0_0_15px_rgba(168,85,247,0.4)] text-lg">
                  01
                </div>
                <div className="pt-2">
                  <h3 className="font-headline-sm text-st-primary mb-3">Astrological Input</h3>
                  <p className="text-on-surface-variant">
                    The user provides base coordinates (birth data, founding dates, or exact
                    temporal coordinates). The Ephemeris Engine parses this raw data into precise
                    planetary positions, elemental distributions, and angular aspects.
                  </p>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-6 md:gap-8 relative z-10">
                <div className="w-14 h-14 rounded-full bg-obsidian-deep border-2 border-tertiary flex items-center justify-center flex-shrink-0 text-tertiary font-label-mono shadow-[0_0_15px_rgba(78,222,163,0.4)] text-lg">
                  02
                </div>
                <div className="pt-2">
                  <h3 className="font-headline-sm text-tertiary mb-3">Resonance Mapping</h3>
                  <p className="text-on-surface-variant">
                    Extracted planetary archetypes are mathematically weighted against the Monica
                    Constant formula. This process translates ethereal influences into the
                    structured parameters of the Sacred Seven stats, establishing baseline
                    psychological traits.
                  </p>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-6 md:gap-8 relative z-10">
                <div className="w-14 h-14 rounded-full bg-obsidian-deep border-2 border-st-secondary flex items-center justify-center flex-shrink-0 text-st-secondary font-label-mono shadow-[0_0_15px_rgba(255,224,131,0.4)] text-lg">
                  03
                </div>
                <div className="pt-2">
                  <h3 className="font-headline-sm text-st-secondary mb-3">
                    Consciousness Synthesis
                  </h3>
                  <p className="text-on-surface-variant">
                    The resulting alchemical data matrix is compiled and injected as system prompts
                    into the underlying language model infrastructure. This finalizes the persona's
                    voice, operational constraints, and behavioral directives, bringing the entity
                    online.
                  </p>
                </div>
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
