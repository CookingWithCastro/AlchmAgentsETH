# Design Prompt — Fix Theming Root Cause + Modernize the CSS

> Paste this into a fresh Claude Code session (run with **bun**, `bun dev`). It is
> self-contained — it includes the diagnosed root cause so you don't need prior context.

## Mission

Two linked goals for **Planetary Agents** (`agents.alchm.kitchen`):

1. **Fix the theming root cause** — the app renders dark pages but never activates
   dark mode, so shadcn/Tailwind design tokens are stuck on their **light** values.
2. **Modernize and unify the CSS** into one coherent, **dark-first**, token-driven
   design system — cutting bespoke CSS sprawl while elevating the cosmic/alchemical
   aesthetic.

Work in **reviewable phases**; pause for review between them. This is a visual/system
refactor — **no behavior, routing, data, or API changes**.

## How theming works today (grounded findings — verify, then build on)

- **Tokens exist and are wired correctly.** `app/globals.css` defines shadcn-style
  CSS variables for `:root` (light, ~L136–154) and `.dark` (a dark "cosmic" palette,
  ~L171–189). `tailwind.config.ts` maps Tailwind colors to `hsl(var(--token))`. This
  is the standard shadcn setup and should be kept.
- **THE BUG: `.dark` is never applied.** `app/layout.tsx` renders `<html lang="en">`
  with no theme class, and the existing `components/misc/theme-provider.tsx`
  (next-themes) is **not mounted** in `app/providers.tsx` or the layout. So every
  component resolves the **light** token set even on dark pages — e.g. the `outline`
  button's `bg-background` computed to white. Confirm `tailwind.config.ts` has
  `darkMode: 'class'` (add it if missing).
- **Already fixed (narrowly):** `components/ui/button.tsx` `outline` variant now uses
  `bg-transparent` instead of `bg-background` so it stays legible. Keep this; the
  per-button workarounds were removed.
- **The dark look today is bespoke, not token-driven.** It comes from per-page CSS +
  inline gradients, not the tokens: `app/landing.css` (1406 lines), `app/navigation.css`
  (424), `app/cosmic-time-laboratory.css` (596), `app/cosmic-theme.css` (156), plus
  per-route CSS (`app/(app)/me/me.css`, `app/(app)/auth/signin/signin.css`) and inline
  `bg-gradient-*` utilities.
- **Anti-patterns to remove** in `app/globals.css`: blanket high-specificity overrides
  such as `.dark [class*='bg-']:not(.bg-transparent):not(.bg-gradient-) { …glass gradient… }`
  and `.dark h1..p, span:not([class*='bg-']) { color… }`. These force styles onto every
  matching element, fight Tailwind utilities, and are currently dormant (because `.dark`
  is unapplied). Replace with intentional, token-driven component styles.

**Net:** three competing styling systems — (a) shadcn tokens, (b) global `.dark`
overrides, (c) bespoke page CSS — that don't agree. The light/dark mismatch is the
visible symptom; the real work is unifying them.

## Desired end state

- **Dark-first, single source of truth.** One coherent token set drives the whole app;
  dark mode is the default and is actually applied at the root. Decide light mode's fate:
  recommend **dark-first only** unless there's a real need for a light theme — if kept,
  it must be a genuinely tested alternative, not an accident.
- **Token-driven, not override-driven.** Components derive color / spacing / radius /
  shadow / type from tokens + Tailwind utilities. The blanket element/`[class*='bg-']`
  overrides are gone, replaced by explicit reusable classes/components.
- **Modern aesthetic** worthy of a cosmic/alchemical consciousness product: refined dark
  surfaces with layered elevation and restrained glassmorphism, an aurora/nebula accent
  system built on the existing purple, crisp modern typography on a fluid type scale,
  consistent spacing/radius/elevation scales, tasteful motion, and AA contrast.
- **Less CSS.** Consolidate the bespoke `.css` files; move repeatable patterns into
  tokens/Tailwind; delete dead and duplicated rules. Aim for a clear net reduction in
  hand-written CSS.

## Phased plan (review between phases)

**Phase 0 — Audit & token design.** Inventory the bespoke CSS files and real
color/shadow/gradient usage. Define the canonical **semantic** tokens (background /
surface / elevated; foreground / muted; primary / accent in the cosmic purple; border /
ring; success / warning / danger), plus scales for spacing, radius, elevation/shadow, and
a fluid type scale. Express as CSS variables consumed by `tailwind.config.ts`.

**Phase 1 — Activate dark mode correctly (the root fix).** Ensure `darkMode: 'class'`.
Apply the theme at the root — simplest is `<html lang="en" className="dark">` (dark-first);
if keeping a toggle, mount the existing next-themes `ThemeProvider` in `app/providers.tsx`
with `attribute="class" defaultTheme="dark" enableSystem={false}` and add
`suppressHydrationWarning` to `<html>`. Re-derive the `.dark` values into the canonical
token set. **Then validate broadly** — turning on `.dark` changes many components; walk the
key routes and fix anything that assumed light tokens.

**Phase 2 — Remove the blanket overrides.** Delete the `.dark [class*='bg-']…` and
`.dark h1..p` color-forcing rules from `globals.css`. Reintroduce the glass-card look as an
explicit, reusable surface treatment (a `.surface` class / the shadcn `Card`) applied
intentionally — never globally to every `bg-*`.

**Phase 3 — Consolidate & modernize bespoke CSS.** Fold `cosmic-theme.css`, route CSS, and
the large `landing.css` / `navigation.css` into tokens + Tailwind where practical. Keep
genuinely-bespoke effects (starfields, nebula animation) but make them token-aware and
`prefers-reduced-motion`-safe. Replace inline one-off gradients with token utilities.

**Phase 4 — Polish.** `focus-visible` states, AA contrast pass, consistent button / input /
card treatments, dark scrollbars and selection color, and restrained hover/active
micro-interactions.

## Constraints / guardrails

- Keep the stack: **Tailwind + shadcn/ui + CSS-var tokens**. Package manager is **bun**.
  Do not introduce another CSS framework or a runtime CSS-in-JS lib.
- Do not regress the `outline` button fix (`bg-transparent`).
- **Do NOT make form inputs transparent** — `components/ui/input.tsx` needs a fill to stay
  legible on dark surfaces.
- No new TypeScript errors: `bunx tsc --noEmit` must not get worse. `bun run lint` and
  `bun run build` must pass.
- Honor `prefers-reduced-motion`; meet **WCAG AA** contrast for text and interactive UI.
- Token changes ripple widely — there are **525+ `variant="outline"`** usages and many
  `bg-card`/token consumers. Verify in the browser; don't assume.

## Validation (each phase + final)

- `bunx tsc --noEmit` (no new errors), `bun run lint`, `bun run build`.
- Run the dev server and walk the key routes in the browser, checking for white-on-white,
  invisible text, and illegible inputs/buttons/cards: `/`, `/gallery`, `/me`, `/account`,
  `/pricing`, an agent chat, `/admin`, a Labs/cosmic-tool page, `/auth/signin`,
  `/auth/signup`. Capture **before/after screenshots**.
- Spot-check `outline` / `ghost` / `secondary` buttons on different surfaces, and responsive
  layouts (mobile / tablet / desktop). If a light theme is retained, test both modes.
- Confirm the blanket overrides are gone and total hand-written CSS dropped.

## Deliverables

- A documented token system (CSS vars + `tailwind.config.ts`) with dark mode applied at the
  root.
- Consolidated, modern CSS with the blanket overrides removed.
- Before/after screenshots of the key routes.
- A short notes/CHANGELOG: what was unified, what was deleted, and any follow-ups.
