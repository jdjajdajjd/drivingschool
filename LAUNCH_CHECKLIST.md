# Vroom Launch Checklist

This file tracks what still separates the current product from a clean paid rollout.

## Ready now

- Public entry page clearly separates demo, workspace school, and super-admin access.
- Student, demo admin, workspace admin, and super-admin routes build and open.
- Cloudflare production deploy and smoke check are working.
- Product QA scripts exist for public, student, and admin surfaces.
- Admin settings now includes a practical 1-3 day school onboarding checklist.
- Students can be imported from CSV and exported back to CSV for Excel/WhatsApp migration.
- Public legal pages and consent copy cover terms, privacy, and personal-data processing basics.

## Launch documents

- `docs/launch/SALES_KIT.md` - offer, demo script, cold email, objections, honest scope.
- `docs/launch/ONBOARDING_RUNBOOK.md` - day-by-day pilot setup and CSV migration format.
- `docs/launch/LEGAL_MINIMUM_RU.md` - personal-data checklist for Russian pilots.
- `docs/launch/SUPPORT_SLA_BACKUP.md` - support priorities, health checks, backups, incidents.
- `docs/launch/TENANT_SECURITY_CHECKLIST.md` - tenant isolation and role verification plan.

## Must finish before paid launch

### 1. Real auth hardening

- Replace browser-only access storage for staff routes with stronger auth or server-backed session handling.
- Finalize the student login flow so password and session handling are not primarily local browser state.
- Add password reset / recovery flow for school staff and students.

### 2. Data authority cleanup

- Define the single source of truth for production data: Supabase first, local compatibility second.
- Remove risky dependence on seeded browser data in production-only flows.
- Verify that demo and workspace data never leak into one another.

### 3. Full end-to-end rollout scenario

- Super-admin creates a school.
- School receives credentials and enters workspace.
- School configures branches, instructors, and slots.
- Student creates a cabinet, books a lesson, and the admin sees that booking.
- Booking updates remain visible after reload and across devices.

### 4. Operational basics

- Add a production error reporting path.
- Add a simple admin/support runbook for login issues and broken bookings.
- Add at least one backup export path for schools or critical data.

## Important but can follow shortly after launch

- Route and copy cleanup across remaining internal docs.
- Removal of compatibility-only helper paths once production auth is finalized.
- Broader UI polish for admin density and student cabinet clarity.
- Better onboarding for newly created schools.

## Current product risk summary

- The app is already strong enough for demos, previews, and early pilot conversations.
- The main remaining launch blockers are auth trust, data authority, and full real-world workflow verification.
