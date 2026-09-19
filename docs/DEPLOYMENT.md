# Deployment runbook

## Architecture

Browser → Next.js Node.js application → Prisma → Neon PostgreSQL.

Separate integrations: Stripe for the space's software subscription; SMTP (or Resend fallback) for account mail; OmniRoute as an authenticated AI gateway. Use a Hostinger VPS or another suitable persistent host for OmniRoute. The application can run on Vercel OR Hostinger without moving the database. Do not introduce a second MySQL source of truth.

## 1. Provision the new database

Create a new Neon project/database for Celebration. Configure `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) with TLS. Keep staging and production isolated. Never point this project at the prior Utsava database.

## 2. Configure the application

Set the variables from `.env.example` in the selected host. `APP_URL` must be the HTTPS origin of that environment. Do not use localhost in production. Node.js 22 or later is required. Build using `npm run build`; start using `npm start` on managed Node.js hosting, with the host's port environment. For Docker/VPS, use the supplied Dockerfile, which runs the standalone server as a non-root user.

The Dockerfile includes compiled assets and runtime output; run migrations from a CI/admin environment with Prisma installed. Do not copy `.env` into a container image. Environment-specific private keys are injected at runtime.

## 3. Apply migrations as a release step

Back up the new database; record the deployment commit and schema version. Run `npm run db:deploy` against staging first, then production only after the staging checks pass. `npm run build` does not execute migrations. Verify a schema-only restore and a data restore into a separate database before launch. A failed application release can roll back the application image only when the migration remains backward-compatible; do not blindly reverse a destructive schema change.

## 4. Stripe

Create approved recurring prices in Stripe and set `STRIPE_FAMILY_PRICE_ID` / `STRIPE_COMPANY_PRICE_ID`. Prices are not yet commercially approved. Configure the billing portal in Stripe. Set the secret key and webhook signing secret, using separate test/live values.

Webhook: `https://YOUR_DOMAIN/api/stripe/webhook`

Subscribe to `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`. The handler fetches current subscription state, matches the stored space/customer, checks the configured price, and deduplicates callback IDs in a transaction. The checkout-return URL does not activate a plan. Test successful checkout, duplicate webhook, failure/past_due, renewal, cancellation, delayed events and replacement subscriptions. Renewal and payment-failure state must be checked against your account's provider event behavior before launch.

This integration purchases software subscriptions only. Event fees and vendor payouts require distinct money flows and, if the platform receives/pays third-party funds, a Stripe Connect design and appropriate onboarding. They are not silently implemented as subscription payments.

## 5. Email and AI

For account mail, set `SMTP_HOST`, `SMTP_PORT` (587 or 465), `SMTP_USER`, `SMTP_PASS`, and a verified `MAIL_FROM`. Use `SMTP_SECURE=true` for implicit TLS on port 465. Resend (`RESEND_API_KEY`) remains an optional fallback when SMTP is not set. Provider acceptance is not delivered-to-inbox confirmation. Full reminder outbox and delivery callback handling remain a later release package.

For OmniRoute, deploy and configure the upstream MIT-licensed gateway following its own documentation. Configure its providers legitimately; supply this app an authenticated HTTPS `/v1` base URL, API key and model. Do not expose a gateway admin dashboard or provider tokens to browsers. No gateway process, provider credentials, or remote model has been configured by this build. The adapter is implemented and falls back to saved-plan rules when unavailable.

## 6. Preview acceptance

Create a staging owner and a second account; test a family birthday and a company event without cross-space visibility. Verify viewer/revoked/outsider denial, new-account verification and invitation acceptance, RSVP without planner access, provider quotes with no private plan leakage, concurrent edits, date-change proposals, archive/reuse and cancellation preserving records. Verify desktop, mobile and keyboard flows on the deployed environment. Keep the remaining tracker items open until completed.

## 7. Publish

Vercel: create a NEW project, select this repository, configure environment variables and deploy. Hostinger: select a Node.js-capable plan and connect this repository, or deploy the Docker image on a VPS behind an HTTPS reverse proxy. Point the chosen domain to the actual deployment only after acceptance. Domain ownership, hosting access and production verification have not been supplied or performed.

## Operations still required before production

External uptime/error monitoring, expiring-session/token/rate-limit cleanup job, database backup/restore drills, request limits at the host edge, durable message delivery, private object storage, and final security review. No claim of production readiness follows from a passing local build alone.

Sources: https://www.hostinger.com/web-apps-hosting/nextjs-hosting · https://docs.stripe.com/webhooks · https://docs.stripe.com/api/checkout/sessions/create · https://github.com/diegosouzapw/OmniRoute · https://resend.com/docs/api-reference/emails/send-email
