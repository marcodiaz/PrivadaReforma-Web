# AGENTS.md - Privada Reforma Workspace Guide

This file gives any new coding agent enough context to work in this workspace without re-discovering the codebase from zero.

## Workspace Layout

- Root workspace: `C:\Users\marco.diaz\OneDrive - Thermo Fisher Scientific\Documents\Codex Projects\Privada Reforma`
- Main app (active code): `C:\Users\marco.diaz\OneDrive - Thermo Fisher Scientific\Documents\Codex Projects\Privada Reforma\privada-reforma-web`
- SQL/migrations (app-level): `...\privada-reforma-web\db\migrations\sql`
- Extra supabase folder at root: `...\supabase` (external/project-level artifacts)
- Product/docs files live in root (`PRD`, one-pagers, backlog CSVs, etc.) and are context, not runtime app code.

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- React Router v7
- TanStack Query
- Supabase JS v2
- Vitest + Testing Library

## Runtime and Local Machine Notes

This machine has Node installed, but shell PATH can be inconsistent across sessions.

- Known working Node executable:
  - `C:\Progra~1\nodejs\node.exe`

When `node`/`npm` are not recognized, use absolute commands:

- Typecheck:
  - `C:\Progra~1\nodejs\node.exe node_modules\typescript\bin\tsc -p tsconfig.app.json --noEmit`
- Tests:
  - `C:\Progra~1\nodejs\node.exe node_modules\vitest\vitest.mjs run`
- Build:
  - `C:\Progra~1\nodejs\node.exe node_modules\vite\bin\vite.js build`
- Dev server:
  - `C:\Progra~1\nodejs\node.exe node_modules\vite\bin\vite.js`

Recommended PATH for future shells:

- Add `C:\Program Files\nodejs` to user/system PATH.
- Restart terminal/app after PATH updates.

## App Architecture

### Providers and Boot

- Entry: `privada-reforma-web/src/main.tsx`
- App root: `privada-reforma-web/src/app/App.tsx`
- Providers composition:
  - `QueryClientProvider`
  - `SupabaseAuthProvider`
  - `DemoDataProvider`

### Routing

- Router: `privada-reforma-web/src/app/router.tsx`
- Public:
  - `/login`
- Resident/Tenant App area:
  - `/app/home`
  - `/app/visits`
  - `/app/packages`
  - `/app/pool`
  - `/app/incidents`
  - `/app/announcements`
  - `/app/finance`
  - `/app/profile`
- Guard area:
  - `/guard/scan`
  - `/guard/packages`
  - `/guard/logbook`
  - `/guard/incidents`
  - `/guard/offline`
- Admin/Board area:
  - `/admin/dashboard` plus other admin pages.

### State and Domain Center

Primary domain state is in:

- `privada-reforma-web/src/shared/state/DemoDataContext.tsx`

It owns:

- incidents
- qrPasses
- packages
- auditLog
- offlineQueue
- online/offline sync
- auth session bridge

Persistence:

- Local storage utilities: `privada-reforma-web/src/shared/storage/storage.ts`
- Schema versioning currently resets local storage on version mismatch.

Supabase integration:

- Config: `privada-reforma-web/src/shared/supabase/client.ts`
- Data ops: `privada-reforma-web/src/shared/supabase/data.ts`
- Auth/profile bridge: `privada-reforma-web/src/shared/auth/SupabaseAuthProvider.tsx`

## QR Access Flow (Critical)

QR logic utilities:

- `privada-reforma-web/src/features/access/qrLogic.ts`

Creation flow:

- `AppVisitsPage` calls `createQrPass` in `DemoDataContext`.

Rules in `createQrPass` (must preserve unless explicitly changed):

1. Session required.
2. Block when `debtMode` is active.
3. Department code must be exactly 4 digits.
4. Last department digit must be `1` or `2`.
5. QR types:
   - `temporal` -> `single_use`
   - `time_limit` -> `time_window`
6. Time limits:
   - `week` -> +7 days
   - `month` -> +30 days
   - `permanent` -> no end date
7. For `month`/`permanent`, visitor photo URL is required.
8. `displayCode` format: `DDDD-NNNN` where:
   - `DDDD` is department code
   - `NNNN` is per-department auto-increment sequence.

Guard validation flow:

- Guard manual scan validates by `departmentCode + sequenceCode` using:
  - `findPassesByDepartmentSequence`
- Handles:
  - no match -> reject + audit
  - multiple matches -> collision reject + audit
  - inactive/expired/used/revoked -> reject + audit
  - allow on `single_use` -> mark pass as `used` + audit

Offline behavior:

- Events enqueue in `offlineQueue`.
- `flushOfflineQueueWithApi` syncs when online and writes audit entries.

## Current UI/Theme Decisions

Recent design direction intentionally avoids screenshot 1:1.

- Visual language: premium black/neutral (Tesla/Uber/Airbnb-inspired).
- Keep legacy layout logic and module information hierarchy.
- Primary resident views modernized:
  - home dashboard cards/grid
  - visits registration form
  - QR modal presentation
- Core files:
  - `privada-reforma-web/src/index.css`
  - `privada-reforma-web/src/app/layouts/AppLayout.tsx`
  - `privada-reforma-web/src/features/app/pages.tsx`
  - `privada-reforma-web/src/shared/ui/AppCard.tsx`
  - `privada-reforma-web/src/shared/ui/AppButton.tsx`
  - `privada-reforma-web/src/shared/ui/ModulePlaceholder.tsx`

## QR UX Enhancements Implemented

Additional optional QR fields in domain schema:

- `visitorName`
- `maxUses`
- `maxPersons`
- `accessMessage`

New QR helper functions:

- `buildQrPayload(...)`
- `buildQrImageUrl(...)`

Visits modal now includes:

- Scannable QR image (generated from payload)
- Visitor summary and message
- Copy payload/link button

## Environment Variables

Supabase env vars used by Vite:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- optional dev helper:
  - `VITE_DEV_TOOLS=true` to show profile role/unit switcher.

## Testing and Validation Checklist

From `privada-reforma-web` folder:

1. Typecheck with absolute node command if PATH fails.
2. Run vitest suite.
3. Run production build.
4. For QR changes, manually verify:
   - create temporal QR
   - create time-window QR (week/month/permanent)
   - month/permanent enforces photo URL
   - guard scan allow/reject behavior
   - single-use transitions to `used` after allow.

## Safe-Change Guidance for Future Agents

- Do not change QR code format (`DDDD-NNNN`) without explicit approval.
- Do not remove guard collision detection.
- Do not bypass dept validation rule (4 digits; last digit 1/2) without explicit product decision.
- Preserve offline queue + audit behavior for guard operations.
- Keep mobile-first layout intact (max width + bottom nav ergonomics).
- When touching shared theme tokens, review guard/admin screens for contrast regressions.

