# AGENTS.md — Vaya

Monorepo for a couple's shared space (wishlists, calendar, todos). UI and docs are in Russian.

## Layout

npm workspaces (`apps/*`, `packages/*`):

| Path | What it is |
|------|------------|
| `apps/api` | NestJS + Prisma backend. Real entry: `src/main.ts`. Modules under `src/modules/*`. |
| `apps/web` | React 18 + Vite + Tailwind frontend. Entry: `src/main.tsx`. |
| `packages/shared` | Shared types/constants. Built to `dist/`. |
| `docs/TZ.txt` | Product spec (access matrix, surprise scenario, out-of-scope). Authoritative for product rules. |

**`@vaya/shared` is declared as a dependency but not imported by any app.** Web has its own `src/shared/api-client.ts` — that is unrelated to the workspace package. Enums are currently duplicated: Prisma enums in `apps/api/prisma/schema.prisma`, string literals in web pages.

## Commands

```bash
npm install
npm run db:up                          # docker compose postgres (user/pass/db: vaya)
cp .env.example .env                   # root template
cp .env.example apps/api/.env          # Nest/Prisma read this one (cwd = apps/api)

npm run prisma:migrate                 # from root; = -w @vaya/api
npm run prisma:seed                    # WIPES ALL DATA and reseeds
npm run dev                            # api :3000 + web :5173 concurrently
```

- API: `http://localhost:3000/api/v1` · Swagger: `http://localhost:3000/api/docs`
- Web proxies `/api` → `localhost:3000` (see `apps/web/vite.config.ts`)
- Seed accounts: `yana@example.com` / `vanya@example.com`, password `password123`, invite `VAYA2026`

Build order matters — `shared` emits `dist/` first:

```bash
npm run build   # shared → api → web
```

After Prisma schema changes: `npm run prisma:generate` then `prisma:migrate` (both in `apps/api`).

### Things that look real but are not

- **`npm run lint` is broken.** ESLint is referenced in scripts but not installed and has no config. Do not treat lint as a verification step.
- **There are no tests.** Jest is configured in `apps/api` for `src/**/*.spec.ts`, but zero spec files exist. `npm test` will fail with "No tests found" until you add one. Run a single test from `apps/api`: `npx jest path/to/file.spec.ts`.
- **No typecheck script.** Web typechecks only inside `npm run build -w @vaya/web` (`tsc -b`). API typechecks via `nest build`. For a quick web check: `npx tsc -b` in `apps/web`.
- No CI, no Prettier, no husky.

## Environment gotcha

Nest `ConfigModule` and Prisma load `.env` from the workspace cwd (`apps/api/`), **not** the repo root. Root `.env` exists but the API does not read it. Both `PORT`, `DATABASE_URL`, `JWT_*`, `CORS_ORIGIN` must be in `apps/api/.env`.

## Auth model

- Access token: `localStorage`, sent as `Bearer`.
- Refresh token: httpOnly cookie `vaya_refresh`, **path-scoped to `/api/v1/auth`** (not `/`). Auto-refresh on 401 lives in `apps/web/src/shared/api-client.ts`.
- Public routes: `/auth/*`, `/health`, `/calendar/feed/:token.ics`. Everything else needs auth; couple-scoped resources also use `CoupleGuard`.

## Dark theme (easy to break)

Multiple rewrites burned time here. Final approach:

1. CSS variables `--t-*` defined in a **critical `<style>` block in `apps/web/index.html`**, plus an inline script that toggles `html.dark` before paint (anti-flash). `darkMode: 'class'` in Tailwind is only the switch.
2. Colors are **not** Tailwind palette classes. Use the custom classes in `apps/web/src/index.css`: `.theme-bg`, `.theme-surface`, `.theme-muted`, `.theme-hover`, `.card`, `.input`, `.btn-primary`, `.nav-item`, etc. They read `var(--t-*)`.
3. `ThemeContext` sets the class and `localStorage['vaya-theme']`. Keep it in sync with the inline script.

Do not introduce hardcoded hex colors in components (except the purple brand `#6c5ce7` already used in `.btn-primary` / `.nav-item-active`).

## Product rules that affect code

- **Surprise scenario (TZ G4):** partner may reserve a wish; the owner must not see *that* it is reserved or *who* reserved it. `wishes.service` has a `hideReserved` filter and reservation ownership checks — respect this when changing wish DTOs or list queries. Currently `toDto` returns `reservedById` to all viewers; the web does not pass `hideReserved`. If you touch this area, preserve the intent.
- Visibility model: `PERSONAL` vs `SHARED` (couple) on wishlists and events. `CoupleGuard` only checks membership, not resource ownership — services do the owner checks.
- ICS feed is intentionally unauthenticated (token in URL). Token is per-user, regenerable.

## Style / workflow

- Conventional commits observed: `feat:`, `fix:`, with optional scope (`fix(dark-theme):`, `feat(todos):`).
- Feature branch → PR → merge to `main` (see `feat-dark-theme-hover-and-feed-overflow`).
- TypeScript `strict` from `tsconfig.base.json`. `apps/api` relaxes `noUnusedLocals`/`noUnusedParameters` and `strictPropertyInitialization` for Nest decorators; `apps/web` also relaxes unused checks.
- Node >= 20. Use npm (lockfile is `package-lock.json`), not pnpm/yarn.

## Where things live (non-obvious)

- Prisma schema + migrations + seed: `apps/api/prisma/`
- Global API prefix `api/v1` and Swagger setup: `apps/api/src/main.ts`
- Guards/decorators: `apps/api/src/common/`
- Web routes: `apps/web/src/App.tsx` (`/app/*` is the protected shell)
- Feed token UI: `/app/settings/calendar-feed`
