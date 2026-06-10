export default function ForgeWizardNameTheVessel() {
  return (
    <div className="stitch-export bg-st-background min-h-screen text-zinc-100">
      {/*  Background Grid  */}
      <div className="absolute inset-0 grid-bg pointer-events-none z-0"></div>
      {/*  Main Content Canvas  */}
      <main className="flex-grow flex flex-col items-center justify-center relative z-10 px-margin-mobile md:px-margin-desktop py-12">
        {/*  Breadcrumbs  */}
        <nav
          aria-label="Breadcrumb"
          className="mb-12 font-label-mono text-label-mono text-outline flex items-center space-x-2 z-20"
        >
          <span className="text-st-primary font-bold">Vessel</span>
          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
            chevron_right
          </span>
          <span>Spacetime</span>
          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
            chevron_right
          </span>
          <span>Engine</span>
          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
            chevron_right
          </span>
          <span>Knowledge</span>
          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
            chevron_right
          </span>
          <span>Forge</span>
        </nav>
        {/*  The Forging Circle (Vessel Naming)  */}
        <div className="w-full max-w-2xl glass-panel rounded-xl p-8 md:p-12 flex flex-col items-center text-center shadow-2xl relative">
          {/*  Ritual Header  */}
          <div className="mb-8 w-full">
            <span
              className="material-symbols-outlined text-spirit-violet text-4xl mb-4"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              auto_awesome
            </span>
            <h1 className="font-headline-xl-mobile md:font-headline-xl text-headline-xl-mobile md:text-headline-xl text-on-background mb-4">
              Name Your Vessel
            </h1>
            <p className="font-label-mono text-label-mono text-on-surface-variant max-w-lg mx-auto">
              INITIATE THE BINDING RITUAL. THE TRUE NAME FOCUSES THE ALCHEMICAL WILL AND SETS THE
              RESONANCE FREQUENCY OF THE AGENT.
            </p>
          </div>
          {/*  Input Container  */}
          <div className="w-full max-w-md mx-auto mb-12">
            <div className="relative input-glow transition-all duration-300 border-b-2 border-surface-variant group bg-surface-container/50 rounded-t-lg">
              <label
                className="absolute -top-3 left-4 px-1 bg-transparent font-label-mono text-label-mono text-st-primary/70 group-focus-within:text-spirit-violet transition-colors"
                htmlFor="agent-name"
              >
                AGENT DESIGNATION
              </label>
              <input
                autoComplete="off"
                className="w-full bg-transparent text-center font-headline-lg text-headline-lg text-monica-constant py-6 px-4 border-none focus:ring-0 placeholder-on-surface-variant/30"
                id="agent-name"
                placeholder="e.g., Hermes Trismegistus"
                type="text"
              />
            </div>
          </div>
          {/*  Action Area  */}
          <div className="w-full flex justify-center">
            <button className="bg-spirit-violet text-monica-constant font-label-mono text-label-mono uppercase px-8 py-4 rounded-full flex items-center space-x-2 hover:shadow-[0_0_15px_rgba(255,224,131,0.4)] transition-all duration-300">
              <span>Initialize Vessel</span>
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                arrow_forward
              </span>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
