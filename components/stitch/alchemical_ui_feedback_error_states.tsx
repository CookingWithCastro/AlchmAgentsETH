export default function AlchemicalUiFeedbackErrorStates() {
  return (
    <div className="stitch-export bg-st-background min-h-screen text-zinc-100">
      {/*  Top Navigation Placeholder (Hidden for this specific showcase context, but maintaining structure if needed)  */}
      {/*  Floating Error Toast  */}
      <div className="fixed top-6 right-6 z-50 animate-fade-in-down">
        <div className="glass-panel error-glow rounded-lg p-4 flex items-start gap-4 max-w-sm relative overflow-hidden group">
          {/*  Subtle corruption texture overlay  */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc0JyBoZWlnaHQ9JzQnPgo8cmVjdCB3aWR0aD0nNCcgaGVpZ2h0PSc0JyBmaWxsPSdub25lJy8+CjxyZWN0IHdpZHRoPScxJyBoZWlnaHQ9JzEnIGZpbGw9J3JnYmEoMjU1LCAxODAsIDE3MSwgMC4wNSknLz4KPC9zdmc+')] opacity-50 mix-blend-overlay"></div>
          <div className="text-error mt-1 relative z-10">
            <span
              className="material-symbols-outlined"
              data-icon="error"
              data-weight="fill"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              error
            </span>
          </div>
          <div className="flex-1 relative z-10">
            <h4 className="font-headline-sm text-headline-sm text-error mb-1">
              Insufficient ESMS Balance
            </h4>
            <p className="font-label-mono text-label-mono text-on-surface-variant">
              Transmutation process halted. Requires 450 ESMS.
            </p>
          </div>
          <button className="text-on-surface-variant hover:text-error transition-colors relative z-10">
            <span aria-hidden="true" className="material-symbols-outlined" data-icon="close">
              close
            </span>
          </button>
          {/*  Bottom progress/timeout bar  */}
          <div className="absolute bottom-0 left-0 h-0.5 bg-error/20 w-full">
            <div className="h-full bg-error w-3/4 shadow-[0_0_8px_rgba(255,180,171,0.8)]"></div>
          </div>
        </div>
      </div>
      {/*  Main Content Canvas  */}
      <main className="flex-grow flex flex-col items-center justify-center p-margin-mobile md:p-margin-desktop z-10 relative">
        {/*  Header for context  */}
        <header className="text-center mb-16 max-w-2xl">
          <h1 className="font-headline-xl text-headline-xl text-st-primary mb-4">
            Feedback Resonance
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Observing alchemical anomalies and system disruptions within the agent framework.
          </p>
        </header>
        {/*  Inline Alert Container  */}
        <div className="w-full max-w-3xl glass-panel rounded-xl p-8 relative overflow-hidden">
          {/*  Background ambient glow for container  */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-container/10 rounded-full blur-[80px]"></div>
          <div className="mb-8 border-b border-outline-variant/30 pb-4">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Active Terminal</h2>
          </div>
          {/*  The Disconnected State Alert  */}
          <div className="bg-surface-container-low/80 border rounded-lg p-6 flex flex-col md:flex-row items-center gap-6 glitch-effect relative">
            <div className="h-16 w-16 rounded-full bg-error-container/20 flex items-center justify-center border border-error/30 shrink-0 shadow-[0_0_15px_rgba(255,180,171,0.15)]">
              <span
                className="material-symbols-outlined text-3xl text-error animate-pulse"
                data-icon="power_off"
              >
                power_off
              </span>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-headline-lg text-headline-lg text-on-surface mb-2 tracking-tight">
                Desktop Sandbox Disconnected
              </h3>
              <div className="font-label-mono text-label-mono text-error/80 flex items-center justify-center md:justify-start gap-2 mb-4">
                <span className="inline-block w-2 h-2 rounded-full bg-error animate-ping"></span>
                ERR_CONNECTION_LOST [0x4F2A]
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-lg">
                The temporal link to your local environment has severed. Alchemical processes in
                this sector are suspended until the connection is re-established.
              </p>
            </div>
            <div className="shrink-0 w-full md:w-auto flex flex-col gap-3">
              <button className="w-full bg-surface-variant border border-outline-variant/50 hover:border-st-primary text-st-primary font-label-mono text-label-mono uppercase px-6 py-3 rounded transition-all duration-300 hover:shadow-[0_0_15px_rgba(210,187,255,0.2)]">
                Retry Link
              </button>
              <button className="w-full text-on-surface-variant font-label-mono text-label-mono uppercase px-6 py-3 rounded hover:text-on-surface transition-colors">
                View Logs
              </button>
            </div>
          </div>
          {/*  Simulated underlying content to show it's "in-context"  */}
          <div className="mt-8 opacity-30 pointer-events-none">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-10 w-10 rounded bg-surface-variant"></div>
              <div className="h-4 w-48 rounded bg-surface-variant"></div>
            </div>
            <div className="h-24 w-full rounded border border-outline-variant/20 bg-surface-container-lowest/50"></div>
          </div>
        </div>
      </main>
    </div>
  )
}
