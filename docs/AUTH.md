# Authentication

Two independent auth systems, deliberately kept separate in the UI:

| System       | Purpose                               | Provider               | Where                                   |
| ------------ | ------------------------------------- | ---------------------- | --------------------------------------- |
| **Identity** | Who you are (account, profile, yield) | Google via NextAuth v4 | `lib/auth-options.ts`, `lib/auth.ts`    |
| **Wallet**   | On-chain economy (staking, x402)      | Dynamic Labs / Circle  | `components/auth/DynamicCircleProvider` |

This doc covers **identity**. The "Log in" button is identity; "Connect wallet" is the wallet — a user can do either or both.

## How identity sign-in works

Client entry point: **`lib/auth-client.ts` → `startGoogleSignIn(callbackPath)`**. Every button (landing nav + hero, `/auth/signin`, `/yield`) calls it. It has two modes, selected by `NEXT_PUBLIC_AGENTS_LOCAL_AUTH`:

- **Local (`=== 'true'`)** — signs in through **this app's own** NextAuth Google provider (`signIn('google')`). The callback URL is same-origin, so the user stays on `agents.alchm.kitchen`. NextAuth writes the session cookie on `.alchm.kitchen`, so it's shared with every subdomain (and the desktop handshake).
- **Legacy (flag unset/false)** — bounces to `alchm.kitchen`'s Google handler via `buildKitchenSignInUrl`. **This is the source of the "logged in but landed on the kitchen profile" bug**: `alchm.kitchen` runs Auth.js v5, whose `redirect` callback rejects the cross-origin `callbackUrl` back to `agents.alchm.kitchen` and falls back to its own domain.

Server-side, `lib/auth.ts` resolves a session in this order:

1. **Native** NextAuth session (this app's own Google flow).
2. **Kitchen bridge** (`lib/auth-bridge.ts`) — if the user is signed in on `alchm.kitchen`, its `.alchm.kitchen` cookie is forwarded server-to-server to `alchm.kitchen/api/auth/session` and trusted. Kept in **both** modes so existing kitchen users are still recognized.

Turning on local auth does **not** remove the bridge — it just gives this app its own front-door so login no longer depends on the kitchen's redirect behavior.

## Cutover checklist (legacy → local)

The code ships defaulting to **legacy** so nothing breaks before credentials exist. To activate local sign-in:

1. **Google Cloud Console** — on the OAuth 2.0 client (reuse the alchm.kitchen client, or make a new one):
   - Authorized JavaScript origin: `https://agents.alchm.kitchen`
   - Authorized redirect URI: `https://agents.alchm.kitchen/api/auth/callback/google`
2. **Vercel env** (agents project, `cookingwithcastro-llc/alchm-agents-eth`, Production):
   - `AUTH_GOOGLE_ID` = client id
   - `AUTH_GOOGLE_SECRET` = client secret
   - `NEXTAUTH_URL` = `https://agents.alchm.kitchen`
   - `AUTH_SECRET` — already set. Keep it identical to the kitchen's if you want the JWTs mutually decodable.
   - `NEXT_PUBLIC_AGENTS_LOCAL_AUTH` = `true` ← the switch
3. **Redeploy.** Verify: click **Log in** on the landing page → Google → you return to `https://agents.alchm.kitchen/profile` (not the kitchen).

Rollback is one variable: set `NEXT_PUBLIC_AGENTS_LOCAL_AUTH=false` (or remove it) and redeploy to fall back to the kitchen bounce.

### Set the Vercel vars via CLI

```bash
# from the repo root (already linked to the agents project)
printf '%s' "<client-id>"      | vercel env add AUTH_GOOGLE_ID production
printf '%s' "<client-secret>"  | vercel env add AUTH_GOOGLE_SECRET production
printf '%s' "https://agents.alchm.kitchen" | vercel env add NEXTAUTH_URL production
printf '%s' "true"             | vercel env add NEXT_PUBLIC_AGENTS_LOCAL_AUTH production
```

## Local development

Set the same four vars in `.env` with `NEXTAUTH_URL=http://localhost:3000` and add
`http://localhost:3000/api/auth/callback/google` to the Google client's redirect URIs.
With the flag off, local dev uses the kitchen bounce (needs no Google client of its own).
