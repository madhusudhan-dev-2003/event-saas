# Utsava / Celebration build tracker

Updated 14 September 2026. This tracker supersedes the initial existing-app plan.

## Approved scope

Build a completely NEW project in `C:/Users/vssru/Documents/Projects/Celebration`. Preserve the PDF's product goals; its canonical old-project path, preservation/migration instructions and historical test claims do not apply to this implementation. The previous application has not been changed. New architecture: Node.js/Next.js + Neon PostgreSQL, deployable to Hostinger or Vercel, Stripe software subscriptions, OmniRoute AI gateway. No MySQL migration.

## Current evidence

- New Next.js/React/TypeScript application; page/API routes compile in the latest production build.
- Three Prisma migrations applied to an isolated local PostgreSQL 18 database, `127.0.0.1:55439/celebration_dev`.
- 46 automated tests passed: 29 unit tests and 17 opt-in database integration tests. Provider HTTP is mocked in Stripe tests; no live payments made.
- Browser verified account creation, family-space onboarding, name-only birthday creation, refresh persistence, checklist editing/save/reload, household invitation creation, and RSVP response persistence.
- Desktop dashboard visually reviewed. Active preview tested at 390px viewport: document width 375px, no horizontal page overflow. Full mobile/keyboard acceptance remains open.
- Figma desktop/mobile concepts created and reviewed: https://www.figma.com/design/oQHSZBbMZdwKLGEf5TizZk
- New app preview: http://127.0.0.1:3100
- No production deployment, live Neon verification, real Stripe checkout, real mail delivery, or OmniRoute provider call has been claimed.

## Step-by-step delivery ledger

| Step | Scope / requirements | Status | Next acceptance gate |
|---|---|---|---|
| 01 | Read all 9 requirements pages | Done | Extraction preserved in requirements-extracted.txt |
| 02 | Resolve architecture and project location, ARC-01/06 | Done | New project approved; old app untouched |
| 03 | Fresh repository, app scaffolding, Prisma schema | Implemented | Version-control checkpoint and recovery documentation |
| 04 | Market capability baseline | Initial research | Expand primary-source comparison and run user pilots |
| 05 | Figma and responsive identity, UX-01–08 | Initial desktop/mobile designs + implementation | Full mobile, keyboard, dialogs and contrast audit |
| 06 | Login, personal/family/company spaces, ACC-01–05 | Implemented | Full company-to-family journey using separate accounts |
| 07 | Invitations, verification, password recovery, revocation, ACC-06 | Implemented; mail configuration external | Real mailbox verification and new-account invitation browser journey |
| 08 | Event-specific cohost/participant roles and guardian/teacher relationships, PPL-01/02 | Open | Explicit scoped permissions and participant/guardian tests |
| 09 | Academy migration adapter | Not applicable | User explicitly requested a new project with no old-data migration |
| 10 | Ten occasion starters plus blank, name-only drafts, TMP-01/UX-03 | Implemented + tested | Birthday, wedding and Arangetram full browser journeys |
| 11 | Versioned rich snapshots and personal template library, TMP-02/03 | Partial | Personal template save/apply, custom fields and invitation themes |
| 12 | Functions, deadline proposals and safe reuse, TMP-04/05 | Partial; rules tested | Function guest selections and full schedule/timezone handling |
| 13 | Guided next actions and editable prompts, MOD-01 | Implemented + tested | Task completion usability pilot |
| 14 | OmniRoute server adapter | Implemented; gateway external | Authenticated gateway, provider credentials and live timeout/output checks |
| 15 | Household RSVP, dietary needs, check-in, MOD-02 | Implemented + database/browser tests | Full anonymous/private visibility and accessibility acceptance |
| 16 | Checklist, task owners and schedule, MOD-03 | Partial | Dependencies, collaborators and day-of orchestration |
| 17 | Vendor comparison and distinct booking states, VEN-01/02 | Implemented | Browser comparison/confirmation flow and commercial review |
| 18 | Preparation sheets, VEN-03/04 | Basic notes and dates only | Structured measurements/jewellery/makeup, units, private participant permissions and attachments |
| 19 | Planned/committed/paid budget, MOD-04 | Basic ledger implemented in integer minor units | Invoices, contributions, approvals, reconciliation and reports |
| 20 | Private file storage and explicit recipients, MOD-05 | Open | Storage integration, signed access, validation and revocation |
| 21 | Food/functions/rehearsals/seating/registration | Partial | Food and simple schedules implemented; seating/ticketing still open |
| 22 | Reminder/announcement outbox and delivery callbacks | Open | Durable job queue, provider callbacks, retries and deduplication |
| 23 | Stripe checkout/portal/subscription callbacks, BIL-01–03 | Implemented; mocked-provider DB tests pass | Approved prices, entitlements, real Stripe test mode and live configuration |
| 24 | Organizer fees and vendor payments | Open / commercial decision | Separate ledgers and Stripe Connect decision; onboarding and refund/reconciliation tests |
| 25 | Provider directory and restricted quote workspace | Implemented + database tests | Provider profile publish/verify, quote revision and full browser journey |
| 26 | Academy modules, imports, reports, profiles, MOD-06 | Partial | No legacy migration required; academy seasons/students/reports/imports still need new implementation |
| 27 | Security and cross-account acceptance, QA-01–03 | Partial | 17 DB tests cover core security/retries; event and guardian scoping still open |
| 28 | Complete birthday, Arangetram, wedding/cohost journeys, QA-04 | Partial | Birthday draft/checklist/RSVP verified; remaining full journeys open |
| 29 | Typecheck, tests, production build, QA-05 | Passing locally | Final rerun after changes; deployed mobile/keyboard review |
| 30 | Hosting preview and migration restore rehearsal, ARC-07 | External / open | Actual new hosting project, Neon staging, migration/backup restore proof |
| 31 | Production and repeat-use pilot | Open | Complete remaining gates; real production URL, monitoring and pilot outcomes |

## Configuration still needed

Use `.env.example` and docs/DEPLOYMENT.md. Production needs a separate Neon database, hosting project/domain access, approved Stripe recurring prices/entitlements and secrets, Resend sender, OmniRoute deployment/providers, and private storage/background jobs. Do not paste secrets into this tracker.

## Honest release boundary

This is a working development build. It is not the complete locked-spec release and is not certified to outperform competitors. Current planner access is space-wide; private child/measurement/document workflows must wait for event/participant sharing. Quote portals expose only the intentionally shared brief. Never mark production complete from a successful local build or a UI toast.
