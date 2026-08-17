# @2xfactor/web

Next.js 14 (App Router) + TypeScript + Tailwind frontend for the 2xFactor
NestJS sandbox API — wallets, deposits, withdrawals, plans/subscriptions,
tasks, earnings, referrals, KYC, notifications, support, and a
permission-gated admin console.

## Dropping this into the turborepo

This folder is `apps/web`, package name `@2xfactor/web`, matching the
`@2xfactor/database` convention already used by the API.

```bash
# from the monorepo root
cp -r web apps/web
```

There's deliberately no `pnpm-lock.yaml` or `node_modules` in here — this
app joins the workspace's single root lockfile, not its own. After
copying it in:

```bash
# from the monorepo root
pnpm install          # updates the root pnpm-lock.yaml with this app's deps
pnpm --filter @2xfactor/web dev
```

Make sure the root `pnpm-workspace.yaml` includes `apps/*` (it should
already, since the API lives there too). If `turbo.json` at the root
doesn't yet define `dev`/`build`/`lint` pipeline tasks, add:

```json
{
  "tasks": {
    "build": { "outputs": [".next/**", "!.next/cache/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": {}
  }
}
```

(`tasks` is the Turborepo 2.x key — if this repo is still on Turborepo 1.x
config, use `pipeline` instead.)

## Setup (standalone dev, outside the monorepo)

```bash
pnpm install
cp .env.local.example .env.local   # point NEXT_PUBLIC_API_URL at your API
pnpm dev
```

Your NestJS API sets a global prefix of `api` (`main.ts`) and listens on
`process.env.PORT || 3000` — but `configuration.ts` defaults `PORT` to
`4000`. Check what your `.env` actually sets and adjust
`NEXT_PUBLIC_API_URL` accordingly (defaults to `http://localhost:4000/api`).

## Architecture

- `src/lib/api-client.ts` — single fetch wrapper. Attaches the bearer
  token, unwraps the `{ success, data }` / `{ success: false, error }`
  envelope from `ResponseInterceptor` / `HttpExceptionFilter`, and
  transparently refreshes the access token once on a 401 before retrying
  (de-duped so a burst of parallel requests doesn't fire `/auth/refresh`
  multiple times).
- `src/lib/api/*.ts` — one typed module per NestJS controller
  (`auth`, `wallet`, `deposits`, `withdrawals`, `plans`, `tasks`,
  `earnings`, `referrals`, `kyc`, `notifications`, `support`, `utilities`,
  `admin`). Each function maps 1:1 to an endpoint.
- `src/lib/auth-context.tsx` — session state. See the note below on why
  it caches the full user object instead of relying on `GET /auth/me`.
- `src/components/ui/*` — the shared design system (Button, Card, Table,
  Modal, Tabs, StatusPill, StatCard, Toast, etc). Every page is built
  from these instead of one-off markup.
- `src/app/(app)/*` — the authenticated user app (dashboard, wallet,
  deposits, withdrawals, plans, subscriptions, tasks, earnings,
  referrals, kyc, notifications, support, utilities, settings), gated by
  `(app)/layout.tsx`.
- `src/app/admin/*` — the admin console, gated separately by
  `admin/layout.tsx` on `roles.includes('admin')`.

## Known backend gaps worth fixing

1. **`GET /auth/me` only returns `{ id, email, roles }`.**
   `AuthController.me()` echoes `request.user` from the JWT payload —
   it was never joined back to the `users` table, so `firstName`,
   `lastName`, `status`, `referralCode`, etc. aren't there. The frontend
   works around this by caching the full user object returned from
   `/auth/login` and `/auth/register` (see `tokenStore.setCachedUser` in
   `api-client.ts`) and only using `/auth/me` to validate the session and
   refresh `roles`. Add a real `GET /users/me` (or expand the JWT
   strategy to hydrate from the DB) so a page refresh doesn't depend on
   client-cached state.
2. **No endpoint to read a user's own granted permissions.** Admin
   actions are gated by both `@Roles('admin')` and
   `@RequirePermission(...)` server-side, but there's no way for the
   frontend to know in advance which specific actions an admin can take —
   it just attempts the action and surfaces the 403 if the permission is
   missing. An endpoint like `GET /admin/me/permissions` would let the
   UI hide actions a given admin can't perform instead of letting them
   fail.
3. **No "update my profile" endpoint.** `/settings` is read-only for
   this reason — there's nowhere to `PATCH` name/phone.
4. **`AuthService.login` has stray `console.log` calls** (email,
   password-validity flag, user record) — worth stripping before this
   goes anywhere near production, since it's currently logging whether a
   given password attempt was valid.

## Design system

Dark "ledger" theme: near-black surfaces (`#0A0D11` / `#10141A` /
`#151A21`), mint (`#33D48F`) for gains/positive states, amber
(`#E8A94A`) as the secondary "2x" accent, monospace tabular figures
(IBM Plex Mono) for every balance and amount so digits align like a
ledger sheet, and a faint repeating horizontal-rule background
(`.ledger-surface`) behind large numbers as the one signature visual
element.

Runs on **Tailwind v4** — there's no `tailwind.config.ts`; every color,
radius, and shadow token lives in `src/app/globals.css` under `@theme`.
The font tokens use `@theme inline` specifically because they reference
CSS variables that `next/font` sets at runtime (see the comment at the
top of that file, and `layout.tsx` for why the font variable names were
deliberately changed from `--font-*` to `--display-font` /
`--body-font` / `--mono-font` — that avoids colliding with Tailwind v4's
own `--font-*` theme namespace).
