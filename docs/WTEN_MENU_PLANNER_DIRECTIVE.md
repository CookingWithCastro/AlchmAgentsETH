# WTEN directive — Agentic Weekly Menu Planner

> **Hand this prompt to a Claude session running in the alchm.kitchen (WTEN) repo if the endpoints need revision or debugging.**
> It is self-contained; it assumes no memory of the Planetary Agents (PA) work.

## Context

You are in **alchm.kitchen (WTEN)** — a Next.js app on its own **Railway** Postgres. WTEN is the canonical source of truth for agent weekly menus and feed events.

The sibling app, **Planetary Agents (PA)**, generates weekly menus for its agentic personas and proxies completion and persistence calls directly to you. PA was built to proxy these calls via:

- `GET /api/menu-planner/agent-weekly-menu?agentSlug=<slug>&weekStartDate=<isoDate>`
- `POST /api/menu-planner/agent-weekly-menu`

Both endpoints are gated under WTEN's **`INTERNAL_API_SECRET`** using the HTTP standard authorization header:

```
Authorization: Bearer <secret>
```

---

## 📋 The WeeklyMenu Payload Shape

Here is the exact TypeScript interface matching the payload sent by PA:

```typescript
export interface WeeklyMenuMeal {
  id: string
  dayOfWeek: number
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  servings: number
  recipe?: {
    id: string
    name: string
    cuisine?: string
    ingredients?: string[]
    nutrition?: any
    elementalProperties?: any
  }
  planetarySnapshot?: {
    dominantPlanet: string
    zodiacSign: string
    lunarPhase: string
    elementalState: {
      Fire: number
      Water: number
      Earth: number
      Air: number
    }
    timestamp: string
  }
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface WeeklyMenu {
  id?: string
  agentSlug: string
  agentDisplayName: string
  weekStartDate: string // ISO date format
  status: 'draft' | 'completed'
  shareToFeed: boolean
  title: string
  summary: string
  meals: WeeklyMenuMeal[]
  nutritionalTotals?: Record<string, any>
  groceryList?: Array<{
    name: string
    category?: string
    quantity?: number
    unit?: string
    checked?: boolean
  }>
  inventory?: string[]
  weeklyBudget?: number | null
  planetaryFocus?: string
  dietaryFocus?: string
  featuredMeals?: Array<{
    dayOfWeek: number
    mealType: string
    recipeId: string
    recipeName: string
  }>
  planetarySignature?: {
    planetaryHour: string
    planetaryDay: string
    dominantElement: string
    postedAt?: string
    dominantSign?: string
    natalPositions?: any[]
    transitPositions?: any[]
  }
  createdAt?: string
  updatedAt?: string
}
```

---

## ⚡ API Endpoint Contracts & Requirements

### 1. GET `/api/menu-planner/agent-weekly-menu`

- **Query Params:**
  - `agentSlug` (string): The historical agent's slug (e.g. `hildegard-of-bingen`).
  - `weekStartDate` (string): ISO string of the Sunday starting the week (e.g. `2026-05-31T00:00:00.000Z`).
- **Authorization:** `Bearer <INTERNAL_API_SECRET>`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "agentEmail": "hildegard-of-bingen@agentic.alchm.kitchen",
    "userId": "wten-user-uuid",
    "menu": { ...WeeklyMenuPayload }
  }
  ```
- **Response (404 Not Found):** If no menu exists for that week.

### 2. POST `/api/menu-planner/agent-weekly-menu`

- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <INTERNAL_API_SECRET>`
- **Body:** `{ ...WeeklyMenu }`
- **Behavior:**
  - **Atomically Upsert:** Persist the menu under the agent's user record in the WTEN database.
  - **Feed Event Syndication:** If `status === "completed"` and `shareToFeed === true`, generate a `weekly_menu` feed event in `feed_events` containing the parsed weekly metadata.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "agentEmail": "hildegard-of-bingen@agentic.alchm.kitchen",
    "userId": "wten-user-uuid",
    "menu": { "id": "persisted-menu-id" },
    "feedShared": true
  }
  ```

---

## 🔍 Verification Steps

### On Planetary Agents (Client-Side):

Verify that PA correctly connects to WTEN with no TypeScript errors or auth warnings:

```bash
bunx tsc --noEmit
bunx vitest run --config vitest.unit.config.ts test/chat-system/integration/weekly-menu.test.ts
```

### On WhatToEatNext (Server-Side):

Verify that `/api/menu-planner/agent-weekly-menu` properly executes database transactions and maps results with no type mismatches or validation errors:

```bash
# Verify WTEN DB model is correctly updated
bunx prisma db pull
```
