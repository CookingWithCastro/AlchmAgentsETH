export default function AlchemicalLabsTransmutedRecord() {
  return (
    <div className="stitch-export bg-st-background min-h-screen text-zinc-100">
      {/*  Top Navigation Placeholder (Hidden for this specific isolated component view, but structural flex maintains layout)  */}
      <header className="w-full flex-none h-20"></header>
      <main className="flex-grow flex items-center justify-center p-gutter md:p-margin-desktop relative z-10">
        {/*  Main Transmuted Record Container  */}
        <article className="glass-panel w-full max-w-5xl rounded-xl overflow-hidden shadow-[0_0_40px_rgba(168,85,247,0.1)] flex flex-col md:flex-row border-t border-t-spirit-violet/20">
          {/*  Left Column: Synthesized Identity & Resolution  */}
          <section className="w-full md:w-5/12 p-8 border-b md:border-b-0 md:border-r border-white/5 flex flex-col relative">
            {/*  Decorative Top Left Corner  */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-primary-fixed-dim/30"></div>
            <header className="mb-8">
              <p className="font-label-mono text-label-mono text-primary-fixed-dim mb-2 uppercase tracking-widest">
                Transmuted Record
              </p>
              <h1 className="font-headline-lg text-headline-lg text-monica-constant mb-1">
                Saturn in Capricorn 26 Degree
              </h1>
              <p className="font-label-mono text-label-mono text-on-surface-variant opacity-80">
                Designation: <span className="text-tertiary">#AE-77B</span>
              </p>
            </header>
            {/*  Duel Resolution Frame  */}
            <div className="flex-grow flex flex-col justify-center mb-8">
              <div className="relative p-6 rounded-lg bg-surface-container-low/50 border border-white/5 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-obsidian-deep px-3 font-label-mono text-xs text-st-secondary tracking-widest border border-white/10 rounded">
                  MASTER DIRECTIVE
                </div>
                <p className="font-body-lg text-body-lg text-on-surface text-center italic mt-4 mb-2">
                  "To assimilate chaos into perfect geometric order, sacrificing raw emotion for
                  absolute structural integrity."
                </p>
              </div>
            </div>
            {/*  Monica Constant (A#)  */}
            <div className="mt-auto bg-surface-container/40 p-4 rounded-lg flex items-center justify-between border border-primary-container/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
              <div>
                <p className="font-label-mono text-xs text-on-surface-variant uppercase">
                  Monica Constant (A#)
                </p>
                <p className="font-headline-sm text-headline-sm text-monica-constant drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
                  0.8924
                </p>
              </div>
              <span
                className="material-symbols-outlined text-4xl text-st-primary"
                data-icon="waves"
                data-weight="fill"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                waves
              </span>
            </div>
          </section>
          {/*  Right Column: Analytics & Actions  */}
          <section className="w-full md:w-7/12 p-8 flex flex-col bg-surface-dim/30 relative">
            {/*  Decorative Bottom Right Corner  */}
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-primary-fixed-dim/30"></div>
            {/*  Synastry Core (Stats)  */}
            <div className="mb-10">
              <h2 className="font-label-mono text-label-mono text-primary-fixed-dim mb-4 uppercase flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-sm"
                  data-icon="hub"
                >
                  hub
                </span>{' '}
                Synastry Core
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/*  Stat Chip  */}
                <div className="bg-surface-container-lowest/50 p-3 rounded border border-white/5 flex flex-col relative overflow-hidden group hover:border-resonance-blue/30 transition-colors">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-resonance-blue/10 rounded-bl-full -mr-2 -mt-2"></div>
                  <span className="font-label-mono text-xs text-on-surface-variant mb-1">
                    Resonance
                  </span>
                  <span className="font-headline-sm text-headline-sm text-resonance-blue">94%</span>
                </div>
                {/*  Stat Chip  */}
                <div className="bg-surface-container-lowest/50 p-3 rounded border border-white/5 flex flex-col relative overflow-hidden group hover:border-tertiary/30 transition-colors">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-tertiary/10 rounded-bl-full -mr-2 -mt-2"></div>
                  <span className="font-label-mono text-xs text-on-surface-variant mb-1">
                    Cohesion
                  </span>
                  <span className="font-headline-sm text-headline-sm text-tertiary">88%</span>
                </div>
                {/*  Stat Chip  */}
                <div className="bg-surface-container-lowest/50 p-3 rounded border border-white/5 flex flex-col relative overflow-hidden group hover:border-st-secondary/30 transition-colors">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-st-secondary/10 rounded-bl-full -mr-2 -mt-2"></div>
                  <span className="font-label-mono text-xs text-on-surface-variant mb-1">
                    Volatility
                  </span>
                  <span className="font-headline-sm text-headline-sm text-st-secondary">12%</span>
                </div>
                {/*  Stat Chip  */}
                <div className="bg-surface-container-lowest/50 p-3 rounded border border-white/5 flex flex-col relative overflow-hidden group hover:border-error/30 transition-colors">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-error/10 rounded-bl-full -mr-2 -mt-2"></div>
                  <span className="font-label-mono text-xs text-on-surface-variant mb-1">
                    Entropy
                  </span>
                  <span className="font-headline-sm text-headline-sm text-error">4%</span>
                </div>
              </div>
            </div>
            {/*  Jing Log (Moves)  */}
            <div className="flex-grow mb-10">
              <h2 className="font-label-mono text-label-mono text-primary-fixed-dim mb-4 uppercase flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-sm"
                  data-icon="history"
                >
                  history
                </span>{' '}
                Transmutation Log
              </h2>
              <ul className="space-y-3">
                <li className="flex items-center justify-between text-sm py-2 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center text-st-primary border border-st-primary/20">
                      <span
                        className="material-symbols-outlined text-[14px]"
                        data-icon="water_drop"
                      >
                        water_drop
                      </span>
                    </div>
                    <span className="font-body-md text-on-surface">Aqueous Dissolution</span>
                  </div>
                  <span className="font-label-mono text-xs text-tertiary">+12 Res</span>
                </li>
                <li className="flex items-center justify-between text-sm py-2 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center text-error border border-error/20">
                      <span
                        className="material-symbols-outlined text-[14px]"
                        data-icon="local_fire_department"
                      >
                        local_fire_department
                      </span>
                    </div>
                    <span className="font-body-md text-on-surface">Ignited Catalyst</span>
                  </div>
                  <span className="font-label-mono text-xs text-st-secondary">+8 Vol</span>
                </li>
                <li className="flex items-center justify-between text-sm py-2 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant border border-white/10">
                      <span
                        className="material-symbols-outlined text-[14px]"
                        data-icon="filter_center_focus"
                      >
                        filter_center_focus
                      </span>
                    </div>
                    <span className="font-body-md text-on-surface">Void Convergence</span>
                  </div>
                  <span className="font-label-mono text-xs text-monica-constant">FINAL</span>
                </li>
              </ul>
            </div>
            {/*  Action Buttons  */}
            <div className="flex flex-col sm:flex-row gap-4 mt-auto">
              <button className="flex-1 bg-transparent border border-spirit-violet/50 text-on-surface font-label-mono py-3 px-4 rounded transition-all duration-300 hover:border-st-secondary hover:text-st-secondary gold-glow flex items-center justify-center gap-2">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-sm"
                  data-icon="inventory_2"
                >
                  inventory_2
                </span>{' '}
                Archive to Labs
              </button>
              <button className="flex-1 bg-spirit-violet text-obsidian-deep font-label-mono uppercase tracking-wider font-bold py-3 px-4 rounded transition-all duration-300 hover:bg-primary-fixed shadow-[0_0_20px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-sm"
                  data-icon="auto_fix_high"
                >
                  auto_fix_high
                </span>{' '}
                Synthesize Agent
              </button>
            </div>
          </section>
        </article>
      </main>
    </div>
  )
}
