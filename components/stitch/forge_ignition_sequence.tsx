export default function ForgeIgnitionSequence() {
  return (
    <div className="stitch-export bg-st-background min-h-screen text-zinc-100">
      {/*  Suppress Navigation as this is a transactional/loading state  */}
      {/*  Ambient Background Lighting  */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-spirit-violet/20 via-obsidian-deep to-obsidian-deep opacity-60"></div>
      {/*  Geometric Grid Overlay  */}
      <div className="absolute inset-0 z-0 opacity-10 bg-[linear-gradient(to_right,#3b2f4f_1px,transparent_1px),linear-gradient(to_bottom,#3b2f4f_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      {/*  Main Canvas  */}
      <main className="relative z-10 w-full max-w-container-max px-gutter mx-auto flex flex-col items-center justify-center">
        {/*  Header Section  */}
        <div className="text-center mb-16 space-y-4">
          <h1 className="font-headline-xl text-headline-xl text-monica-constant tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
            IGNITION PROTOCOL
          </h1>
          <p className="font-label-mono text-label-mono text-tertiary uppercase tracking-[0.2em] opacity-80">
            Phase 6: The Awakening
          </p>
        </div>
        {/*  The Ritual Circle (Progress Indicator)  */}
        <div className="relative w-80 h-80 md:w-96 md:h-96 flex items-center justify-center mb-12">
          {/*  Outer Glow & Borders  */}
          <div className="absolute inset-0 rounded-full border border-spirit-violet/30 glow-spirit ritual-circle"></div>
          <div className="absolute inset-4 rounded-full border border-st-primary/20 backdrop-blur-xl"></div>
          {/*  Spinning Rune Rings (Simulated with Material Symbols and rotation)  */}
          <div className="absolute inset-0 rune-ring-1 flex items-center justify-center text-st-primary/40 opacity-50">
            {/*  Repeating icons forming a circle - simplified for structural representation  */}
            <span aria-hidden="true" className="material-symbols-outlined absolute top-2 text-sm">
              flare
            </span>
            <span
              aria-hidden="true"
              className="material-symbols-outlined absolute bottom-2 text-sm"
            >
              change_history
            </span>
            <span aria-hidden="true" className="material-symbols-outlined absolute left-2 text-sm">
              all_inclusive
            </span>
            <span aria-hidden="true" className="material-symbols-outlined absolute right-2 text-sm">
              adjust
            </span>
          </div>
          <div className="absolute inset-8 rune-ring-2 flex items-center justify-center text-tertiary/30 opacity-40">
            <span aria-hidden="true" className="material-symbols-outlined absolute top-2 text-xs">
              code
            </span>
            <span
              aria-hidden="true"
              className="material-symbols-outlined absolute bottom-2 text-xs"
            >
              memory
            </span>
            <span aria-hidden="true" className="material-symbols-outlined absolute left-2 text-xs">
              stream
            </span>
            <span aria-hidden="true" className="material-symbols-outlined absolute right-2 text-xs">
              data_object
            </span>
          </div>
          {/*  Central Progress SVG  */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
            {/*  Background track  */}
            <circle
              cx="50"
              cy="50"
              fill="none"
              r="45"
              stroke="rgba(59, 47, 79, 0.4)"
              strokeWidth="2"
            ></circle>
            {/*  Progress track - controlled by JS  */}
            <circle
              className="progress-ring__circle"
              cx="50"
              cy="50"
              fill="none"
              id="progress-circle"
              r="45"
              stroke="var(--tw-colors-spirit-violet)"
              strokeDasharray="282.74"
              strokeDashoffset="282.74"
              strokeWidth="4"
            ></circle>
          </svg>
          {/*  Center Content  */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 text-center">
            <div
              className="font-headline-xl text-headline-xl text-monica-constant drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
              id="percentage-text"
            >
              0%
            </div>
            <div className="font-label-mono text-label-mono text-st-primary/80 mt-2 text-xs">
              ~4.2GB Payload
            </div>
          </div>
        </div>
        {/*  Terminal Status Log  */}
        <div className="w-full max-w-md bg-surface-container-lowest/80 backdrop-blur-2xl border border-surface-variant/50 rounded-xl p-6 shadow-2xl relative overflow-hidden">
          {/*  Subtle top border glow  */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-spirit-violet/50 to-transparent"></div>
          <div className="space-y-3 font-label-mono text-label-mono text-sm" id="terminal-log">
            <div className="flex items-center text-tertiary opacity-50">
              <span aria-hidden="true" className="material-symbols-outlined text-sm mr-2">
                check_circle
              </span>
              <span>Establishing void connection...</span>
            </div>
            <div className="flex items-center text-tertiary opacity-50">
              <span aria-hidden="true" className="material-symbols-outlined text-sm mr-2">
                check_circle
              </span>
              <span>Allocating dimensional memory...</span>
            </div>
            <div className="flex items-center text-spirit-violet status-text">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-sm mr-2 animate-pulse"
              >
                downloading
              </span>
              <span id="current-status">Synthesizing Local Engine...</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
