# Privada Reforma - Technical Case Study

This repository contains the product, technical design, and implementation work for **Privada Reforma**, a residential operations platform built to replace fragmented community workflows (visitor access, guard operations, incidents, parking, packages, and resident communication).

This README is written as a portfolio/resume-oriented technical summary of:
- why key decisions were made,
- what complex use cases were solved,
- which engineering challenges were encountered,
- and what can be built next.

## 1) Product Context and Scope

### Problem
Residential communities typically run critical operations across WhatsApp, spreadsheets, and manual guard logs. This causes:
- weak traceability,
- delayed response for incidents and parking conflicts,
- high friction for visitors/deliveries,
- and inconsistent communication between residents, guards, and administration.

### Goal
Build an operational web platform where residents, guards, and admins share a single source of truth with role-based workflows, auditability, and mobile-first usability.

### Current Roles
- Resident / Tenant
- Guard
- Admin / Board

## 2) Main Use Cases Implemented

### Resident/Tenant use cases
- Create visitor QR access with strong validation rules.
- Create **delivery authorization** (Amazon/Uber/etc.) without requiring courier name.
- Report incidents, parking conflicts, and maintenance issues.
- Create and interact with pets, marketplace, polls, and directory entries.
- Comment on shared content and receive visual unread indicators.
- Manage profile settings (language, theme, push notifications).

### Guard use cases
- Validate QR manually (department + sequence), including collision and status checks.
- Approve/reject delivery entries from active delivery list (no scan flow).
- Register, stage, and deliver packages with state transitions.
- Review and resolve parking reports.
- Operate in offline mode with queued events and later synchronization.
- Access audit/logbook history.

### Admin/Board use cases
- Moderate reported content.
- Review operational dashboards and reports.
- Monitor cross-module activity and governance signals.

## 3) Architecture and Technical Decisions

### Frontend stack
- React 19 + TypeScript + Vite
- React Router v7
- Tailwind CSS v4
- Zod for runtime schema safety
- Vitest + Testing Library

Decision rationale:
- fast iteration and low ceremony for MVP,
- typed domain logic for safer refactors,
- predictable UI composition with reusable primitives.

### State strategy: local-first + Supabase-backed
- Core app state is centralized in `DemoDataContext` for rapid feature composition across modules.
- Data is persisted locally for resilience and rapid UX.
- Online paths sync with Supabase for cross-session visibility.

Decision rationale:
- unblock product discovery quickly,
- keep app usable under intermittent connectivity,
- progressively migrate high-value flows to shared backend state.

Tradeoff:
- centralized context is simple early on but can grow large; long-term split by domain stores/services is recommended.

### Role-based routing and workflow boundaries
- Router-level segregation ensures users land in the correct area (`/app`, `/guard`, `/admin`).
- Domain actions enforce role constraints (example: guard-only package delivery actions).

Decision rationale:
- reduce accidental misuse,
- improve mental model and security posture.

### QR model and invariants
- Access code format: `DDDD-NNNN` (department + per-department sequence).
- Guard flow validates by department/sequence and handles:
  - not found,
  - collision,
  - invalid status,
  - allow/reject with audit entry.

Decision rationale:
- deterministic, human-operable fallback when camera scan is unavailable.

### Offline and auditability
- Guard manual actions can queue offline events.
- Sync process flushes queued actions when connectivity returns.
- Audit log captures high-value operational decisions.

Decision rationale:
- real-world gate operations cannot depend on perfect connectivity.

### Media handling
- Image upload/compression paths are optimized for mobile constraints.
- Signed URL/private storage patterns are used for controlled access.
- Camera capture support is enabled in key workflows.

Decision rationale:
- reduce upload failures,
- improve performance and storage cost profile,
- maintain acceptable privacy boundaries.

### UI system decisions
- Premium black/neutral visual language across major resident and guard surfaces.
- Mobile-first layouts with bottom navigation.
- Iterative fixes for safe-area, overlap, and clickability issues.

Decision rationale:
- strong readability in real operational contexts,
- consistency across roles,
- better perceived product quality.

## 4) Data Layer and Migration Strategy

The project uses Supabase SQL migrations to progressively enable shared, multi-user flows.

Examples of shipped migration domains:
- core tables + RLS policies,
- packages/incidents workflows and RPC transitions,
- polls,
- pets + pet comments + profile fields,
- marketplace + moderation,
- maintenance reports,
- directory entries,
- app-wide comments,
- parking reports synchronization.

Migration folders in this repo:
- `privada-reforma-web/supabase/migrations`
- `privada-reforma-web/db/migrations/sql`

## 5) Technical Challenges Faced (and Resolutions)

### Challenge 1: Cross-session visibility gaps
Some flows initially existed only in local state, causing guard/resident mismatch across devices.

Resolution:
- wired critical flows to Supabase (read/write/update),
- added migration-backed tables and mapping logic,
- updated load bootstrapping in context provider.

### Challenge 2: Complex guard delivery reality
Residents often do not know courier identity for app-based deliveries.

Resolution:
- added delivery authorization flow that does not require courier name,
- created guard-side "active deliveries" list to approve/reject without scan,
- preserved audit logging on decisions.

### Challenge 3: Mobile bottom-nav overlap and blocked actions
Fixed bottom navigation could hide CTA buttons in long forms.

Resolution:
- switched layout behavior to avoid content being hidden under nav,
- improved scroll behavior and safe-area handling,
- validated click paths for guarded actions.

### Challenge 4: Media reliability under constrained devices
Large photos and unstable networks can break posting/reporting flows.

Resolution:
- integrated compression and graceful fallback behaviors,
- supported camera capture and improved upload feedback.

### Challenge 5: Product complexity growth
As modules expanded (pets, polls, marketplace, directory, moderation), consistency became harder.

Resolution:
- normalized shared UI patterns (`AppCard`, `AppButton`, reusable media components),
- reused app comments pattern across modules,
- standardized status flows and error messages.

## 6) Quality and Validation Approach

Standard validation loop used in active development:
- Typecheck
- Unit/integration tests (Vitest)
- Production build verification

Useful commands (from app folder `privada-reforma-web`):
- `npm run dev`
- `npm run test`
- `npm run build`

On this machine, absolute executables are also documented in:
- `AGENTS.md`

## 7) Resume-Ready Engineering Highlights

- Designed and implemented a multi-role residential operations platform with role-aware routing and domain constraints.
- Built resilient guard workflows with offline queuing + audit trails for high-stakes access decisions.
- Implemented deterministic QR access model with collision handling and manual validation fallback.
- Shipped Supabase-backed synchronization across incidents, packages, parking, moderation, and social modules.
- Led iterative UX hardening on mobile (navigation overlap, form accessibility, photo workflows, and status feedback).
- Drove bilingual and theme-aware interface consistency while scaling feature breadth.

## 8) What Can Be Built Next

### High-impact next steps
- Real-time subscriptions for guard dashboards (live parking/package updates).
- End-to-end QR persistence in Supabase (currently partially local for some access scenarios).
- Dedicated notifications center with per-module unread states and acknowledgment.
- Domain-level store decomposition (reduce context size and improve maintainability).
- Observability layer (error reporting, user journey telemetry, operational SLA metrics).

### Product expansion candidates
- Visitor pre-check with ETA windows and geofenced arrival hints.
- Smart escalation rules for incidents/parking (priority + inactivity triggers).
- Admin analytics for response times, recurrent issues, and community health KPIs.

## 9) 1-Minute Interview Pitch

"Privada Reforma is a multi-role residential operations platform I built to replace fragmented guard and resident workflows with a unified, auditable system. I designed a local-first architecture with Supabase synchronization, implemented deterministic QR access with guard-side manual validation and collision handling, and shipped offline-capable operational flows for real-world reliability. I also led cross-module UX hardening for mobile, including navigation safety, media reliability, bilingual support, and premium visual consistency. The project demonstrates end-to-end ownership across product definition, architecture, delivery, and iterative reliability improvements under real operational constraints."

## 10) Repository Pointers

- App code: `privada-reforma-web`
- App architecture guide: `AGENTS.md`
- Product and planning docs: root-level `PrivadaReforma_*` files
- Existing app README (baseline project README): `privada-reforma-web/README.md`
