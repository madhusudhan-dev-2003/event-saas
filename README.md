# Utsava — Celebration platform

A new project built in `C:/Users/vssru/Documents/Projects/Celebration`. It does not share source, credentials or database tables with the previous Utsava application.

Node.js 22+, Next.js 16, React 19, TypeScript, Prisma and PostgreSQL. Deploy the application to Vercel or a Node.js-capable Hostinger plan/VPS; use Neon as the managed PostgreSQL database. MySQL is not required by Hostinger and is not used here.

## Run

```sh
npm ci
# Configure .env using .env.example and a NEW database.
npm run db:deploy
npm run dev -- --port 3100
```

Open http://127.0.0.1:3100 and create your own account. Database migrations are explicit; builds never silently migrate production. Prisma reads `.env`; if hosting uses injected environment variables, configure those in the host dashboard instead. Do not commit credentials.

This development session uses a separate PostgreSQL cluster under `tmp/postgres/data`, listening only on `127.0.0.1:55439`, with database `celebration_dev`. It contains clearly labeled QA records and uses local trust authentication solely for development. Never expose this local database port or use this authentication setup in production. Neon must use its own credentials and TLS.

Restart that local cluster on Windows when needed:

```powershell
& 'C:/Program Files/PostgreSQL/18/bin/pg_ctl.exe' -D 'C:/Users/vssru/Documents/Projects/Celebration/tmp/postgres/data' -l 'C:/Users/vssru/Documents/Projects/Celebration/tmp/postgres/server.log' -o '-h 127.0.0.1 -p 55439' start
```

## Implemented

- Password authentication, hashed sessions, explicit email verification and password-reset flows through configurable Resend delivery.
- Independent family/personal/company spaces, owner/admin/editor/viewer access, invitation acceptance and member removal.
- Ten occasion starters plus blank; name-only persistent drafts; independent plan snapshots; safe reuse; archive/search/filter.
- Task checklist, owners and dates, proposed relative-deadline updates, planned/committed/paid budget amounts in integer cents.
- Vendor comparisons, independent booking states, public opt-in provider directory, private quote briefs, provider replies and explicit import to comparisons.
- Household RSVP links, capacity validation, revocation, dietary responses and check-in.
- Functions/rehearsal schedule, food contributions and basic preparation sheets, JSON export and section printing.
- Next-step priorities based on saved records; editable prompts; server-side OmniRoute adapter with limited contextual data and deterministic fallback.
- Stripe checkout, billing portal and signature-verified subscription webhooks with transaction-based deduplication and latest-state reconciliation.
- Hostinger-compatible Node.js standalone output, Dockerfile and Vercel configuration.

## Verification

```sh
npm run typecheck
npm test
npm run build
```

Unit tests run without a database. Integration suites require explicit opt-in to the separate local QA database:

```powershell
$env:TEST_DATABASE_URL='postgresql://celebration_local@127.0.0.1:55439/celebration_dev?schema=public'
npm test
```

Integration tests create uniquely named QA records and remove only records they own. They do not connect to the old application database. Stripe integration tests mock provider HTTP responses; they do not charge money or certify live Stripe configuration.

## Remaining release work

This is a working development build, not the complete locked-spec release. Event-specific cohost/participant/guardian permissions, private file storage and recipient-level sharing, full structured measurement forms, seating, task dependencies, durable reminders/delivery callbacks, saved personal templates, imports, full financial ledgers/approvals, organizer/vendor payouts, academy seasons/student workflows and complete cross-account acceptance remain open. See `docs/BUILD-TRACKER.md`.

Current planner access is space-wide. Preparation notes must not be used for sensitive measurements until restricted participant sharing is implemented. Vendor quote pages expose only the explicit brief; they do not expose private planner records. Paid feature entitlements and plan pricing remain commercial decisions, so no feature limits or prices are invented.

## External setup

See `docs/DEPLOYMENT.md`. Configure Neon, Stripe price IDs and webhook secret, Resend sender/API key, and a privately hosted OmniRoute gateway before verifying those live integrations. No deployment has been made to the user's domain or hosting accounts.

Figma concepts: https://www.figma.com/design/oQHSZBbMZdwKLGEf5TizZk

# Celebration
