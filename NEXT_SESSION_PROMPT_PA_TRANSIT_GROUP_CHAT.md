# PA Session Prompt — Transit-Driven Group Chat (catch up to alchm.kitchen)

> Run this in the **planetary_agents** project (`/Users/cookingwithcastro/Desktop/planetary_agents-main`,
> deployed as `agents.alchm.kitchen` UI + `api.agents.alchm.kitchen` backend).
>
> **Why:** alchm.kitchen now makes every displayed astrological transit clickable. A click
> resolves the planetary-degree agents involved and asks PA to open a **group chat** between
> them. The alchm.kitchen side is shipped and calls a PA endpoint that **does not exist yet**.
> Your job is to implement the PA half of the contract so the flow completes.

---

## 1. What alchm.kitchen already does (shipped)

When a user clicks a transit anywhere on alchm.kitchen (the Active Aspects list, the current-sky
planet tiles, the natal/transit wheel, or the live Sun/Moon bar), it:

1. Resolves the **two transiting planets** to their canonical degree-agent IDs.
2. `POST`s them to its own server route `POST /api/agents/group-chat`, which **proxies to PA**
   (server-to-server, secret-gated) to create a session, then opens the returned URL in a new tab.

Canonical degree-agent ID format — **identical to your `backend/seed_3600_planetary_agents.py:53`**
and alchm.kitchen's `unified-agent-factory.ts`:

```
planetary-{planet}-{sign}-{degree}     # all lowercase, degree = integer 0–29 within the sign
# e.g.  planetary-mars-aries-15 , planetary-saturn-capricorn-15
```

These are the **3600 pre-seeded agents** (10 planets × 12 signs × 30°). They already resolve in
`/gallery/chat/[id]` and the backend `/api/chat` synthesizes a persona on the fly if one is missing.

- **Solo councils (1 agent) already work today** — alchm.kitchen routes those straight to the
  existing `/gallery/chat/{id}` single-agent page. No work needed for that case.
- **Group councils (≥2 agents) are what you need to build.**

---

## 2. The exact contract PA must implement

### 2a. Create endpoint — `POST /api/internal/group-chat`

Lives on the **PA Next.js app** (`agents.alchm.kitchen`), i.e. `app/api/internal/group-chat/route.ts`.
alchm.kitchen calls it as `${NEXT_PUBLIC_AGENTS_UI_URL}/api/internal/group-chat`.

**Auth:** gate with a timing-safe compare against `INTERNAL_API_SECRET` (also accept
`PA_INTERNAL_API_SECRET`). alchm.kitchen sends the header **`X-Sync-Secret`** (this is the
convention its admin agent-sync proxy already uses). Be lenient and also accept
`X-Internal-Secret` and `Authorization: Bearer <secret>`. Wrong/missing secret → `401`.
The secret value is already shared between the two projects (PA `backend/.env` `INTERNAL_API_SECRET`).

**Request body (exactly what alchm.kitchen sends):**

```jsonc
{
  "agentIds": ["planetary-mars-aries-15", "planetary-saturn-capricorn-15"], // ≥2, deduped, ≤6
  "agents": [
    // parallel detail
    {
      "id": "planetary-mars-aries-15",
      "planet": "Mars",
      "sign": "aries",
      "degree": 15,
      "name": "Mars in Aries 15 Degree",
    },
    {
      "id": "planetary-saturn-capricorn-15",
      "planet": "Saturn",
      "sign": "capricorn",
      "degree": 15,
      "name": "Saturn in Capricorn 15 Degree",
    },
  ],
  "transit": {
    "aspect": "square",
    "key": "mars-aries-15--square--saturn-capricorn-15",
    "label": "Mars square Saturn",
  },
  "origin": "alchm.kitchen",
  "source": "aspects-display", // or current-transit-analysis | natal-transit-chart | live-transit-bar
  "userId": "uuid-or-null", // best-effort attribution; may be null
}
```

**Response (200):**

```jsonc
{ "sessionId": "<id>", "url": "https://agents.alchm.kitchen/gallery/group/<sessionId>" }
```

- alchm.kitchen uses `url` verbatim if present; otherwise it composes
  `${NEXT_PUBLIC_AGENTS_UI_URL}/gallery/group/${sessionId}`. **Returning an absolute `url` is preferred.**
- Any non-2xx is safe — alchm.kitchen falls back to the primary agent's single chat — but the
  goal is a real session.
- **Idempotency (nice-to-have):** `transit.key` is stable for a given transit; you may reuse a
  recent session for the same `key` (+ `userId`) so repeat clicks resume rather than spawn dupes.

### 2b. The group page — `/gallery/group/[id]`

`app/(app)/gallery/group/[id]/page.tsx`. Loads the session by id and renders a group conversation
**pre-populated with the session's agents**, reusing your existing multi-agent orchestration
(`/api/gallery-group-chat` or `/api/unified-multi-agent-chat` — whichever backs your current
group UI). Show the transit context (`transit.label`) as the conversation's framing/seed.
Match the auth/visibility behavior of the existing `/gallery/chat/[id]` page.

### 2c. Session persistence

Persist `{ id, agentIds[], transit, origin, source, userId?, createdAt }` in whatever store backs
the group UI (Prisma model + migration, or via the Python backend — **your choice; not part of the
external contract**). Add a fetch path the group page uses to hydrate.

---

## 3. Acceptance criteria

1. `curl -sS -X POST https://agents.alchm.kitchen/api/internal/group-chat \
-H "Content-Type: application/json" -H "X-Sync-Secret: $INTERNAL_API_SECRET" \
-d '{"agentIds":["planetary-mars-aries-15","planetary-saturn-capricorn-15"],"agents":[],"transit":{"aspect":"square","key":"t","label":"Mars square Saturn"},"origin":"alchm.kitchen","source":"test","userId":null}'`
   → `200` with `{ sessionId, url }`.
2. Visiting that `url` shows a working group chat with **both** planetary-degree agents present and
   the transit label framing the conversation.
3. Wrong/missing secret → `401`.
4. End-to-end: on alchm.kitchen `/quantities` → "Active Aspects", clicking an aspect card opens the
   group chat in a new tab with the two involved degree agents.

---

## 4. Reference — alchm.kitchen files (for the contract, read-only on this side)

- `src/lib/agents/transitAgents.ts` — builds `planetary-{planet}-{sign}-{degree}` IDs + participants.
- `src/app/api/agents/group-chat/route.ts` — the proxy that calls **your** `POST /api/internal/group-chat`.
- `src/hooks/useTransitGroupChat.ts` / `src/hooks/useActiveTransits.ts` — client open + resolution.
- Wired surfaces: `PlanetaryAspectsDisplay.tsx`, `dashboard/CurrentTransitAnalysis.tsx`,
  `dashboard/NatalTransitChart.tsx`, `dashboard/UserDashboard.tsx` (LiveTransitBar).

## 5. Notes / gotchas

- `agents.alchm.kitchen` (UI, this endpoint + the group page) ≠ `api.agents.alchm.kitchen` (Python backend).
- Participants are the **two transiting planets** only (product decision). Don't add sign-rulers or
  historical agents to a transit council unless asked.
- `degree` is **within-sign** 0–29 (not absolute 0–359). IDs use the floored integer.
- Don't break the existing single-agent `/gallery/chat/[id]` route — solo councils depend on it.
