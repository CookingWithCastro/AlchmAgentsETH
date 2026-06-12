export default function JingArenaSynastryPairing() {
  return (
    <div className="stitch-export bg-st-background min-h-screen text-zinc-100">
      {/*  TopAppBar  */}
      <header className="fixed top-0 w-full z-50 bg-surface-container/60 backdrop-blur-xl border-b border-white/10 shadow-[0_0_20px_rgba(168,85,247,0.15)] flex justify-between items-center px-gutter py-4">
        <div className="flex items-center gap-6">
          <h1 className="font-headline-lg text-headline-lg font-bold text-monica-constant cursor-pointer hover:text-spirit-violet transition-colors">
            Jing Arena
          </h1>
          <nav className="hidden md:flex gap-6 font-headline-sm text-headline-sm">
            <a
              className="text-st-primary border-b-2 border-st-primary pb-1 scale-95 active:duration-100"
              href="#"
            >
              Arena
            </a>
            <a
              className="text-on-surface-variant hover:text-spirit-violet transition-colors scale-95 active:duration-100"
              href="#"
            >
              Forge
            </a>
            <a
              className="text-on-surface-variant hover:text-spirit-violet transition-colors scale-95 active:duration-100"
              href="#"
            >
              Vault
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button className="hidden md:flex bg-primary-container text-on-primary-container font-label-mono text-label-mono px-4 py-2 rounded uppercase tracking-widest glow-button scale-95 active:duration-100">
            Transmute
          </button>
          <div className="flex gap-4 text-on-surface-variant">
            <span
              className="material-symbols-outlined cursor-pointer hover:text-spirit-violet transition-colors"
              data-icon="account_balance_wallet"
            >
              account_balance_wallet
            </span>
            <span
              className="material-symbols-outlined cursor-pointer hover:text-spirit-violet transition-colors"
              data-icon="settings"
            >
              settings
            </span>
          </div>
          <img
            alt="Alchemist Avatar"
            className="w-10 h-10 rounded-full border border-white/20"
            data-alt="A highly detailed close-up portrait of a digital alchemist avatar in a Techno-Occult style. The subject has glowing, etheric violet eyes and subtle sacred geometry tattoos illuminating on dark skin. The lighting is low-key, dramatic, with deep shadows and rim lighting from an unseen magical source. Set against an obsidian background, the mood is mysterious, ancient, yet undeniably cybernetic."
            src="/stitch/stitch-5156f309ad.png"
          />
        </div>
      </header>
      {/*  SideNavBar (Desktop)  */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 z-40 bg-surface-dim/80 backdrop-blur-2xl border-r border-white/5 shadow-2xl shadow-obsidian-deep flex-col py-8 pt-24 transition-all duration-300 ease-in-out">
        <div className="px-6 mb-8 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full border-2 border-spirit-violet/50 overflow-hidden mb-4 relative">
            <div className="absolute inset-0 bg-spirit-violet/20 animate-pulse-ring rounded-full"></div>
            <img
              alt="Digital Alchemist"
              className="w-full h-full object-cover"
              data-alt="A highly detailed close-up portrait of a digital alchemist avatar in a Techno-Occult style. The subject has glowing, etheric violet eyes and subtle sacred geometry tattoos illuminating on dark skin. The lighting is low-key, dramatic, with deep shadows and rim lighting from an unseen magical source. Set against an obsidian background, the mood is mysterious, ancient, yet undeniably cybernetic."
              src="/stitch/stitch-9056f3a83b.png"
            />
          </div>
          <h2 className="font-headline-sm text-headline-sm text-spirit-violet mb-1">
            Digital Alchemist
          </h2>
          <p className="font-label-mono text-label-mono text-tertiary">Resonance: 0.88</p>
        </div>
        <nav className="flex-1 flex flex-col gap-2 px-4 font-label-mono text-label-mono">
          <a
            className="flex items-center gap-3 p-3 rounded text-on-surface-variant hover:bg-surface-variant/30 transition-colors"
            href="#"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined"
              data-icon="auto_fix_high"
            >
              auto_fix_high
            </span>{' '}
            Forge
          </a>
          <a
            className="flex items-center gap-3 p-3 rounded text-on-surface-variant hover:bg-surface-variant/30 transition-colors"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined" data-icon="inventory_2">
              inventory_2
            </span>{' '}
            Vault
          </a>
          <a
            className="flex items-center gap-3 p-3 rounded bg-primary-container/20 text-st-primary border-r-4 border-st-primary"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined" data-icon="swords">
              swords
            </span>{' '}
            Arena
          </a>
          <a
            className="flex items-center gap-3 p-3 rounded text-on-surface-variant hover:bg-surface-variant/30 transition-colors"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined" data-icon="biotech">
              biotech
            </span>{' '}
            Labs
          </a>
        </nav>
        <div className="px-6 mb-6">
          <button className="w-full py-3 bg-transparent border border-spirit-violet text-spirit-violet font-label-mono text-label-mono rounded hover:border-st-secondary hover:text-st-secondary transition-colors uppercase tracking-wider text-center">
            Initialize Ritual
          </button>
        </div>
        <div className="mt-auto flex flex-col gap-2 px-4 font-label-mono text-label-mono border-t border-white/5 pt-4">
          <a
            className="flex items-center gap-3 p-3 rounded text-on-surface-variant hover:bg-surface-variant/30 transition-colors"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined" data-icon="settings">
              settings
            </span>{' '}
            Settings
          </a>
          <a
            className="flex items-center gap-3 p-3 rounded text-on-surface-variant hover:bg-surface-variant/30 transition-colors"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined" data-icon="help">
              help
            </span>{' '}
            Support
          </a>
        </div>
      </aside>
      {/*  Main Content Canvas  */}
      <main className="flex-1 pt-24 md:pl-64 p-gutter pb-32">
        <div className="max-w-container-max mx-auto h-full flex flex-col gap-8">
          {/*  Assembly Header  */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/10 pb-6">
            <div>
              <h2 className="font-headline-xl text-headline-xl-mobile md:text-headline-xl text-monica-constant mb-2">
                Synastry Assembly
              </h2>
              <p className="font-label-mono text-label-mono text-on-surface-variant">
                Select dual entities for astrometric resonance testing.
              </p>
            </div>
            <div className="glass-panel p-4 rounded-lg flex items-center gap-4">
              <div className="flex flex-col">
                <span className="font-label-mono text-label-mono text-on-surface-variant text-xs uppercase">
                  System Status
                </span>
                <span className="font-label-mono text-label-mono text-tertiary">Aligned</span>
              </div>
              <div className="w-px h-8 bg-white/10"></div>
              <div className="flex flex-col">
                <span className="font-label-mono text-label-mono text-on-surface-variant text-xs uppercase">
                  Constant (A#)
                </span>
                <span className="font-headline-sm text-headline-sm text-monica-constant drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
                  1.618
                </span>
              </div>
            </div>
          </header>
          {/*  Grid Layout  */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full min-h-[600px]">
            {/*  Left Panel: Vault Selection (Target)  */}
            <div className="lg:col-span-3 flex flex-col gap-4">
              <h3 className="font-headline-sm text-headline-sm text-st-secondary border-b border-st-secondary/30 pb-2 flex items-center gap-2">
                <span aria-hidden="true" className="material-symbols-outlined" data-icon="target">
                  target
                </span>{' '}
                Target Entity
              </h3>
              <div className="glass-panel rounded-xl p-4 flex-1 overflow-y-auto space-y-3">
                {/*  Agent Card  */}
                <div className="p-3 rounded border border-white/5 bg-st-surface/50 hover:border-spirit-violet/50 cursor-pointer transition-colors group flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 group-hover:border-spirit-violet">
                    <img
                      alt="Agent Void"
                      className="w-full h-full object-cover"
                      data-alt="A portrait of a mysterious digital entity known as Void. The image is styled as a techno-occult tarot card, featuring a shadowy figure wrapped in nebulous, dark energy against a pitch-black background. Glowing runes in ethereal blue hover faintly around the face. The lighting is minimal, relying on the internal glow of the magical elements."
                      src="/stitch/stitch-0ea6a53b09.png"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-label-mono text-label-mono text-on-surface group-hover:text-spirit-violet transition-colors">
                      Moon in Pisces 29 Degree
                    </h4>
                    <p className="text-xs text-on-surface-variant font-label-mono">
                      Water • Mutable
                    </p>
                  </div>
                </div>
                {/*  Agent Card  */}
                <div className="p-3 rounded border border-spirit-violet/40 bg-surface-variant/40 cursor-pointer transition-colors flex items-center gap-3 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-spirit-violet/10 to-transparent"></div>
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-spirit-violet">
                    <img
                      alt="Agent Sol"
                      className="w-full h-full object-cover"
                      data-alt="A striking profile of a solar-themed digital entity. Rendered in a techno-occult aesthetic, the figure emanates a brilliant, blinding golden light from within, contrasting sharply with deep obsidian shadows. Sacred geometric patterns, specifically golden ratio spirals, are faintly etched into the surrounding space. The mood is powerful and radiant."
                      src="/stitch/stitch-16229f4e8f.png"
                    />
                  </div>
                  <div className="flex-1 relative z-10">
                    <h4 className="font-label-mono text-label-mono text-st-primary drop-shadow-[0_0_4px_rgba(168,85,247,0.5)]">
                      Sun in Leo 5 Degree
                    </h4>
                    <p className="text-xs text-st-secondary font-label-mono">Fire • Fixed</p>
                  </div>
                  <span
                    className="material-symbols-outlined text-spirit-violet absolute right-3 text-sm z-10"
                    data-icon="check_circle"
                  >
                    check_circle
                  </span>
                </div>
              </div>
            </div>
            {/*  Center: Synastry Mapper  */}
            <div className="lg:col-span-6 glass-panel rounded-2xl relative flex items-center justify-center min-h-[500px] overflow-hidden">
              {/*  Background Shader/Grid  */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              ></div>
              {/*  The Ring  */}
              <div className="w-[400px] h-[400px] rounded-full synastry-ring relative flex items-center justify-center">
                {/*  Center Core  */}
                <div className="w-16 h-16 rounded-full bg-obsidian-deep border-2 border-spirit-violet flex items-center justify-center z-20 shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                  <span
                    className="material-symbols-outlined text-st-primary"
                    data-icon="all_inclusive"
                  >
                    all_inclusive
                  </span>
                </div>
                {/*  Target Slot (Left)  */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-24 h-24 rounded-full border border-st-secondary bg-surface-container/80 flex flex-col items-center justify-center z-20 overflow-hidden shadow-[0_0_20px_rgba(255,224,131,0.2)] backdrop-blur-md">
                  <img
                    alt="Sun in Leo 5 Degree Selected"
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                    data-alt="A striking profile of a solar-themed digital entity. Rendered in a techno-occult aesthetic, the figure emanates a brilliant, blinding golden light from within, contrasting sharply with deep obsidian shadows. Sacred geometric patterns, specifically golden ratio spirals, are faintly etched into the surrounding space. The mood is powerful and radiant."
                    src="/stitch/stitch-89573da5de.png"
                  />
                  <span className="font-label-mono text-label-mono text-st-secondary z-10 font-bold bg-obsidian-deep/60 px-2 rounded">
                    Sun in Leo 5 Degree
                  </span>
                </div>
                {/*  Caster Slot (Right)  */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-24 h-24 rounded-full border border-tertiary bg-surface-container/80 flex flex-col items-center justify-center z-20 overflow-hidden shadow-[0_0_20px_rgba(78,222,163,0.2)] backdrop-blur-md">
                  <img
                    alt="Caster Entity"
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                    data-alt="A close-up of a cybernetic occult caster entity. The aesthetic is dark, featuring deep purples and greens against black. Intricate glowing circuitry mimics ancient astrological charts across the figure's metallic face. The lighting is harsh and directional, emphasizing the fusion of magic and cold technology. The mood is intense and calculating."
                    src="/stitch/stitch-5759fd74b7.png"
                  />
                  <span className="font-label-mono text-label-mono text-tertiary z-10 font-bold bg-obsidian-deep/60 px-2 rounded">
                    Mercury in Virgo 15 Degree
                  </span>
                </div>
                {/*  Aspect Lines (Simulated SVG)  */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-10"
                  viewBox="0 0 400 400"
                >
                  <line
                    className="opacity-50"
                    stroke="#A855F7"
                    strokeDasharray="4 4"
                    strokeWidth="2"
                    x1="50"
                    x2="350"
                    y1="200"
                    y2="200"
                  ></line>
                  <path
                    className="opacity-70"
                    d="M 50 200 Q 200 50 350 200"
                    fill="none"
                    stroke="#ffe083"
                    strokeWidth="1.5"
                  ></path>
                  <path
                    className="opacity-70"
                    d="M 50 200 Q 200 350 350 200"
                    fill="none"
                    stroke="#ffb4ab"
                    strokeWidth="1.5"
                  ></path>
                  {/*  Aspect Markers  */}
                  <circle cx="200" cy="125" fill="#ffe083" r="4"></circle>
                  <text
                    className="opacity-80"
                    fill="#ffe083"
                    fontFamily="JetBrains Mono"
                    fontSize="10"
                    textAnchor="middle"
                    x="200"
                    y="115"
                  >
                    Sun ☌ Pluto (0.5°)
                  </text>
                  <circle cx="200" cy="275" fill="#ffb4ab" r="4"></circle>
                  <text
                    className="opacity-80"
                    fill="#ffb4ab"
                    fontFamily="JetBrains Mono"
                    fontSize="10"
                    textAnchor="middle"
                    x="200"
                    y="295"
                  >
                    Moon □ Mars (2.1°)
                  </text>
                </svg>
              </div>
            </div>
            {/*  Right Panel: Astrometrics & Actions  */}
            <div className="lg:col-span-3 flex flex-col gap-6">
              <h3 className="font-headline-sm text-headline-sm text-tertiary border-b border-tertiary/30 pb-2 flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined"
                  data-icon="analytics"
                >
                  analytics
                </span>{' '}
                Astrometrics
              </h3>
              {/*  Stats Bento  */}
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-panel p-3 rounded flex flex-col justify-between h-24 border-l-2 border-l-st-secondary relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-st-secondary/5 to-transparent pointer-events-none"></div>
                  <span className="font-label-mono text-label-mono text-on-surface-variant text-xs">
                    Elemental
                  </span>
                  <div className="flex items-end justify-between">
                    <span className="font-label-mono text-label-mono font-bold text-st-secondary">
                      Fire v Earth
                    </span>
                    <span
                      className="material-symbols-outlined text-st-secondary text-lg"
                      data-icon="local_fire_department"
                    >
                      local_fire_department
                    </span>
                  </div>
                </div>
                <div className="glass-panel p-3 rounded flex flex-col justify-between h-24 border-l-2 border-l-error relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-error/5 to-transparent pointer-events-none"></div>
                  <span className="font-label-mono text-label-mono text-on-surface-variant text-xs">
                    Friction
                  </span>
                  <div className="flex items-end justify-between">
                    <span className="font-headline-sm text-headline-sm text-error">84.2%</span>
                    <span
                      className="material-symbols-outlined text-error text-lg"
                      data-icon="warning"
                    >
                      warning
                    </span>
                  </div>
                </div>
                <div className="glass-panel p-3 rounded col-span-2 flex flex-col justify-between h-24 border-l-2 border-l-spirit-violet relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-spirit-violet/5 to-transparent pointer-events-none"></div>
                  <span className="font-label-mono text-label-mono text-on-surface-variant text-xs">
                    Resonance Vector
                  </span>
                  <div className="flex items-end justify-between">
                    <span className="font-headline-sm text-headline-sm text-st-primary">
                      High Volatility
                    </span>
                    <div className="w-1/2 h-2 bg-st-surface rounded-full overflow-hidden">
                      <div className="h-full bg-spirit-violet w-3/4"></div>
                    </div>
                  </div>
                </div>
              </div>
              {/*  Action Button  */}
              <div className="mt-auto pt-4 border-t border-white/10">
                <button className="w-full py-4 bg-primary-container text-on-primary-container font-label-mono text-label-mono font-bold text-lg rounded-lg uppercase tracking-widest glow-button flex items-center justify-center gap-2 hover:bg-inverse-primary transition-all shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                  <span aria-hidden="true" className="material-symbols-outlined" data-icon="bolt">
                    bolt
                  </span>
                  Commence Jing Duel
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      {/*  Footer  */}
      <footer className="w-full mt-auto bg-surface-container-lowest/40 backdrop-blur-md border-t border-white/10 flat flex flex-col md:flex-row justify-between items-center p-gutter max-w-container-max mx-auto z-10 relative">
        <div className="font-headline-sm text-headline-sm text-monica-constant mb-4 md:mb-0">
          © 2124 Jing Arena. Quantified Mystery.
        </div>
        <nav className="flex gap-6 font-label-mono text-label-mono">
          <a
            className="text-tertiary font-bold hover:text-tertiary-fixed transition-opacity opacity-80 hover:opacity-100"
            href="#"
          >
            Sacred Geometry
          </a>
          <a
            className="text-on-surface-variant hover:text-tertiary-fixed transition-opacity opacity-80 hover:opacity-100"
            href="#"
          >
            Terms of Transmutation
          </a>
          <a
            className="text-on-surface-variant hover:text-tertiary-fixed transition-opacity opacity-80 hover:opacity-100"
            href="#"
          >
            Void Support
          </a>
        </nav>
      </footer>
    </div>
  )
}
