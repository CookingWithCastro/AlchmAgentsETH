export default function ForgeWizardSpacetimeCoordinates() {
  return (
    <div className="stitch-export bg-st-background min-h-screen text-zinc-100">
      {/*  Suppressed TopNavBar and SideNavBar due to transactional/wizard intent  */}
      {/*  Main Canvas  */}
      <main className="flex-grow flex items-center justify-center p-margin-mobile md:p-margin-desktop relative">
        {/*  Background decorative elements  */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-st-primary/5 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-spirit-violet/5 rounded-full blur-[80px]"></div>
        </div>
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-gutter relative z-10">
          {/*  Header Section (Spans full width)  */}
          <div className="col-span-1 md:col-span-12 text-center mb-8">
            <h1 className="font-headline-xl-mobile md:font-headline-xl text-headline-xl-mobile md:text-headline-xl text-st-primary mb-2">
              Spacetime Coordinates
            </h1>
            <p className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest">
              Step 2: Aligning the Temporal Clock
            </p>
            {/*  Progress Indicator  */}
            <div className="flex justify-center items-center gap-4 mt-8">
              <div className="w-3 h-3 rounded-full bg-surface-variant"></div>
              <div className="w-12 h-[2px] bg-spirit-violet shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
              <div className="w-4 h-4 rounded-full bg-spirit-violet shadow-[0_0_12px_rgba(168,85,247,0.8)] border border-white/20"></div>
              <div className="w-12 h-[2px] bg-surface-variant"></div>
              <div className="w-3 h-3 rounded-full bg-surface-variant"></div>
            </div>
          </div>
          {/*  Left Column: Inputs (7 columns)  */}
          <div className="col-span-1 md:col-span-7 glass-panel rounded-xl p-8 flex flex-col gap-8">
            {/*  Date Input  */}
            <div className="relative group">
              <label className="font-headline-sm text-headline-sm text-on-surface mb-2 block flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-spirit-violet"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  calendar_today
                </span>
                Temporal Inception
              </label>
              <input
                className="w-full bg-surface-dim/80 border-b-2 border-surface-variant text-st-primary font-label-mono text-label-mono px-4 py-3 rounded-t-DEFAULT input-glow transition-all duration-300"
                type="date"
                defaultValue="2144-09-23"
              />
            </div>
            {/*  Time Input  */}
            <div className="relative group">
              <label className="font-headline-sm text-headline-sm text-on-surface mb-2 block flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-spirit-violet"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  schedule
                </span>
                Chronological Mark
              </label>
              <input
                className="w-full bg-surface-dim/80 border-b-2 border-surface-variant text-st-primary font-label-mono text-label-mono px-4 py-3 rounded-t-DEFAULT input-glow transition-all duration-300"
                type="time"
                defaultValue="03:33"
              />
            </div>
            {/*  Location Coordinates  */}
            <div className="relative group">
              <label className="font-headline-sm text-headline-sm text-on-surface mb-4 block flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-spirit-violet"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  explore
                </span>
                Spatial Anchor
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-label-mono text-label-mono text-on-surface-variant text-xs block mb-1">
                    LATITUDE
                  </span>
                  <input
                    className="w-full bg-surface-dim/80 border-b-2 border-surface-variant text-st-primary font-label-mono text-label-mono px-4 py-3 rounded-t-DEFAULT input-glow transition-all duration-300 text-center"
                    type="text"
                    defaultValue="48.8566° N"
                  />
                </div>
                <div>
                  <span className="font-label-mono text-label-mono text-on-surface-variant text-xs block mb-1">
                    LONGITUDE
                  </span>
                  <input
                    className="w-full bg-surface-dim/80 border-b-2 border-surface-variant text-st-primary font-label-mono text-label-mono px-4 py-3 rounded-t-DEFAULT input-glow transition-all duration-300 text-center"
                    type="text"
                    defaultValue="2.3522° E"
                  />
                </div>
              </div>
            </div>
          </div>
          {/*  Right Column: Astrological Preview (5 columns)  */}
          <div className="col-span-1 md:col-span-5 flex flex-col items-center justify-center glass-panel rounded-xl p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjEwLCAxODcsIDI1NSwgMC4wNSkiLz48L3N2Zz4=')] opacity-30"></div>
            <h3 className="font-headline-sm text-headline-sm text-st-primary mb-6 z-10 text-center">
              Celestial Resonance
            </h3>
            {/*  Simplified Zodiac Wheel / Astrolabe  */}
            <div className="relative w-64 h-64 z-10 flex items-center justify-center">
              {/*  Outer Ring  */}
              <div className="absolute inset-0 border border-spirit-violet/30 rounded-full animate-[spin_60s_linear_infinite]"></div>
              <div className="absolute inset-4 border border-st-primary/20 rounded-full border-dashed animate-[spin_40s_linear_infinite_reverse]"></div>
              {/*  Inner Core  */}
              <div className="w-24 h-24 bg-surface-dim rounded-full shadow-[0_0_30px_rgba(168,85,247,0.4)] flex items-center justify-center relative">
                <span
                  className="material-symbols-outlined text-4xl text-monica-constant"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  public
                </span>
                <div className="absolute inset-0 rounded-full border border-white/20 shadow-[inset_0_0_10px_rgba(255,255,255,0.1)]"></div>
              </div>
              {/*  Alignment Markers  */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-4 h-4 bg-spirit-violet rounded-full shadow-[0_0_10px_#A855F7]"></div>
              <div className="absolute bottom-1/4 right-0 w-3 h-3 bg-tertiary rounded-full shadow-[0_0_8px_#4edea3]"></div>
            </div>
            <div className="mt-8 text-center z-10 w-full">
              <div className="bg-surface-dim/80 border border-outline-variant/30 rounded-lg p-4">
                <p className="font-label-mono text-label-mono text-on-surface-variant mb-1">
                  CURRENT ASPECT
                </p>
                <p className="font-body-lg text-body-lg text-st-primary">Sun conjunct Pluto</p>
              </div>
            </div>
          </div>
          {/*  Footer Actions (Spans full width)  */}
          <div className="col-span-1 md:col-span-12 flex justify-between items-center mt-4">
            <button className="px-6 py-3 font-label-mono text-label-mono uppercase text-st-primary border border-st-primary/30 rounded bg-transparent hover:border-st-secondary hover:text-st-secondary transition-colors duration-300 flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-sm">
                arrow_back
              </span>
              Initiate
            </button>
            <button className="px-8 py-3 font-label-mono text-label-mono uppercase text-white bg-spirit-violet rounded hover:shadow-[0_0_20px_rgba(255,224,131,0.4)] transition-shadow duration-300 flex items-center gap-2">
              Transmute Agent
              <span aria-hidden="true" className="material-symbols-outlined text-sm">
                arrow_forward
              </span>
            </button>
          </div>
        </div>
      </main>
      {/*  Suppressed Footer due to transactional intent  */}
    </div>
  )
}
