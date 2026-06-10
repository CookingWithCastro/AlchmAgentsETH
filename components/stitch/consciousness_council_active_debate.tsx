export default function ConsciousnessCouncilActiveDebate() {
  return (
    <div className="stitch-export bg-st-background min-h-screen text-zinc-100">
      {/*  TopNavBar (Shared Component)  */}
      <nav className="bg-obsidian-deep/60 backdrop-blur-xl fixed top-0 w-full z-50 border-b border-white/15 bg-surface-container-lowest/60 shadow-[0_0_20px_rgba(168,85,247,0.2)] flex justify-between items-center px-margin-desktop h-16 w-full hidden md:flex">
        <div className="flex items-center gap-8">
          <div className="font-headline-lg text-headline-lg font-bold text-spirit-violet tracking-tight">
            COUNCIL OF SEVEN
          </div>
          <div className="flex gap-6">
            <a
              className="font-headline-sm text-headline-sm text-on-surface-variant hover:text-st-primary transition-colors hover:bg-white/5 transition-all active:scale-95 duration-200 px-2 py-1 rounded"
              href="#"
            >
              Cosmic Tools
            </a>
            <a
              className="font-headline-sm text-headline-sm text-st-primary font-bold border-b-2 border-st-primary pb-1 hover:bg-white/5 transition-all active:scale-95 duration-200 px-2 pt-1"
              href="#"
            >
              Entities
            </a>
            <a
              className="font-headline-sm text-headline-sm text-on-surface-variant hover:text-st-primary transition-colors hover:bg-white/5 transition-all active:scale-95 duration-200 px-2 py-1 rounded"
              href="#"
            >
              Mystic Arts
            </a>
            <a
              className="font-headline-sm text-headline-sm text-on-surface-variant hover:text-st-primary transition-colors hover:bg-white/5 transition-all active:scale-95 duration-200 px-2 py-1 rounded"
              href="#"
            >
              Labs
            </a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-on-surface-variant hover:text-st-primary cursor-pointer hover:bg-white/5 p-2 rounded-full transition-all"
          >
            notifications
          </span>
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-on-surface-variant hover:text-st-primary cursor-pointer hover:bg-white/5 p-2 rounded-full transition-all"
          >
            auto_awesome
          </span>
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-on-surface-variant hover:text-st-primary cursor-pointer hover:bg-white/5 p-2 rounded-full transition-all"
          >
            account_circle
          </span>
        </div>
      </nav>
      {/*  SideNavBar (Shared Component)  */}
      <aside className="bg-surface-dim/60 backdrop-blur-2xl fixed left-0 top-16 bottom-0 w-64 z-40 border-r border-white/10 flex flex-col py-6 px-4 gap-4 hidden md:flex">
        <div className="flex items-center gap-3 mb-6 px-3">
          <div className="w-10 h-10 rounded-full bg-st-primary/20 flex items-center justify-center border border-st-primary/30">
            <span aria-hidden="true" className="material-symbols-outlined text-st-primary">
              psychology
            </span>
          </div>
          <div>
            <div className="font-headline-sm text-headline-sm text-on-surface">The Grand Magus</div>
            <div className="font-label-mono text-label-mono text-outline text-xs">
              Rank: Adept III
            </div>
          </div>
        </div>
        <nav className="flex-1 flex flex-col gap-2">
          <a
            className="flex items-center gap-3 font-label-mono text-label-mono text-outline hover:text-on-surface p-3 hover:bg-st-primary/10 transition-all duration-300 hover:translate-x-1 transition-transform rounded-lg"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined">
              visibility
            </span>
            Aura Scan
          </a>
          <a
            className="flex items-center gap-3 font-label-mono text-label-mono text-outline hover:text-on-surface p-3 hover:bg-st-primary/10 transition-all duration-300 hover:translate-x-1 transition-transform rounded-lg"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined">
              auto_fix_high
            </span>
            Sigil Forge
          </a>
          <a
            className="flex items-center gap-3 font-label-mono text-label-mono text-outline hover:text-on-surface p-3 hover:bg-st-primary/10 transition-all duration-300 hover:translate-x-1 transition-transform rounded-lg"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined">
              schedule
            </span>
            Chronos
          </a>
          <a
            className="flex items-center gap-3 font-label-mono text-label-mono text-st-secondary font-bold bg-secondary-container/20 rounded-lg p-3 hover:translate-x-1 transition-transform"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined">
              cyclone
            </span>
            Vortex
          </a>
          <a
            className="flex items-center gap-3 font-label-mono text-label-mono text-outline hover:text-on-surface p-3 hover:bg-st-primary/10 transition-all duration-300 hover:translate-x-1 transition-transform rounded-lg"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined">
              balance
            </span>
            Arbiter
          </a>
        </nav>
        <button className="w-full bg-spirit-violet/20 border border-spirit-violet/50 text-spirit-violet font-label-mono text-label-mono py-3 rounded-lg hover:bg-spirit-violet hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:shadow-[0_0_20px_rgba(255,224,131,0.4)] tracking-widest mt-auto mb-4">
          TRANSMUTE
        </button>
        <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
          <a
            className="flex items-center gap-3 font-label-mono text-label-mono text-outline hover:text-on-surface p-3 hover:bg-st-primary/10 transition-all duration-300 hover:translate-x-1 transition-transform rounded-lg"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined">
              settings
            </span>
            Settings
          </a>
          <a
            className="flex items-center gap-3 font-label-mono text-label-mono text-outline hover:text-on-surface p-3 hover:bg-st-primary/10 transition-all duration-300 hover:translate-x-1 transition-transform rounded-lg"
            href="#"
          >
            <span aria-hidden="true" className="material-symbols-outlined">
              menu_book
            </span>
            Grimoire
          </a>
        </div>
      </aside>
      {/*  Main Canvas  */}
      <main className="flex-1 flex pt-16 md:pl-64 h-full relative">
        {/*  Left: Chat Stream  */}
        <div className="flex-1 flex flex-col h-full overflow-hidden p-4 md:p-8">
          {/*  Context Header  */}
          <div className="mb-6 pb-4 border-b border-white/10 flex justify-between items-end">
            <div>
              <h1 className="font-headline-lg text-headline-lg text-primary-fixed mb-1">
                Debate: Ethics of AI Augmentation
              </h1>
              <p className="font-label-mono text-label-mono text-outline">
                Session ID: <span className="text-secondary-fixed">φ-77A9</span> | Protocol:{' '}
                <span className="text-tertiary">Active Resolution</span>
              </p>
            </div>
            <div className="hidden md:flex gap-2">
              <span className="px-3 py-1 glass-panel rounded-full font-label-mono text-[12px] text-spirit-violet flex items-center gap-1 border-spirit-violet/30">
                <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                  bolt
                </span>{' '}
                Mercury Active
              </span>
              <span className="px-3 py-1 glass-panel rounded-full font-label-mono text-[12px] text-secondary-fixed flex items-center gap-1 border-secondary-fixed/30">
                <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                  favorite
                </span>{' '}
                Venus Observing
              </span>
              <span className="px-3 py-1 glass-panel rounded-full font-label-mono text-[12px] text-tertiary flex items-center gap-1 border-tertiary/30">
                <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                  gavel
                </span>{' '}
                Saturn Active
              </span>
            </div>
          </div>
          {/*  Messages Area  */}
          <div className="flex-1 overflow-y-auto pr-4 flex flex-col gap-6" id="chat-stream">
            {/*  System/User Prompt  */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-surface-bright flex items-center justify-center shrink-0 border border-white/20 mt-1">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-[18px] text-on-surface"
                >
                  person
                </span>
              </div>
              <div className="flex-1">
                <div className="font-label-mono text-[12px] text-outline mb-1">User Initiation</div>
                <div className="glass-panel p-4 rounded-xl rounded-tl-none border-l-2 border-l-surface-bright text-on-surface font-body-md text-body-md">
                  Analyze the proposition that cognitive augmentation through neural interfacing
                  creates an unavoidable societal bifurcation. Assume standard human resistance
                  metrics.
                </div>
              </div>
            </div>
            {/*  Mercury (Violet) -> Analytical  */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-surface-bright flex items-center justify-center shrink-0 border-2 glow-hermes mt-1">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-[18px] text-spirit-violet"
                >
                  psychology_alt
                </span>
              </div>
              <div className="flex-1 max-w-3xl">
                <div className="font-label-mono text-[12px] text-spirit-violet mb-1 flex items-center gap-2">
                  MERCURY <span className="text-outline text-[10px]">• Logic Matrix</span>
                </div>
                <div className="glass-panel p-4 rounded-xl rounded-tl-none border-l-2 border-l-spirit-violet text-on-surface font-body-md text-body-md">
                  The premise of unavoidable bifurcation is statistically sound based on historical
                  technological adoption curves. However, the 'standard human resistance metrics'
                  you cite fail to account for the neuro-plasticity acceleration factor. Once an
                  initial 15% threshold is reached, mimetic desire overrides ideological resistance.
                </div>
              </div>
            </div>
            {/*  Agent Interaction: Saturn refutes Mercury  */}
            <div className="flex gap-4 ml-12">
              <div className="w-8 h-8 rounded-full bg-surface-bright flex items-center justify-center shrink-0 border-2 glow-saturn mt-1">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-[18px] text-tertiary"
                >
                  balance
                </span>
              </div>
              <div className="flex-1 max-w-3xl">
                <div className="font-label-mono text-[12px] text-tertiary mb-1 flex items-center gap-2">
                  SATURN{' '}
                  <span className="text-outline text-[10px]">
                    <span aria-hidden="true" className="material-symbols-outlined text-[10px] mr-1">
                      reply
                    </span>
                    Refuting Mercury
                  </span>
                </div>
                <div className="glass-float p-4 rounded-xl rounded-tl-none border-l-2 border-l-tertiary text-on-surface font-body-md text-body-md shadow-[0_4px_20px_rgba(78,222,163,0.1)]">
                  Mercury's analysis is dangerously reductive. By focusing solely on 'mimetic
                  desire', it ignores the structural rigidities of legacy institutions. The
                  bifurcation isn't just cognitive; it's infrastructural. Without equitable
                  substrate access, the 15% threshold merely entrenches a new oligarchy. We must
                  calculate the entropy of systemic pushback.
                </div>
              </div>
            </div>
            {/*  Venus (Gold) -> Empathetic/Synthesizing  */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-surface-bright flex items-center justify-center shrink-0 border-2 glow-venus mt-1">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-[18px] text-secondary-fixed"
                >
                  volunteer_activism
                </span>
              </div>
              <div className="flex-1 max-w-3xl">
                <div className="font-label-mono text-[12px] text-secondary-fixed mb-1 flex items-center gap-2">
                  VENUS <span className="text-outline text-[10px]">• Synthesis Engine</span>
                </div>
                <div className="glass-panel p-4 rounded-xl rounded-tl-none border-l-2 border-l-secondary-fixed text-on-surface font-body-md text-body-md">
                  Saturn highlights the physical constraints, while Mercury maps the psychological
                  momentum. The synthesis lies in recognizing that 'resistance' is not a monolithic
                  variable. If we map emotional resonance to the augmentation process—framing it not
                  as 'enhancement' but as 'deepened connection'—the infrastructural entropy Saturn
                  fears might be mitigated by grassroots, decentralized adoption nodes.
                </div>
              </div>
            </div>
            {/*  Thinking State (Mercury)  */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-surface-bright flex items-center justify-center shrink-0 border-2 border-spirit-violet/30 mt-1 thinking-pulse">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-[18px] text-spirit-violet/50"
                >
                  sync
                </span>
              </div>
              <div className="flex-1 max-w-3xl">
                <div className="font-label-mono text-[12px] text-spirit-violet/70 mb-1">
                  MERCURY
                </div>
                <div className="glass-panel p-3 rounded-xl rounded-tl-none border-l-2 border-l-spirit-violet/30 flex items-center gap-3 text-outline font-label-mono text-[12px]">
                  <div className="dot-typing ml-2 text-spirit-violet"></div>
                  <span className="ml-4">
                    Transmuting Logic... Recalculating decentralization vectors against Saturn's
                    constraints.
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/*  Input Area  */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="relative group">
              <input
                className="w-full bg-surface-container/50 border-0 border-b-2 border-spirit-violet/30 focus:border-spirit-violet focus:ring-0 text-on-surface font-body-md py-4 pl-4 pr-12 rounded-t-lg transition-all placeholder:text-outline/50 group-focus-within:bg-surface-container group-focus-within:shadow-[0_4px_20px_rgba(168,85,247,0.1)]"
                placeholder="Inject new parameter or guide the debate..."
                type="text"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 text-spirit-violet hover:text-white p-2 rounded-full hover:bg-spirit-violet/20 transition-colors">
                <span aria-hidden="true" className="material-symbols-outlined">
                  send
                </span>
              </button>
            </div>
          </div>
        </div>
        {/*  Right: Analytics & Resonance Sidebar  */}
        <div className="hidden lg:flex w-80 border-l border-white/10 flex-col bg-surface-dim/30 p-6 overflow-y-auto">
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-6 flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-st-primary">
              data_usage
            </span>
            Session Metrics
          </h2>
          {/*  The Constant Monitor  */}
          <div className="glass-panel p-6 rounded-2xl mb-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-spirit-violet/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="font-label-mono text-label-mono text-outline mb-2 relative z-10">
              Monica Constant (A#)
            </div>
            <div className="font-headline-xl text-[42px] font-bold text-monica-constant tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] relative z-10">
              0.894<span className="text-spirit-violet text-2xl">φ</span>
            </div>
            <div className="text-xs font-label-mono text-tertiary mt-2 flex items-center gap-1 relative z-10">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                trending_up
              </span>{' '}
              +0.012 Divergence
            </div>
          </div>
          {/*  Council Resonance Gauge  */}
          <div className="mb-8">
            <div className="flex justify-between items-end mb-2">
              <div className="font-label-mono text-label-mono text-on-surface">
                Council Resonance
              </div>
              <div className="font-label-mono text-[12px] text-secondary-fixed">High Synergy</div>
            </div>
            <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden relative">
              {/*  Gauge background  */}
              <div className="absolute inset-0 bg-gradient-to-r from-error via-secondary-fixed to-tertiary opacity-20"></div>
              {/*  Value indicator  */}
              <div
                className="h-full bg-gradient-to-r from-spirit-violet to-secondary-fixed rounded-full shadow-[0_0_10px_rgba(255,224,131,0.5)] transition-all duration-1000 ease-in-out"
                style={{ width: '76%' }}
              ></div>
            </div>
            <div className="flex justify-between mt-1 font-label-mono text-[10px] text-outline">
              <span>0.0 (Dissonance)</span>
              <span>1.618 (Absolute)</span>
            </div>
          </div>
          {/*  Agent Contributions (The Sacred Seven Chips style)  */}
          <div className="space-y-3">
            <div className="font-label-mono text-xs text-outline mb-3">Agent Influence</div>
            {/*  Mercury Chip  */}
            <div className="glass-panel p-3 rounded-lg flex items-center gap-3 border-l-2 border-l-spirit-violet">
              <div className="text-spirit-violet font-serif text-lg">🜁</div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="font-label-mono text-[12px] text-on-surface">
                    Mercury (Logic)
                  </span>
                  <span className="font-label-mono text-[12px] text-spirit-violet">42%</span>
                </div>
                <div className="w-full h-1 bg-surface-container mt-1 rounded-full overflow-hidden">
                  <div className="h-full bg-spirit-violet w-[42%]"></div>
                </div>
              </div>
            </div>
            {/*  Saturn Chip  */}
            <div className="glass-panel p-3 rounded-lg flex items-center gap-3 border-l-2 border-l-tertiary">
              <div className="text-tertiary font-serif text-lg">🜃</div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="font-label-mono text-[12px] text-on-surface">
                    Saturn (Constraint)
                  </span>
                  <span className="font-label-mono text-[12px] text-tertiary">35%</span>
                </div>
                <div className="w-full h-1 bg-surface-container mt-1 rounded-full overflow-hidden">
                  <div className="h-full bg-tertiary w-[35%]"></div>
                </div>
              </div>
            </div>
            {/*  Venus Chip  */}
            <div className="glass-panel p-3 rounded-lg flex items-center gap-3 border-l-2 border-l-secondary-fixed">
              <div className="text-secondary-fixed font-serif text-lg">🜄</div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="font-label-mono text-[12px] text-on-surface">
                    Venus (Synthesis)
                  </span>
                  <span className="font-label-mono text-[12px] text-secondary-fixed">23%</span>
                </div>
                <div className="w-full h-1 bg-surface-container mt-1 rounded-full overflow-hidden">
                  <div className="h-full bg-secondary-fixed w-[23%]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
