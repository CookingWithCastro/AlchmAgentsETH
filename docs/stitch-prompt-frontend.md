# Google Stitch prompts — Pentacle Star Vaults frontend

Paste these into **stitch.withgoogle.com** to design the remaining UI for the staking app.
Stitch designs **one screen per prompt** — paste the **Design System** block first (or at the
top of each screen prompt), then a screen section. Screen 1 (ESMS Balance) is the priority.

The data each screen shows is real and already produced by the app — see
[`STAR_STAKING.md`](../STAR_STAKING.md) and `lib/staking/`. Element ↔ ESMS ↔ color mapping
is fixed: **Spirit = Fire = `#ff6b4a`**, **Essence = Water = `#4aa8ff`**,
**Matter = Earth = `#5fd08a`**, **Substance = Air = `#c9a3ff`**.

---

## Design System (prepend to every screen)

> **Product:** "Pentacle Star Vaults" — a mystical on-chain staking app where users stake
> USDC on real stars and earn four soulbound alchemical tokens (ESMS: Spirit, Essence,
> Matter, Substance). Think _celestial DeFi crossed with a tarot/astrology grimoire_.
>
> **Mood:** deep-space, occult-luxe, calm and premium — not neon "crypto-bro". A night sky
> seen through dark glass. Elegant, a little arcane.
>
> **Theme (dark only):**
>
> - Background: near-black cosmic navy, radial gradient from `#0b0d20` (center) to `#05060f`
>   (edges), with a faint scatter of tiny stars.
> - Surfaces: glassmorphic cards, fill `rgba(14,16,38,0.65)`, 1px border
>   `rgba(122,128,200,0.25)`, corner radius 16px, soft backdrop blur, subtle inner glow.
> - Text: primary `#e7e9ff`, secondary `#9aa0d8`, faint `#6b72a8`.
> - Gold accent (ascendant / highlights): `#ffd76a`, glow `#fff3b0`.
> - The **four element colors** (use consistently for their token, with a soft outer glow):
>   Spirit `#ff6b4a`, Essence `#4aa8ff`, Matter `#5fd08a`, Substance `#c9a3ff`.
>
> **Type:** an elegant serif for headings/numerals (think Cormorant / Playfair) over a clean
> geometric sans for body and data (Inter). Tabular numerals for balances.
>
> **Iconography:** astrological/alchemical glyphs — planets ☉ ☽ ☿ ♀ ♂ ♃ ♄ ♅ ♆ ♇, aspect marks
> ☌ ⚹ △ □ ☍, element triangles △ ▽. Hairline strokes, occult-fine.
>
> **Chain context:** everything settles on **Circle Arc** testnet; show a small "Arc" network
> chip. USDC is 6-decimal; ESMS amounts show ~2–4 decimals.

---

## Screen 1 — ESMS Balance ("Cosmic Wallet") ★ priority

> Design a **wallet / balance panel** for the connected user's four soulbound **ESMS** tokens.
>
> Layout: a glass card titled **"Your Essence"**. At the top, a connected-wallet row — a small
> circular astrological sigil avatar, the truncated address `0x91f2…A3c4`, an **Arc** network
> chip, and the **USDC** balance (e.g. `124.50 USDC`) on the right.
>
> Below, a **2×2 grid of four element balance tiles**, one per token, each tile:
>
> - the element glyph in its color with a soft glow (Spirit △ `#ff6b4a`, Essence ▽ `#4aa8ff`,
>   Matter ⊕ `#5fd08a`, Substance ▲ `#c9a3ff`),
> - the token name (Spirit / Essence / Matter / Substance),
> - a large tabular-numeral balance (e.g. `42.18`),
> - a tiny "soulbound · non-transferable" lock chip,
> - a faint sparkline of the last few claims.
>
> Under the grid, a slim **"Total essence"** summary bar that stacks the four colors
> proportionally (like a horizontal allocation bar) with the total in the center.
>
> Footer: two ghost buttons — **"Swap essence"** and **"Provide to a zone pool"** — and a tiny
> caption "Earned by staking stars while they're risen."
>
> Include an empty state (no balances yet): a dim constellation illustration with
> "Stake a star to begin earning essence."

---

## Screen 2 — Swap Essence (modal)

> Design a **swap modal** for trading one ESMS element for another through a zone's element-pair
> pool (a constant-product AMM, gated by astrology).
>
> A centered glass modal titled **"Swap essence"**. Two stacked token fields:
>
> - **From**: element dropdown (shows glyph + name + your balance), amount input, "Max" chip.
> - a circular **swap-direction** button between them with a subtle rotate animation.
> - **To**: element dropdown, the **quoted** output amount (read-only, e.g. `≈ 3.92 Matter`).
>
> A **pool context strip** above the confirm button: the active pair (e.g.
> `Essence ↔ Matter`), the aspect that opened it shown as glyphs `♃ △ ♄` ("Jupiter trine
> Saturn"), pool reserves, and a gold **"Pool open"** pill. If the pool is closed, show a
> muted state: _"This pool opens when a favorable cross-element aspect forms and the zone is
> risen."_
>
> Below: a small details row — rate, 1% fee, min received, slippage. A full-width primary
> button cycling through states: **Swap → Awaiting signature… → Confirming on Arc… → Done ✓**
> with a tx-hash link.

---

## Screen 3 — My Positions (portfolio dashboard)

> Design a **portfolio dashboard** titled **"Your constellations"** summarizing everything the
> user has staked.
>
> Top: three stat cards — **Total staked** (USDC), **Accrued essence** (with the 4-color split),
> **Stars held** (count) — each a glass tile with a big serif number.
>
> Section **"Star stakes"**: a list/table, one row per star — a small colored star dot + name
> (e.g. _Vega_), the element→token it pays (colored chip), principal USDC, live **APY %**, a
> visibility status dot (gold "risen 52°" / grey "set"), accrued essence, and a **Claim** button.
> Rows where the star is currently on the ascendant get a gold ✦ "shooting star" badge.
>
> Section **"Zone liquidity"**: cards for each ConstellationAMM LP position — the pair
> (`Spirit ↔ Matter`), Deed NFT #, your share %, value, and **Withdraw**.
>
> A sticky footer bar: **"Claim all essence"** with the pending total.

---

## Screen 4 — Star detail (stake drawer)

> Design a **right-side drawer** that opens when a user taps a star on the sky map.
>
> Header: the star's name (_Altair_), catalog id `HIP 97649`, magnitude, and a colored token
> chip "pays **Substance**". A status line: gold **"Risen · 52° above horizon"** or grey
> **"Below horizon — yield paused"**, plus an animated ✦ **"On your ascendant"** badge when active.
>
> A hero **"Essence APY"** number in the token's color (e.g. `41.1%`), with a "paused" state.
>
> A **yield breakdown** as four labeled horizontal meter bars that multiply together:
> _Sky elemental dominance ×1.25_, _Your chart affinity ×1.25_, _Transiting planet dignity
> ×1.20_, _Zone pool + ascendant boost ×1.17_ — each bar tinted, with the running product shown.
>
> Your position: principal staked + accrued essence.
>
> Actions: a USDC amount input with **Stake**, plus **Unstake all** and **Claim essence** ghost
> buttons; a tx-status line. If no wallet: a tasteful **Connect wallet** prompt.

---

## Screen 5 — Zone detail card

> Design a compact **zone info card** for a selected pentacle zone.
>
> Title: **"Zone 1 · House"** (zones are Crown / Spire / House) with a small wireframe of the
> 11-zone pentacle highlighting this zone. Show the ruling planet glyph + **control** score, and
> a **boost ×1.17** gold pill.
>
> **"Planets here"**: a row of planet glyphs currently transiting the zone (☽ ♂ ♅ ♆).
>
> **"Open pools"**: a list of the element-pair pools this zone hosts right now, each as a colored
> pair (`Essence ↔ Matter`) with the aspect glyphs and a strength meter, and a small **Provide**
> button. Empty state: "No open pool — needs a planet here in a favorable cross-element aspect."

---

## Screen 6 — Shooting-star activation toast

> Design a celebratory **toast / notification** that appears when a star crosses the user's
> ascendant. A slim glass banner sliding in from the top-right with a gold ✦ sparkle burst:
> headline **"Shooting star!"**, body _"Altair crossed your ascendant — +0.8 Substance minted,
> Zone 1 boosted ×1.5 for 16s."_, a small star streak animation, and a **View** link. Keep it
> elegant and brief, auto-dismissing.

---

## Screen 7 — Connect & onboarding

> Design a **connect-wallet / onboarding** screen. Centered over the cosmic background: the
> "Pentacle Star Vaults" wordmark in serif, a one-line subtitle, and a primary **Connect wallet**
> button (Dynamic). After connect, a checklist card: **① Connect ✓ · ② Switch to Arc · ③ Get
> testnet USDC** (faucet link) **· ④ Verify you're human** (World ID, optional). A subtle
> rotating zodiac wheel / pentacle motif in the background. Reassuring, premium, minimal.

---

### Notes for whoever implements the exports

- Match the existing inline-styled components in `components/staking/` (PentacleSkyMap,
  StarStakePanel, ZonePoolsPanel, ZonePoolLP) — same palette + glyphs so the Stitch screens drop in.
- The ESMS balance screen needs an **ERC-1155 `balanceOfBatch`** read of ids `[0,1,2,3]` from
  the Arc ESMS token (`NEXT_PUBLIC_ARC_ESMS_ADDRESS`) — wire it in a `useEsmsBalances` hook
  mirroring `useStarStaking`. The swap screen calls `ConstellationAMM.swap` with a
  `/api/staking/pool-attestation` signature (already built).
