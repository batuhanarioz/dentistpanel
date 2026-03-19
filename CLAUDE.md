# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server
npm run build      # Production build (runs next build + Sentry source maps)
npm run lint       # ESLint check
npx vitest         # Run unit tests (vitest)
npx vitest run src/lib/validations/appointment.test.ts  # Run a single test file
npx playwright test  # Run E2E tests
```

There is no `npm test` shortcut — use `npx vitest` directly.

## Architecture Overview

**Multi-tenant SaaS** — a single Next.js deployment serves all dental clinics. Each clinic is isolated by `clinic_id` in every Supabase table. SUPER_ADMIN users have no `clinic_id` and manage the platform.

### Tech Stack
- **Next.js 15** App Router (all under `src/app/`)
- **Supabase** (auth + database + RLS)
- **React Query** (`@tanstack/react-query`) for data fetching/caching
- **Zod** for schema validation
- **Tailwind CSS v4**
- **Sentry** for error monitoring (`next.config.ts` wraps with `withSentryConfig`)

### Routing Structure

```
/                          → Landing page (src/app/page.tsx)
/login                     → Auth (no AppShell)
/[slug]/                   → Clinic dashboard
/[slug]/appointment-management
/[slug]/payment-management
/[slug]/patients
/[slug]/appointments
/[slug]/reports
/[slug]/admin/users
/[slug]/admin/subscription
/platform/clinics/         → SUPER_ADMIN: system settings
/platform/clinics/manage   → SUPER_ADMIN: clinic CRUD
/platform/clinics/activity → SUPER_ADMIN: activity feed
/platform/clinics/monitoring → SUPER_ADMIN: USS monitoring
```

All `[slug]/*` and `platform/*` routes live inside `src/app/(panel)/` route group, which wraps everything in `AppShell` via `src/app/(panel)/layout.tsx`.

### Auth & Session Flow

1. `(panel)/layout.tsx` → dynamically imports `AppShell` (SSR disabled)
2. `AppShell` → renders `AuthGuard` for all non-login pages
3. `AuthGuard` (`src/app/components/AuthGuard.tsx`) — on mount:
   - Calls `supabase.auth.getUser()`
   - Fetches `users`, `clinics`, `clinic_automations`, `clinic_settings` tables
   - Populates `ClinicContext` with session + clinic data
   - Handles SUPER_ADMIN switching between clinics via URL slug
4. `ClinicContext` (`src/app/context/ClinicContext.tsx`) — provides `clinicId`, `userRole`, `isSuperAdmin`, `workingHours`, `n8nWorkflows`, `clinicSettings`, etc. to all child components via `useClinic()` hook

### Data Access Layer

**Client-side queries:** `src/lib/api.ts` — all direct Supabase calls from the browser. Uses `supabase` (anon key, subject to RLS).

**Server-side (API Routes):** `src/app/api/` — protected with `withAuth()` from `src/lib/auth-middleware.ts`. Uses `supabaseAdmin` (service role key, bypasses RLS).

**Hooks:** `src/hooks/` — wrap `api.ts` functions with React Query or local state. Most hooks call `useClinic()` to get `clinicId`.

### Type System — Important Duplication

There are **two database type files** that are NOT identical:

| File | Style | Notable difference |
|------|-------|-------------------|
| `src/types/database.ts` | `enum UserRole` + full interfaces | Canonical — use this one |
| `src/app/types/database.ts` | `type UserRole = string union` | Older/partial — being phased out |

Always import types from `@/types/database`. The `src/app/types/database.ts` file exists only for legacy compatibility.

`UserRole` enum also has legacy Turkish aliases (`DOKTOR`, `SEKRETER`, `FINANS`) that map to the same DB values — handle these in comparisons.

### API Route Pattern

```typescript
// src/app/api/some-feature/route.ts
import { withAuth } from "@/lib/auth-middleware";

export const POST = withAuth(async (req, ctx) => {
  // ctx.clinicId, ctx.role, ctx.isSuperAdmin, ctx.user.id
  const body = await req.json();
  const validated = someSchema.safeParse(body);
  // ...
}, { requiredRole: "ADMIN_OR_SUPER" });
```

### Timezone

All timestamps stored as UTC in Supabase. Date range queries use hardcoded `+03:00` offset (Istanbul):
```typescript
.gte("starts_at", `${date}T00:00:00+03:00`)
```
DST is not handled. Date display uses `Intl.DateTimeFormat` with `timeZone: 'Asia/Istanbul'`.

## Key Known Issues (Technical Debt)

- **`src/lib/api.ts`** uses `// eslint-disable` + `any` types extensively — proper interfaces need to be added
- **`usePaymentManagement`** hook has 50+ `useState` calls — needs refactoring
- **Duplicate types** — `src/app/types/database.ts` vs `src/types/database.ts` (see above)
- **Tests are sparse** — `vitest.config.ts` is set up but only validation files have tests
- All API routes lack rate limiting
- `AppShell` uses `window.openSupportModal` as a global (anti-pattern)

## Supabase Tables (Core)

`clinics`, `users`, `patients`, `appointments`, `payments`, `clinic_settings`, `clinic_automations`, `checklist_items`, `checklist_definitions`, `checklist_clinic_roles`, `treatment_definitions`, `audit_logs`, `announcements`, `announcement_reads`

RPC used: `refresh_checklist_items(p_clinic_id)` — refreshes pending checklist tasks.

## Roles

`SUPER_ADMIN` > `ADMIN` ≈ `ADMIN_DOCTOR` > `DOCTOR` > `RECEPTION` > `ASSISTANT` > `FINANCE`

`isAdmin` in context = `ADMIN || SUPER_ADMIN`. Reports and subscription pages are admin-only.
