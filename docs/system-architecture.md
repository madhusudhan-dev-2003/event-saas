# Utsava (Celebration) — system architecture blueprint

This document is the working blueprint of the Celebration codebase as implemented. It describes how the system is structured, how data moves, how people and tokens get access, and where the product still stops short of the locked product spec.

Product name in the UI: **Utsava**. Repository / package name: `celebration-platform`. This application is a **new** stack. It does not share source, credentials, or tables with any prior Utsava product.

Related documents:

- `README.md` — run, verify, implemented scope
- `docs/PRODUCT-STRATEGY.md` — guided-planning contract and competitive intent
- `docs/BUILD-TRACKER.md` — delivery ledger and remaining gates
- `docs/DEPLOYMENT.md` — Neon, Stripe, Resend, OmniRoute, Hostinger/Vercel

---

## 1. What the system is

Utsava is a **celebration planning platform** for households, personal use, and companies. A signed-in organizer works inside a **space**. Each space holds **events** (celebrations). An event’s living plan is a **versioned JSON document** stored on the event row, not a forest of normalized planning tables.

The product’s core loop:

1. Create an account → a family space is created automatically.
2. Pick an occasion starter (or blank) and a name → a persistent event is saved.
3. Work the plan: tasks, budget, vendors, guests, schedule, food, preparation.
4. The dashboard and event overview recommend **one next action** (plus at most two alternatives).
5. Optional AI suggestions are generated server-side from **non-sensitive** plan context and never write the plan.
6. Guests RSVP and vendors quote through **unguessable token URLs** that never grant planner login.

Commercial billing is a **software subscription per space** via Stripe. Event fees, vendor payouts, and Stripe Connect are **not** implemented.

---

## 2. High-level architecture

```
┌─────────────┐     HTTPS      ┌──────────────────────────────────────┐
│   Browser   │ ─────────────► │  Next.js 16 (App Router, Node.js)    │
│  React 19   │                │  Server Components + Server Actions  │
└─────────────┘                │  One API route: Stripe webhooks      │
                               └───────────┬──────────────────────────┘
                                           │ Prisma Client
                                           ▼
                               ┌──────────────────────┐
                               │  PostgreSQL (Neon    │
                               │  or local Postgres)  │
                               └──────────────────────┘

Integrations (server-only, never browser-held secrets):
  Stripe API     — checkout, billing portal, subscription fetch
  Stripe webhook — signed POST /api/stripe/webhook
  Resend API     — verification and password-reset mail
  OmniRoute      — optional OpenAI-compatible /chat/completions
```

**Single source of truth:** PostgreSQL via Prisma. There is no MySQL, no second datastore, and no client-side source of truth for plans. Browser state is a draft of the last loaded event until a successful `saveEvent`.

**Deploy targets:** Vercel (`vercel.json`) **or** Hostinger / any Node host using Next `output: "standalone"` and the supplied `Dockerfile`. The database stays on Neon (or equivalent Postgres) in either case.

---

## 3. Technology stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 22+ |
| Framework | Next.js 16.3.3, App Router, standalone output |
| UI | React 19, CSS in `src/app/globals.css` |
| Language | TypeScript (strict project `tsc`) |
| Validation | Zod 4 (`planSchema` and action inputs) |
| ORM / DB | Prisma 6 + PostgreSQL (`DATABASE_URL` pooled, `DIRECT_URL` direct) |
| Auth | Custom sessions (httpOnly cookie), scrypt passwords, SHA-256 token hashes |
| Payments | Stripe REST (`src/lib/stripe.ts`), not the Stripe SDK |
| Mail | Resend HTTP API |
| AI | OmniRoute-compatible HTTPS gateway |
| Tests | Vitest (unit without DB; integration opt-in via `TEST_DATABASE_URL`) |

There is **no** NextAuth, Redis, job queue, object storage, or WebSocket layer in this build.

---

## 4. Repository map

```
Celebration/
├── prisma/
│   ├── schema.prisma          Domain tables
│   └── migrations/            Explicit schema history (never auto-run on build)
├── src/
│   ├── app/                   Routes, layouts, server actions, Stripe webhook
│   ├── components/            Shell, event editor, forms, billing, charts
│   └── lib/                   Auth, permissions, planning, Stripe, Prisma, security
├── docs/                      Strategy, tracker, deployment, this blueprint
├── Dockerfile                 Multi-stage standalone image, non-root user
├── next.config.ts             Standalone + security headers
└── vercel.json                Next.js build on Vercel
```

**Mutation surface (server actions):**

- `src/app/actions.ts` — accounts, spaces, events, members, roles, guests, RSVP, AI
- `src/app/account-actions.ts` — email verify / password reset
- `src/app/billing-actions.ts` — Stripe checkout and portal
- `src/app/provider-actions.ts` — provider profile, quote request/reply/import

**HTTP API:** only `POST /api/stripe/webhook` (`src/app/api/stripe/webhook/route.ts`). All other writes go through Server Actions.

---

## 5. Runtime and request model

### 5.1 Authenticated pages

1. Page Server Component calls `requireSpaceContext(?spaceId)` or `requireUser()`.
2. Session cookie `celebration_session` is hashed and looked up in `Session`.
3. Memberships load; if none, redirect to `/spaces/new`.
4. If `?space=` is missing or unknown, the user’s oldest space is used.
5. System roles are upserted (`seedSpaceRoles`) so older spaces pick up permission JSON.
6. The page queries Prisma with **space membership** as the access boundary.
7. Permission keys on the membership’s `SpaceRole` gate UI and later mutations.

### 5.2 Mutations

Client components call `"use server"` functions. Typical pattern:

1. `requireUser()` (cookie session).
2. Zod-parse input.
3. Load membership / event membership; `can(permissions, …)`.
4. Optional `limit()` rate bucket in `RateLimit`.
5. Prisma write, often `updateMany` with a **version** predicate (optimistic concurrency).
6. Optional `Audit` row.
7. `revalidatePath` so Server Components refresh.

Failed mutations return `{ error }` without throwing through the UI. Successful saves may return `{ version, success }` so the editor can catch up.

### 5.3 Public token pages

`/rsvp/[token]`, `/quote/[token]`, `/invite/[token]`, `/account/verify/[token]`, `/account/reset/[token]`:

- Token in the URL is 64 hex characters (32 random bytes).
- Database stores **SHA-256** of the raw token (`hashToken`).
- Pages set `robots: noindex` and a strict referrer policy.
- They load only the rows needed for that token. They do **not** attach a planner session.

### 5.4 Security headers (`next.config.ts`)

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `poweredByHeader: false`

---

## 6. Domain model

```
User ──┬── Session[]
       ├── Membership[] ── Space ──┬── Event[] ──┬── GuestLink[]
       ├── AccountToken[]          │             └── ServiceRequest[]
       └── Provider?               ├── Invitation[]
                                   ├── SpaceRole[] ← Membership, Invitation
                                   └── Subscription?
```

### 6.1 User

Account identity: unique email, display name, scrypt password hash, optional `emailVerifiedAt`. Verification is required to **accept space invitations** and to **publish** a provider profile. It is not required to sign in or plan events in spaces the user already owns.

### 6.2 Space

A tenancy boundary. `kind` is `PERSONAL`, `FAMILY`, or `COMPANY`. Registration always creates a **FAMILY** space named `{firstName}'s family`. Users may create additional spaces. Events, members, invites, roles, and the software subscription belong to a space.

Spaces do not see each other. Membership in space A never grants rows in space B.

### 6.3 SpaceRole and Membership

Access is **space-wide**, not event-scoped (event cohost / participant / guardian roles are still open in the tracker).

Each space seeds four **system roles**:

| systemKey | Name | Notes |
|---|---|---|
| `OWNER` | Owner | All permissions, including `billing.manage`. Cannot be invited, deleted, or reassigned via role APIs. |
| `ADMIN` | Administrator | All except billing. Only Owner can invite, assign, or remove Admins. |
| `EDITOR` | Editor | Plan, guests, budget, vendors, exports, directory. No user admin, settings, delete, billing. |
| `VIEWER` | Viewer | Dashboard, read events, view budget, browse providers. |

Owners/admins can create **custom roles** with any grantable permissions except `billing.manage` (Owner-only).

`Membership` is `(spaceId, userId)` → `roleId`. One role per user per space.

### 6.4 Event

A celebration. Fields:

- `name`, `templateKey` (occasion starter), `templateVersion`
- `plan` — JSON document validated by `planSchema`
- `version` — integer optimistic lock; each successful save increments it
- `createKey` — unique idempotency key `{userId}:{uuid}` so double-submit does not create two events

Deleting an event cascades guest links and service requests.

### 6.5 GuestLink

Household RSVP token. Stores household label, capacity (`maxGuests` 1–100), `response` (`PENDING` / `YES` / `NO` / `MAYBE`), `attending`, dietary, contact, notes, side, `checkedIn`, expiry (~180 days), optional `revokedAt`.

### 6.6 ServiceRequest

Private vendor quote workspace. Stores category, organizer-written `brief`, currency, optional quote in **integer cents**, availability, reply, version, expiry (~30 days), `importedAt`, `revokedAt`. The public quote page never loads the event plan.

### 6.7 Provider

Optional public directory profile, **one per user**. Unpublished profiles stay private. Publishing requires verified email.

### 6.8 Subscription and WebhookReceipt

One subscription row per space: Stripe `customerId`, `subscriptionId`, `status`, `priceId`, last `checkoutSessionId`. `WebhookReceipt.id` is the Stripe event id for **exactly-once** processing.

### 6.9 Supporting tables

- `Session` — hashed session token, 7-day expiry
- `AccountToken` — hashed VERIFY / RESET tokens, 1-hour expiry, `consumedAt`
- `Invitation` — hashed invite token, 7-day expiry, email must match the accepting account
- `RateLimit` — `{key}:{timeBucket}` counters
- `Audit` — actor, space, action, target (event updates, member removal, Stripe status)

---

## 7. The plan document (`Event.plan`)

Canonical schema: `src/lib/planning.ts` → `planSchema`. Invalid JSON fails parse on load and save.

| Field | Meaning |
|---|---|
| `date` | ISO `YYYY-MM-DD` or empty |
| `location` | Optional venue text |
| `notes` | Host notes |
| `currency` | `USD` `INR` `GBP` `EUR` `CAD` `AUD` |
| `status` | `DRAFT` `PLANNING` `COMPLETED` `ARCHIVED` |
| `modules` | Optional: `functions`, `seating`, `food`, `rehearsals`, `preparation` |
| `tasks[]` | Checklist: title, done, owner, due, relative `offset` days, `fixed`, category, priority, notes |
| `budget[]` | Category lines: `planned` / `committed` / `paid` in **integer minor units** (cents) |
| `services[]` | Vendor comparison groups: requirements, `selectedId`, booking `status`, nested `vendors[]` |
| `functions[]` | Named schedule rows (date, 24h time, venue, notes) |
| `food[]` | Dish, owner, dietary, servings |
| `preparation[]` | Participant + Tailoring/Jewellery/Makeup, units in/cm, details, fitting/delivery dates |

**Money rule:** never store floating currency. UI may show major units; persistence is cents, max `100_000_000_000` minor units.

**Row ids:** UUID (or `quote-{serviceRequestId}` after import). Duplicate ids are rejected.

**Booking states** on a service (independent of Stripe):

`SHORTLISTED` → `SELECTED` → `CONFIRMED` → `DELIVERED` → `PAID`

A status other than `SHORTLISTED` requires `selectedId` pointing at a vendor in that service. Selecting a vendor is **not** a confirmed booking. Importing a quote only appends a comparison row.

**Status promotion:** saving a plan still in `DRAFT` writes `PLANNING`.

**Reuse:** `reusePlan` copies structure (modules, task titles, budget categories, service categories) and **clears** owners, dues, done flags, amounts, vendor lists, requirements, and booking state. Private guest links and quote tokens are **not** copied (new event row).

**Date change proposals:** tasks with `offset` and not `fixed`/`done` get proposed `due` dates when the event date changes. The editor previews; the user applies through a normal save.

**Occasion starters** (`occasions`): birthday, wedding, arangetram, graduation, diwali, gathering, halloween, thanksgiving, christmas, company, blank. Each seeds tasks, budget/service categories, and default modules.

---

## 8. Permission catalog

Defined in `src/lib/permissions.ts`. Checks use `can()` with a few implications (e.g. `guests.manage` implies `guests.checkin`; `budget.manage` implies `budget.view`).

| Key | Used for |
|---|---|
| `dashboard.view` | Dashboard KPIs |
| `events.read` | List/open celebrations |
| `events.write` | Create, save, reuse, AI suggest |
| `events.delete` | Delete celebration |
| `schedule.manage` | Functions/rehearsals (also implied by `events.write`) |
| `guests.manage` | Guest links, RSVP admin, revoke |
| `guests.checkin` | Event-day check-in |
| `budget.view` / `budget.manage` | Budget tab |
| `vendors.manage` / `vendors.quotes` | Services, quote request/import |
| `exports.download` | JSON export / print |
| `providers.browse` | Directory |
| `settings.manage` | Space settings |
| `users.invite` / `users.manage` | Invites, roles, member admin |
| `billing.manage` | Checkout and portal (Owner) |

**Honest boundary:** these permissions apply to the **whole space**. Any editor of a family space can see every event’s plan, including preparation notes. Do not treat preparation sheets as private measurements until event-level sharing exists.

---

## 9. End-to-end workflows

### 9.1 Register and sign in

```
Login page (mode=register)
  → authenticate()
      rate limit login:{hash(email)} 8 / 15 min
      create User (scrypt password)
      createSpaceWithOwner FAMILY
      startSession (cookie, 7 days)
  → /dashboard
```

Sign-in verifies password with `timingSafeEqual`. Failed login does not reveal whether the email exists beyond a generic mismatch. Register of an existing email asks the user to sign in instead.

Logout deletes the session row and the cookie.

### 9.2 Email verification and password reset

```
Account → requestVerification()
  → AccountToken purpose=VERIFY, 1h
  → Resend email with raw token URL /account/verify/{token}

Password reset request
  → always returns the same success copy (no account enumeration)
  → if user exists, RESET token mailed to /account/reset/{token}

Consume token in a transaction: mark consumed, then verify email or set password
```

Requires `RESEND_API_KEY` and `MAIL_FROM`. Space invitations are **not** emailed; the inviter copies `/invite/{token}`.

### 9.3 Create another space

`/spaces/new` → `createSpace` with `PERSONAL` | `FAMILY` | `COMPANY` → creator is Owner → `/dashboard?space={id}`.

Company vs family only changes Stripe price ID at checkout (`STRIPE_COMPANY_PRICE_ID` vs `STRIPE_FAMILY_PRICE_ID`). Feature entitlements are **not** gated on subscription status in this build.

### 9.4 Invite a collaborator

1. Users with `users.invite` or `users.manage` pick an email and a non-Owner role.
2. `createInvitation` stores hashed token; returns `/invite/{raw}`.
3. Recipient must be signed in as **that email** with **verified** email.
4. `acceptInvitation` consumes the invite and upserts membership (updates role if they were already a member).

Remove member: `users.manage`, cannot remove Owner, only Owner can remove Admin; pending invites for that email are revoked. The removed user’s **other** spaces and personal accounts are untouched.

### 9.5 Create and edit a celebration

```
/new or /templates
  → createEvent(spaceId, name, templateKey, createKey uuid)
      permission events.write
      idempotent upsert on createKey
      plan = newPlan(templateKey) with status PLANNING
  → /events/{id}

EventEditor (client)
  → local plan state, autosave when dirty
  → saveEvent({ id, name, version, plan })
      events.write
      updateMany where id AND version
      increment version, audit EVENT_UPDATED
  → if count=0: concurrent edit; user must reload
```

Tabs in the editor: Overview, Plan, Budget, Vendors, Guests, plus Functions / Food / Preparation when those modules are on. Overview shows `nextActions(plan)` and an editable OmniRoute prompt.

Viewers get `editable={false}`.

### 9.6 Guided next actions (deterministic)

`nextActions(plan)` in `src/lib/planning.ts`:

1. Archived/completed → reuse/reflect prompt only.
2. Else up to **3** items, highest priority first: overdue task → confirm SELECTED vendor → missing date → next open task → empty budget → final review.

Product contract (`docs/PRODUCT-STRATEGY.md`): show one recommended action and at most three alternatives; never treat model text as a booking, payment, or save.

### 9.7 AI suggestions

`suggest({ eventId, prompt })`:

- Requires `events.write`, 10 calls / user / hour.
- If OmniRoute env is missing or the gateway fails → return deterministic `nextActions` strings.
- If configured: POST `{OMNIROUTE_BASE_URL}/chat/completions` with HTTPS (localhost allowed for local gateways).
- **Context sent:** occasion key, hasDate, task counts, services awaiting confirmation. **Not sent:** names, contacts, notes, measurements, dietary data, guest lists.
- Model must return JSON `{ suggestions: string[1..3] }`. The plan is **not** mutated.

### 9.8 Household RSVP and check-in

```
Organizer createGuestLink → /rsvp/{token} (share out of band)
Guest (no login) rsvp() YES/NO/MAYBE + attending ≤ maxGuests + dietary
Organizer updateGuest: update details, revoke, or checkin (YES only)
```

Public RSVP page shows event **name, date, location** only from the plan — not tasks, budget, or other households.

### 9.9 Vendors, quotes, directory

**In-plan comparison:** `plan.services[].vendors[]` with quote cents and availability.

**Private quote link:**

```
requestQuote (vendors.manage)
  → ServiceRequest + /quote/{token}
  → provider sees brief only; replyQuote with version lock
  → organizer manageQuote import
        appends vendor row id=quote-{requestId}
        does not set selectedId or CONFIRMED
  → or revoke (invalidates public page)
```

**Directory:** published `Provider` rows on `/providers`. Users edit their own profile at `/providers/profile`. Directory is opt-in marketing, not booking.

### 9.10 Billing (software subscription only)

```
Owner checkout()
  → pg_advisory_xact_lock(billing:{spaceId})
  → ensure Subscription + Stripe customer
  → reuse open Checkout Session if any
  → create Checkout Session (mode=subscription)
  → redirect only if URL host is checkout.stripe.com

Stripe → POST /api/stripe/webhook
  → HMAC signature + 5 minute timestamp window
  → ignore unknown types
  → lock same billing:{spaceId}
  → skip if WebhookReceipt exists
  → re-fetch live subscription from Stripe (do not trust event snapshot)
  → match customer + space metadata
  → ignore late canceled events if a replacement subscription is active
  → set status from Stripe, or UNRECOGNIZED_PRICE if price id not configured
  → store receipt + audit

Owner portal() → billing.stripe.com session
```

Returning from Checkout (`?checkout=returned`) does **not** activate the plan. Only the webhook (or a later live fetch) does. Feature flags are not wired to `Subscription.status` yet.

### 9.11 Export and print

The event editor can download the plan as JSON and print sections. That is a client export of authorized data, not a separate reporting service.

---

## 10. Route catalog

| Path | Auth | Role |
|---|---|---|
| `/` | Public landing or redirect to dashboard | — |
| `/login` | Public | Register / sign in |
| `/dashboard` | Session + space | KPIs, next action |
| `/celebrations` | Session + space | Event list, archive/search/filter |
| `/new` | Session | Create celebration |
| `/templates` | Session | Occasion starters |
| `/events/[id]` | Session + membership | Event editor |
| `/events/[id]/quotes` | Session + vendors | Quote inbox |
| `/users` | Session + space | Members, roles, invites |
| `/spaces/new` | Session | New space |
| `/spaces/[id]` | Session + settings/billing | Space settings + Stripe |
| `/account` | Session | Profile, verify email |
| `/account/verify/[token]` | Token | Consume VERIFY |
| `/account/reset` | Public | Request RESET |
| `/account/reset/[token]` | Token | Set password |
| `/providers` | Session | Directory |
| `/providers/profile` | Session | Own provider profile |
| `/help` | Session/public shell | Planning guide |
| `/invite/[token]` | Session | Accept space invite |
| `/rsvp/[token]` | Token | Guest RSVP |
| `/quote/[token]` | Token | Vendor reply |
| `/api/stripe/webhook` | Stripe signature | Subscription sync |

Current space is passed as `?space=` on in-app links (`Shell`).

---

## 11. Concurrency, idempotency, and rate limits

| Mechanism | Where |
|---|---|
| Event `version` + `updateMany` | `saveEvent`, quote import |
| Quote `version` | `replyQuote`, import |
| `createKey` unique | `createEvent`, `reuseEvent` |
| Stripe `Idempotency-Key` | customer create, checkout session |
| Checkout session reuse | open session URL returned instead of a second session |
| `WebhookReceipt` | Stripe event id |
| `pg_advisory_xact_lock(hashtext('billing:'\|\|spaceId))` | checkout + webhook |
| Token consume `updateMany` where `consumedAt` is null | verify, reset, invite |
| `RateLimit` buckets | login, RSVP, quotes, AI, checkout, verify, reset |

If two editors save the same event, the second gets a reload error. There is no operational transform / CRDT.

---

## 12. Security model (as built)

**Secrets:** only on the server (`DATABASE_URL`, `DIRECT_URL`, `STRIPE_*`, `RESEND_*`, `OMNIROUTE_*`, `APP_URL`). Production `APP_URL` must be HTTPS.

**Passwords:** scrypt, random salt, constant-time compare. Minimum 6 characters on register/reset.

**Tokens:** 32-byte hex in URLs; SHA-256 at rest. Sessions httpOnly, `SameSite=lax`, `Secure` in production.

**Tenancy:** every planner query is scoped by membership (`space.members.some { userId }`) and then permission keys. Public pages use token hash lookup only.

**Quote isolation:** vendor sees `brief`, category, currency, their own reply fields. Not the plan JSON, other vendors, guests, or budget.

**RSVP isolation:** guest sees event name/date/location and their household form.

**AI isolation:** minimized context; system prompt forbids claiming mutations.

**Stripe:** signature verification in-process; live subscription re-read after lock; unexpected checkout/portal hosts rejected.

**Not yet:** private object storage, per-recipient file ACLs, event-scoped roles, durable outbox, session/token cleanup job, edge rate limits, production monitoring. See tracker steps 08, 20, 22, 27, 30.

---

## 13. Environment configuration

Prisma always needs:

- `DATABASE_URL` — pooled Postgres (Neon pooler in hosted envs)
- `DIRECT_URL` — direct Postgres for migrations

Application:

- `APP_URL` — public origin (https in production)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `STRIPE_FAMILY_PRICE_ID`, `STRIPE_COMPANY_PRICE_ID` (commercially approved prices; not invented in code)
- `RESEND_API_KEY`, `MAIL_FROM`
- `OMNIROUTE_BASE_URL`, `OMNIROUTE_API_KEY`, `OMNIROUTE_MODEL`

Missing Stripe/mail/AI configuration **fails closed** with a user-visible “not configured” message; the rest of planning still works. `authenticate` refuses to run without `DATABASE_URL`.

`npm run build` runs `prisma generate && next build`. It does **not** migrate. Releases run `npm run db:deploy` (`prisma migrate deploy`) as an explicit step.

---

## 14. Deployment topology

```
[Users]
   │
   ▼
[Vercel or Hostinger / Docker Node]
   │  Prisma
   ▼
[Neon PostgreSQL]          ← backups and staging isolated from prod
   │
   ├── Stripe (subscriptions only)
   ├── Resend (account mail)
   └── OmniRoute host (separate VPS recommended; admin UI not exposed)
```

Docker: build stage compiles; runtime copies `.next/standalone` + static assets; runs `node server.js` as user `app`; does not bake `.env` into the image.

Local development (as documented in README) may use a loopback-only Postgres. Production must use Neon TLS credentials, never the local trust setup.

---

## 15. Testing and verification posture

- `npm run typecheck` — TypeScript
- `npm test` — Vitest unit tests **without** a database (`security`, `planning`, persistence/billing/guest tests that mock or stay in-memory)
- `TEST_DATABASE_URL=… npm test` — opt-in integration tests against an isolated QA database; they create uniquely named records and delete only what they own
- Stripe tests mock HTTP; they do not charge
- Browser acceptance in the tracker is partial (birthday draft, checklist, household RSVP verified locally)

This is a **working development build**, not a certified production release.

---

## 16. What this blueprint does **not** include (open work)

From `docs/BUILD-TRACKER.md` and product constraints:

- Event-specific cohost / participant / guardian / teacher permissions
- Private file storage and recipient-level sharing
- Full structured measurement forms, seating charts, task dependencies
- Durable reminders, announcement outbox, provider delivery callbacks
- Saved personal templates, imports, academy seasons/students/reports
- Invoices, contribution ledgers, approvals, organizer fees, vendor payouts (Stripe Connect)
- Paid-feature entitlements and commercially approved prices in product logic
- Expiring-session cleanup, monitoring, backup restore drills, final security review

Until those exist, treat space members as fully trusted for that space’s plans, and treat quote/RSVP portals as the only restricted external surfaces.

---

## 17. Design principles to preserve

When extending the system, keep these invariants:

1. **Postgres is the only system of record.** Do not add a second database engine.
2. **Plans are versioned documents.** Prefer extending `planSchema` over ad-hoc columns unless the data must be queried across events.
3. **Mutations are authorized server actions.** Do not add client-writable APIs that skip `can()`.
4. **Tokens are hashed; raw secrets live in URLs only once.**
5. **Optimistic concurrency** on shared documents (event, quote).
6. **AI never writes.** Preview vs apply stays a human save.
7. **Vendor confirmation ≠ selected preference ≠ Stripe payment.** Keep those state machines separate.
8. **Reuse strips private and financial commitments.**
9. **Migrations are a release step**, never a silent build side effect.
10. **Do not invent prices or entitlements** in code until commercial approval exists.

---

## 18. Source index (implementation map)

| Concern | Primary files |
|---|---|
| Schema | `prisma/schema.prisma` |
| Plan + occasions + next actions | `src/lib/planning.ts` |
| Auth / sessions / rate limit | `src/lib/auth.ts`, `src/lib/security.ts` |
| RBAC | `src/lib/permissions.ts`, `src/lib/space-roles.ts` |
| Active space | `src/lib/space-context.ts` |
| Prisma singleton | `src/lib/db.ts` |
| Stripe client helpers | `src/lib/stripe.ts` |
| Core mutations | `src/app/actions.ts` |
| Account mail | `src/app/account-actions.ts` |
| Billing | `src/app/billing-actions.ts` |
| Providers / quotes | `src/app/provider-actions.ts` |
| Webhook | `src/app/api/stripe/webhook/route.ts` |
| Event UI | `src/components/event-editor.tsx` |
| Chrome | `src/components/shell.tsx` |
| App frame | `src/app/layout.tsx` |

This file should be updated when tenancy, money movement, or the plan document contract changes.
