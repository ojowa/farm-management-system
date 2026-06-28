# apps/admin TODO — Farm Management Admin Console

## Phase 0 — Foundation (must-have)
- [ ] Add consistent admin shell layout (top nav/sidebar/breadcrumbs) in `apps/admin/src/app/layout.tsx`
- [ ] Add auth + role gating (ensure only Admin/SuperAdmin can access)
- [ ] Add global admin styling (Tailwind config integration if not already active)
- [ ] Add API client wrapper for admin endpoints (shared patterns with `apps/web`/`packages/utils`)
- [ ] Standardize UI components (table, modal, form fields, toast/alert, pagination)

## Phase 1 — Cross-cutting UI/UX for all admin modules
- [ ] Build common ListPage component:
  - [ ] column definitions
  - [ ] sorting (client-side for now if backend lacks)
  - [ ] filtering controls (search, status, date range where applicable)
  - [ ] pagination UI
- [ ] Build common DetailPage + Edit/Create forms:
  - [ ] form validation with zod
  - [ ] submit loading + disabled states
  - [ ] error banner + field errors
- [ ] Build audit-log-friendly table:
  - [ ] request id / actor / action / timestamp rendering
  - [ ] JSON payload viewer (optional but recommended)

## Phase 2 — Module implementation by route folder (feature choice: Frontend + add/verify backend admin endpoints)

### `apps/admin/src/app/users/`
- [ ] Users list
  - [ ] search by name/email
  - [ ] status toggle (active/disabled) UI if supported
- [ ] User detail page
  - [ ] roles/groups display
  - [ ] MFA status display (if applicable)
- [ ] User create/edit form
  - [ ] role assignment UI
  - [ ] reset password flow UI (if backend supports)
- [ ] User delete/disable flow UI (prefer disable if soft-delete exists)

### `apps/admin/src/app/tenants/`
- [ ] Tenants list
  - [ ] filter by plan/status
- [ ] Tenant detail
  - [ ] subscription summary
  - [ ] org limits/quotas display if backend supports
- [ ] Tenant create/edit
  - [ ] tenant name, slug, owner assignment
- [ ] Tenant lifecycle actions
  - [ ] activate/deactivate
  - [ ] rotate API keys (if exists)

### `apps/admin/src/app/subscriptions/`
- [ ] Subscriptions list
  - [ ] filter by tenant
  - [ ] status (active/trial/canceled)
- [ ] Subscription detail
  - [ ] plan, billing period, renewal date
- [ ] Subscription update UI
  - [ ] change plan
  - [ ] cancel subscription
  - [ ] resume/reactivate
- [ ] Billing events history view (if backend provides)

### `apps/admin/src/app/billing/`
- [ ] Billing overview dashboard
  - [ ] invoices list
  - [ ] payments history
- [ ] Invoice detail view
  - [ ] invoice line items
  - [ ] download/print button (if backend supports)
- [ ] Manual billing actions (only if backend supports)
  - [ ] issue invoice
  - [ ] refund payment

### `apps/admin/src/app/monitoring/`
- [ ] System health page
  - [ ] service status cards (if backend supports)
  - [ ] uptime/latency charts (can be simple first)
- [ ] Error dashboard
  - [ ] list errors by service/time
  - [ ] drill into stack trace / metadata (if available)
- [ ] Performance metrics page
  - [ ] request rate, error rate, p95/p99 latency (as available)

### `apps/admin/src/app/audit/`
- [ ] Audit logs list page
  - [ ] filter by actor, entity type, action, date range
- [ ] Audit log detail page
  - [ ] formatted diff / before-after (if backend supports)
- [ ] Export audit logs (only if backend supports)
  - [ ] CSV/JSON download button

## Phase 3 — Security & correctness
- [ ] Ensure admin API calls include correct auth tokens/headers
- [ ] Add CSRF/XSS safe rendering for log payloads (escape/format JSON safely)
- [ ] Add permission checks on frontend (in addition to backend enforcement)
- [ ] Handle “forbidden” and “not found” cleanly

## Phase 4 — Real-time / live updates (if backend supports)
- [ ] Monitoring: live updates for errors/health via Socket.IO if available
- [ ] Audit: append new audit events (or auto-refresh list)

## Phase 5 — Testing & build readiness
- [ ] Add basic admin route smoke tests (render + auth gate)
- [ ] Add form submission tests for at least:
  - [ ] user edit
  - [ ] tenant edit
  - [ ] subscription cancel/change
- [ ] `next build` + `next lint` clean for `apps/admin`

