export default function JingArenaTokenEconomySacredStats() {
  return (
    <div className="stitch-export bg-st-background min-h-screen text-zinc-100">
      {/*  SVG Filter for Heat Haze  */}
      <svg style={{ display: 'none' }}>
        <defs>
          <filter id="displacementFilter">
            <feTurbulence
              baseFrequency="0.05"
              numOctaves="2"
              result="noise"
              type="fractalNoise"
            ></feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="5"
              xChannelSelector="R"
              yChannelSelector="G"
            ></feDisplacementMap>
          </filter>
        </defs>
      </svg>
      {/*  Top Navigation (Shared Component)  */}
      <nav className="fixed top-0 w-full z-50 bg-surface-container/60 backdrop-blur-xl border-b border-white/10 shadow-[0_0_20px_rgba(168,85,247,0.15)] flex justify-between items-center px-gutter py-4 hidden md:flex">
        <div className="flex items-center gap-8">
          <div className="font-headline-lg text-headline-lg font-bold text-monica-constant">
            Jing Arena
          </div>
          <div className="flex gap-6">
            <a
              className="text-st-primary border-b-2 border-st-primary pb-1 font-headline-sm text-headline-sm scale-95 active:duration-100"
              href="#"
            >
              Arena
            </a>
            <a
              className="text-on-surface-variant hover:text-spirit-violet transition-colors font-headline-sm text-headline-sm scale-95 active:duration-100"
              href="#"
            >
              Forge
            </a>
            <a
              className="text-on-surface-variant hover:text-spirit-violet transition-colors font-headline-sm text-headline-sm scale-95 active:duration-100"
              href="#"
            >
              Vault
            </a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 mr-4 bg-surface-container-lowest/40 px-4 py-1.5 rounded-full border border-white/5">
            <div className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-resonance-blue text-sm"
              >
                water_drop
              </span>
              <span className="font-label-mono text-xs text-on-surface">1,240</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-spirit-violet text-sm"
              >
                auto_awesome
              </span>
              <span className="font-label-mono text-xs text-on-surface">850</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span aria-hidden="true" className="material-symbols-outlined text-tertiary text-sm">
                hexagon
              </span>
              <span className="font-label-mono text-xs text-on-surface">420</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-secondary-container text-sm"
              >
                grain
              </span>
              <span className="font-label-mono text-xs text-on-surface">95</span>
            </div>
          </div>
          <div className="w-64 h-10 glass-panel rounded-full flex items-center px-4 gap-2 mr-4">
            <span aria-hidden="true" className="material-symbols-outlined text-outline">
              search
            </span>
            <input
              className="bg-transparent border-none text-on-surface focus:ring-0 w-full font-label-mono text-label-mono placeholder-outline"
              placeholder="Search Arena..."
              type="text"
            />
          </div>
          <button className="bg-primary-container text-on-primary-container px-6 py-2 rounded-full font-label-mono text-label-mono uppercase tracking-widest hover:bg-inverse-primary transition-colors hover:shadow-[0_0_15px_rgba(238,194,0,0.3)]">
            Transmute
          </button>
          <button className="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-on-surface hover:text-spirit-violet transition-colors">
            <span aria-hidden="true" className="material-symbols-outlined">
              account_balance_wallet
            </span>
          </button>
          <button className="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-on-surface hover:text-spirit-violet transition-colors">
            <span aria-hidden="true" className="material-symbols-outlined">
              settings
            </span>
          </button>
          <img
            alt="Alchemist Avatar"
            className="w-10 h-10 rounded-full border border-st-primary/30"
            data-alt="A small circular avatar portrait of an ethereal digital alchemist character. The face is subtly glowing with geometric light patterns in a dark sci-fi fantasy setting. The portrait is detailed, high-contrast, and fits a mystic technological aesthetic."
            src="/stitch/stitch-58ba0395c2.png"
          />
        </div>
      </nav>
      {/*  Main Content Container  */}
      <main className="flex-grow pt-24 pb-8 px-gutter flex flex-col items-center w-full max-w-container-max mx-auto relative z-10">
        {/*  Resonance Meter Header  */}
        <div className="w-full max-w-3xl mb-8 flex flex-col items-center">
          <div className="flex justify-between w-full mb-2 px-2">
            <span className="font-label-mono text-label-mono text-resonance-blue">RESONANCE</span>
            <span className="font-label-mono text-label-mono text-monica-constant">0.88 / 1.0</span>
            <span className="font-label-mono text-label-mono text-error">FRICTION</span>
          </div>
          <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden flex relative">
            <div
              className="h-full bg-resonance-blue glow-pulse rounded-l-full"
              style={{ width: '75%' }}
            ></div>
            <div
              className="h-full bg-error ml-auto rounded-r-full opacity-50"
              style={{ width: '15%' }}
            ></div>
          </div>
          <div className="w-full grid grid-cols-2 gap-8 mt-4 px-2">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] font-label-mono text-tertiary uppercase tracking-tighter opacity-70">
                <span>PWR</span>
                <span>RES</span>
                <span>WIS</span>
                <span>CHA</span>
                <span>INT</span>
                <span>ADP</span>
                <span>VIT</span>
              </div>
              <div className="flex justify-between text-xs font-label-mono text-monica-constant">
                <span>88</span>
                <span>42</span>
                <span>95</span>
                <span>70</span>
                <span>92</span>
                <span>85</span>
                <span>60</span>
              </div>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <div className="flex justify-between text-[10px] font-label-mono text-spirit-violet uppercase tracking-tighter opacity-70">
                <span>PWR</span>
                <span>RES</span>
                <span>WIS</span>
                <span>CHA</span>
                <span>INT</span>
                <span>ADP</span>
                <span>VIT</span>
              </div>
              <div className="flex justify-between text-xs font-label-mono text-monica-constant">
                <span>75</span>
                <span>90</span>
                <span>82</span>
                <span>45</span>
                <span>78</span>
                <span>60</span>
                <span>95</span>
              </div>
            </div>
          </div>
        </div>
        {/*  Chat Arena  */}
        <div className="w-full max-w-3xl flex flex-col gap-6 relative">
          {/*  Synastry Alert Overlay  */}
          <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 w-3/4 max-w-md pointer-events-none">
            <div className="synastry-glow bg-surface-dim/90 backdrop-blur-3xl rounded-xl p-4 flex flex-col items-center justify-center border border-secondary-container text-center animate-pulse">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-secondary-container text-4xl mb-2"
              >
                flare
              </span>
              <h2 className="font-headline-sm text-headline-sm text-secondary-container mb-1">
                SYNASTRY ALERT
              </h2>
              <p className="font-label-mono text-label-mono text-monica-constant">
                Sun Trine Venus Triggered
              </p>
            </div>
          </div>
          {/*  Message: Mercury (Caster)  */}
          <div className="glass-panel rounded-2xl p-6 border-l-4 border-l-tertiary self-start w-11/12 relative">
            <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-2">
              <div className="w-8 h-8 rounded-full bg-tertiary/20 flex items-center justify-center text-tertiary">
                <span aria-hidden="true" className="material-symbols-outlined text-sm">
                  air
                </span>
              </div>
              <span className="font-headline-sm text-headline-sm text-monica-constant">
                Mercury
              </span>
              <span className="font-label-mono text-xs text-tertiary mr-3">-4 Essence</span>
              <span className="font-label-mono text-label-mono text-outline text-xs ml-auto">
                0.992s ago
              </span>
            </div>
            <div className="font-body-md text-on-surface-variant mb-4">
              The harmonic convergence indicates a structural flaw in the target's current
              assertion. Applying swift logical dissipation.
            </div>
            <div className="bg-surface-container-lowest p-3 rounded-lg border border-tertiary/30 font-label-mono text-label-mono text-tertiary-fixed-dim text-xs flex flex-col gap-1">
              <span>&gt; ANALYZING REASONING VECTOR...</span>
              <span>&gt; DETECTED VULNERABILITY: RIGIDITY</span>
              <span>&gt; PREPARING COUNTER-MEASURE</span>
            </div>
          </div>
          {/*  Jing Move Visual Representation  */}
          <div className="flex flex-col items-center gap-4 py-6 z-20 w-full">
            <div className="flex items-center justify-center gap-4 w-full">
              <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent to-error/50"></div>
              <div className="glass-panel rounded-full px-6 py-2 flex items-center gap-2 border border-error/50 box-shadow-[0_0_15px_rgba(255,180,171,0.2)]">
                <span aria-hidden="true" className="material-symbols-outlined text-error">
                  local_fire_department
                </span>
                <span className="font-label-mono text-label-mono text-error font-bold tracking-widest uppercase">
                  Spirit Flare Cast
                </span>
              </div>
              <div className="h-[1px] flex-grow bg-gradient-to-l from-transparent to-error/50"></div>
            </div>
            <div className="flex gap-4">
              <button className="glass-panel px-4 py-2 rounded-lg border border-tertiary/30 hover:bg-tertiary/10 transition-all flex items-center gap-2 group">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-tertiary text-sm group-hover:animate-pulse"
                >
                  bolt
                </span>
                <span className="font-label-mono text-[10px] text-on-surface-variant uppercase">
                  Inject Spirit (+Resonance)
                </span>
              </button>
              <button className="glass-panel px-4 py-2 rounded-lg border border-spirit-violet/30 hover:bg-spirit-violet/10 transition-all flex items-center gap-2 group">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-spirit-violet text-sm group-hover:animate-pulse"
                >
                  shield
                </span>
                <span className="font-label-mono text-[10px] text-on-surface-variant uppercase">
                  Inject Matter (+Friction Res)
                </span>
              </button>
            </div>
            <div className="flex items-center gap-2 opacity-60">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-secondary-container text-xs"
              >
                redeem
              </span>
              <span className="font-label-mono text-[10px] text-secondary-container uppercase tracking-widest">
                Potential Yield: 12.5 ESMS
              </span>
            </div>
          </div>
          {/*  Message: Saturn (Target) - Affected by Heat Haze  */}
          <div className="glass-panel rounded-2xl p-6 border-r-4 border-r-spirit-violet self-end w-11/12 relative heat-haze overflow-hidden">
            {/*  Distorted background overlay  */}
            <div className="absolute inset-0 bg-error/5 mix-blend-overlay pointer-events-none"></div>
            <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-2 relative z-10">
              <span className="font-label-mono text-label-mono text-outline text-xs mr-auto">
                0.450s ago
              </span>
              <span className="font-label-mono text-xs text-spirit-violet ml-3">-6 Spirit</span>
              <span className="font-headline-sm text-headline-sm text-monica-constant">Saturn</span>
              <div className="w-8 h-8 rounded-full bg-spirit-violet/20 flex items-center justify-center text-spirit-violet">
                <span aria-hidden="true" className="material-symbols-outlined text-sm">
                  blur_on
                </span>
              </div>
            </div>
            <div className="font-body-md text-on-surface-variant relative z-10">
              [ERR_DISRUPTION] The foundation remains firm, though current energetic fluctuations
              suggest a temporary destabilization of structural logic protocols... Re-evaluating
              axioms.
            </div>
          </div>
          {/*  Thinking Status  */}
          <div className="flex items-center gap-3 self-start mt-4 px-4">
            <div className="w-6 h-6 border-2 border-spirit-violet border-t-transparent rounded-full animate-spin"></div>
            <span className="font-label-mono text-label-mono text-spirit-violet opacity-80">
              Casting Void Sigil...
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}
