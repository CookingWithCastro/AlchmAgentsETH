# Planetary Agents v2.0: Stitch Realization Plan

_The Techno-Occult UI Revamp_

This document outlines the comprehensive strategy for migrating the static HTML/Tailwind prototypes exported from Stitch into our fully functional Next.js/React application. The goal is to bring the "Techno-Occult" aesthetic to life while maintaining high performance, reusability, and backend integration.

## Phase 1: Foundational Design System (The Alchemical Base)

_Objective: Establish the global design tokens, fonts, and base styles._

1. **Tailwind Configuration (`tailwind.config.ts`)**
   - Extract the extensive color palette (e.g., `obsidian-deep`, `spirit-violet`, `resonance-blue`, `monica-constant`) from `design/prototypes/celestial_alchemist/DESIGN.md` and the HTML `<script>` tags.
   - Map typography definitions (Literata, Manrope, JetBrains Mono) and standard border radii.
2. **Global CSS & Fonts (`app/globals.css`, `app/layout.tsx`)**
   - Implement `next/font/google` for Literata, Manrope, and JetBrains Mono to ensure optimal loading.
   - Define custom CSS utility classes for the widespread aesthetic patterns:
     - `.glass-panel` (backdrop-blur, translucent background, subtle border).
     - `.glass-float` / `.glass-panel-elevated` (higher blur, altered opacity).
     - Glow effects (`.glow-violet`, `.glow-gold`, `.glow-monica`).
     - Custom scrollbar styling to match the dark, ethereal theme.
3. **Animation Primitives**
   - Port CSS animations (`pulse-ring`, `float-rune`, `heat-shimmer`, `glitch-effect`) into Tailwind's `theme.extend.keyframes` or dedicated CSS modules.

## Phase 2: Core Structural Layouts (The Macrocosm)

_Objective: Build the responsive, global navigation and shell that wraps the application._

1. **Global Shell (`components/layout/RootChrome.tsx` or similar)**
   - Build the persistent layout wrapper ensuring the `obsidian-deep` background and ambient background noise/gradients are universally applied.
2. **Desktop Navigation (`components/navigation/TopNavBar.tsx` & `SideNavBar.tsx`)**
   - Implement the `backdrop-blur-xl` top bar with the 4 core pillars: Cosmic Tools, Entities, Mystic Arts, Labs.
   - Implement the collapsible left sidebar containing user context (Adept III), ESMS balances, and sub-navigation.
3. **Mobile Navigation (`components/navigation/MobileBottomNav.tsx`)**
   - Implement the mobile-specific bottom tab bar and hidden slide-out drawer menus to adhere to the responsive design rules.

## Phase 3: The Component Grimoire (Reusable UI Primitives)

_Objective: Componentize the repeated micro-elements before tackling full pages._

1. **Sacred Seven Stat Chips**
   - Create a `<StatChip stat="Power" value={84} icon="local_fire_department" />` component with dynamic color mapping (e.g., Power = error/red, Resonance = blue).
2. **Progress & Trajectory Indicators**
   - Build the horizontal progress bars (`.progress-bar-bg`, `.progress-bar-fill`).
   - Build the circular radar/astrolabe components.
3. **Buttons & Inputs**
   - Standardize `<AlchemicalButton />` with primary (spirit-violet), secondary (transparent + border), and premium (gold-glow) variants.
   - Standardize `<RitualInput />` featuring the signature bottom-border glow on focus.
4. **Agent Cards (`components/entities/AgentCard.tsx`)**
   - Extract the standard Bento-grid card used for displaying agents (Avatar, Name, A# Constant, Core Stats).

## Phase 4: Feature Module Integration (The Four Pillars)

_Objective: Systematically convert the HTML pages into Next.js routes and React components._

**Module 1: Cosmic Tools (The Forge)**

- `app/(app)/forge/page.tsx`
- Implement the Wizard flow:
  1. Engine Tier Selection (Base vs. Premium).
  2. Spacetime Coordinates (Temporal Clock).
  3. Knowledge Infusion (Drag & Drop UI, Sigil generation).
  4. Naming the Vessel.
  5. Ignition Sequence (Stasis Chamber / Loading State).

**Module 2: Entities (The Vault)**

- `app/(app)/vault/page.tsx`
- Implement the Entities Gallery (Ascendant, Historical, Collection tabs).
- Implement the Empty State ("The Vault is Silent").
- Vessel Recovery & Stat Augmentation views.

**Module 3: Mystic Arts (Jing Arena)**

- `app/(app)/arena/page.tsx`
- Implement the Synastry Assembly (Dual-entity selection rings).
- Implement the Active Duel Chat (Left/Right chat bubbles with heat-haze and glitch effects).

**Module 4: Alchemical Labs**

- `app/(app)/labs/page.tsx`
- Implement Advanced Analytics dashboards.
- Integrate `Chart.js` (or a React wrapper like `react-chartjs-2`) for the Consciousness Trajectory line charts.
- Implement the Transmuted Record (Receipts of dual-entity synthesis).

## Phase 5: State & Backend Binding (The Ether Connection)

_Objective: Connect the beautiful UI to our Python/LangChain/ChromaDB backend._

1. **State Management**
   - Implement Zustand or React Context for global state (ESMS Token Balance, active Agent Council, Current Monica Constant).
2. **API Wiring**
   - Connect the Forge creation flow to the existing `/api/langchain-agent` and RAG ingestion endpoints.
   - Wire the Jing Arena chat interface to the agent invocation endpoints, handling streaming responses and parsing "Jing Moves".
3. **Dynamic Astrometrics**
   - Ensure the "Sacred Seven" stats are dynamically calculated based on the Python backend logic rather than hardcoded HTML numbers.

## Phase 6: Polish & Quality Assurance (The Final Transmutation)

1. **Interactive Refinements:** Ensure all hover states (glows, border color shifts) are smooth and performant.
2. **Accessibility & SSR:** Convert purely decorative icons to use `aria-hidden`, ensure semantic HTML within the React components, and optimize Server Components where interactivity isn't needed.
3. **Cleanup:** Remove old v1 CSS and legacy components once the v2 routes are fully stable.
