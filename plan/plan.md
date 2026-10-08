# Bus Booking Platform (India): Project Plan

**Client:** Mohit  **Developer:** Harshit (solo, part-time)  **Target:** MVP in ~8 weeks

## 1. Context

A redBus-style bus booking marketplace built from scratch (no existing codebase).

**Deliverables**
1. Mobile app (Android + iOS, React Native): full bus booking features, high-quality graphics, animations, modern icons and fonts.
2. Marketing website.
3. Operator portal: operators list buses directly, via their own ERP, or via a third-party ERP/software provider.
4. Super admin panel: client monitors traffic and manages buses, listings, operators and settings.

**Who provides what**
- **Client (Mohit):** domain, AWS EC2 server, Google Play Console account, Apple Developer account.
- **Developer (Harshit):** design and build all four deliverables.
- **Third-party charges** (payment gateway fees, SMS, push, maps) are separate and paid by the client at actuals.

**Reality check:** a full redBus clone is roughly 4–6 months for a team of about 6. Solo and part-time in 2 months needs a hard-cut MVP. ERP/third-party integrations are the largest risk (see section 4), so launch with direct listing and treat ERP adapters as an incremental phase.

## 2. How redBus-style platforms work (reference)

- **Three sides:** operators (supply), customers (demand), platform (commission, typically 8–12%, plus convenience fees).
- **Customer flow:** search → filters → seat map → boarding/dropping points → temporary seat hold (5–10 min) → payment → e-ticket → cancel/refund.
- **Hardest part is inventory.** No double-booking: the seat hold must be atomic.
- **How one operator syncs across platforms (e.g. Laxmi Travels on redBus and AbhiBus):** the operator has one central booking system (CRS/ERP, e.g. Bitla, Ticketsimply, eTravelSmart) that holds the real seat inventory. Every channel (redBus, AbhiBus, counters, agents, us) reads and writes it via API: search → seat layout → **block seat** (the real double-booking guard) → confirm → cancel. There is no direct redBus↔AbhiBus sync. Search results may be cached briefly, but the block step always checks the source of truth.
- **Other models:** operator uses an aggregator's own software; or **quota/allotment** (fixed seats per channel, no live sync, simple but strands unsold seats).

## 3. Architecture

- **Monorepo** (npm workspaces) on GitHub:
  - `apps/api`: Node.js + TypeScript + Express/Fastify + Mongoose, modular monolith, PM2 behind Nginx + SSL.
  - `apps/web`: React + Vite, with separate areas for the marketing site, operator portal (`/operator`) and super admin (`/admin`); static build served by Nginx.
  - `apps/mobile`: React Native (Expo), Android + iOS.
  - `packages/shared`: TS types, zod validation, constants.
- **Deployment:** AWS EC2 in `ap-south-1` (Mumbai), client-provided, starting on a `t2.small` (1 vCPU, 2 GB RAM) and scaling up as users grow. Nginx, PM2, SSL, Cloudflare (free) in front. Images on S3 (not the server disk). Add 1–2 GB swap. Watch CPU credits on the t2 (sustained load throttles it); move to `t3`/`t3a` or larger when traffic grows.
- **Database:** MongoDB (free hosted tier to start; **no automatic backups on free tier**, so run nightly dumps to off-server storage and upgrade to a paid tier before real traffic).
- **No Redis, queue or Elasticsearch initially.** Seat holds use MongoDB atomic operations; background jobs via `node-cron` in the API process. Add Redis/queue when traffic or integrations need it.
- **UI/UX:** modern design system (icon set, custom fonts, motion library such as Reanimated/Lottie on mobile); design in Figma before building each surface.

## 4. Core design decisions

1. **Seat inventory (own supply):** one `Trip` doc per bus-departure-date with `seats[{no, status: available|held|booked, heldUntil, bookingId}]`. Hold is an atomic `findOneAndUpdate` with `$elemMatch` on an available seat (no transactions needed). Holds expire in ~8 minutes (sweep job plus `heldUntil` check on read).
2. **Supplier adapter interface** for every inventory source: `search`, `getSeatLayout`, `blockSeat`, `book`, `cancel`.
   - `OwnInventoryAdapter`: operators who list directly via the portal (built for launch).
   - `ErpAdapter` (one per ERP/CRS vendor): operators who list via their own ERP or a third-party provider. One adapter per vendor covers every operator on that vendor.
   - `QuotaAdapter` (optional, simple): operator gives us a fixed seat quota while selling elsewhere.
3. **Onboarding rule:** do not list a bus as own-inventory if the operator also sells it on another platform, unless they give a fixed quota. Otherwise the same seat is sold twice.
4. **ERP integration prerequisites:** partner agreement with the operator or ERP vendor, API credentials/sandbox, agreed commission and fare parity, and clarity on who handles refunds and complaints. Operator portal has a "connect ERP" flow storing credentials per operator, a sync status view and error alerts.
5. **Payments:** Razorpay Standard Checkout. Server creates the order, client pays, an idempotent signature-verified webhook confirms the booking. Reconciliation cron handles paid-but-unconfirmed and held-but-failed. Refunds via API; simple ledger, manual operator settlement at MVP (automate later).
6. **Auth:** phone OTP (MSG91, DLT registration needed in India) plus JWT. Roles: customer, operator, admin.
7. **Search:** MongoDB index on `(fromCityId, toCityId, date)` plus a cities collection for autocomplete.

## 5. Data model (MongoDB)

`users`, `operators` (KYC, commission %, listing mode: direct/ERP/quota, ERP credentials), `cities`, `boardingPoints`, `buses` (type, seat-layout template), `routes`, `trips` (bus + route + date + fare + seats[] + source), `bookings` (passengers, seats, status, pricing, supplier reference), `payments`, `refunds`, `coupons`, `ledgerEntries`, `reviews`, `cmsPages`, `auditLogs`.

## 6. Scope

**Mobile app (customer booking happens only in the app; the website does not take bookings)**
OTP login, search with filters, seat map, boarding/dropping points, passenger details, Razorpay payment, e-ticket (PDF, SMS, email), My Bookings, cancel + auto-refund per policy, coupons, push notifications.

**Marketing website**
Landing page, app download links, how it works, operator sign-up call to action, contact, privacy/terms/refund pages (also required for payment gateway and store approval).

**Operator portal**
Sign-up and KYC, buses + seat-layout templates, routes/schedules with auto-generated trips, fares, bookings and passenger manifest, cancel trip, earnings view, and the three listing modes (direct, own ERP, third-party ERP).

**Super admin panel**
Approve operators, cities/routes master data, all bookings, refunds, commission config, coupons, users, CMS, traffic and revenue dashboards, reports, audit logs.

**Deferred (post-launch)**
Live GPS tracking, ratings/reviews, wallet and referrals, WhatsApp tickets, multi-language, SEO route pages/SSR, agent/B2B portal, driver app, automated payouts, ERP adapters beyond the first one or two, Redis/Elasticsearch.

## 7. Build order

1. **Backend and database foundation:** everything depends on it (auth, data model, cities, buses, trips, seat hold, payments).
2. **Marketing website:** quick, and a live site with policy pages is needed for payment gateway KYC and store review, so approvals can start while building.
3. **Operator portal:** nothing is bookable until operators create buses and trips. Direct listing first; ERP/third-party adapters afterwards.
4. **Super admin (minimal first):** approve operators, manage cities and routes. Dashboards, reports and settings follow.
5. **Mobile app:** start as soon as search and booking APIs work, not only after admin is finished. Store review (Apple ~1 week) is the likeliest thing to overrun.
6. **Complete the admin** (traffic monitoring, reports, refunds) alongside app testing.

## 8. Timeline (8 weeks, ~30–40 hrs/week; adjust if fewer hours)

| Week | Deliverable |
|---|---|
| 0 (parallel) | Client to arrange domain, AWS EC2, Play/Apple accounts. Start long-lead items: company/GST, Razorpay KYC, MSG91 + DLT, legal pages, operator outreach, design system in Figma |
| 1 | Repo, CI, server setup (Nginx/PM2/SSL), database, data models, auth (OTP/JWT/roles) |
| 2 | Marketing website live; master data (cities/routes/buses), seat-layout builder |
| 3 | Operator portal (direct listing): buses, schedules, trip generation, fares; search API |
| 4 | Seat hold/booking engine with concurrency tests; Razorpay order/webhook/refund; minimal admin |
| 5–6 | Mobile app (Expo): full booking flow, animations, push, tickets |
| 7 | Notifications, cancellation/refund rules, coupons, reconciliation jobs, full admin dashboards, hardening, load test; submit apps to stores |
| 8 | Pilot with 2–3 operators on 1–2 corridors, bug-fix, soft launch |
| Post-launch | First ERP adapter, then more vendors; deferred features |

**Biggest schedule risks:** ERP integrations (partner access, vendor APIs), Apple review, Razorpay KYC and DLT approvals, operator onboarding, and part-time hours. If behind, cut in this order: ERP adapters, iOS first-release (ship Android first), admin reports, then anything affecting booking correctness last.

## 9. Planned structure

- `apps/api/src/modules/{auth,catalog,trips,booking,payments,operators,admin}/`
- `apps/api/src/suppliers/{SupplierAdapter,OwnInventoryAdapter,ErpAdapter,QuotaAdapter}.ts` plus one folder per ERP vendor
- `apps/api/src/modules/booking/seatHold.ts` (atomic hold/release/confirm; highest-risk code)
- `apps/api/src/modules/payments/razorpayWebhook.ts` (idempotent) and `reconcile.job.ts`
- `packages/shared/src/` (types and zod schemas)
- `deploy/` (`nginx.conf`, `ecosystem.config.js`, `backup.sh`) and `.github/workflows/ci.yml` (lint, test, build, SSH deploy)

## 10. Verification

- `seatHold` tests: 50 parallel holds on one seat give exactly 1 success; expired holds are released.
- Razorpay test mode: success, failure, abandon, duplicate webhook, webhook before redirect, paid after hold timeout (must auto-refund or re-confirm).
- ERP adapter tests against vendor sandbox: block/confirm/cancel, timeouts, and "seat taken elsewhere" handling.
- E2E: search, hold, pay, ticket, cancel, refund on Android/iOS builds (Expo EAS), with operator and admin actions checked in the web portals.
- k6 load test at ~50 concurrent users on the EC2 instance; watch memory (PM2) and database limits.
- Backup/restore drill.
- Pilot booking with a real operator before public launch.

## 11. Compliance and business to-do (confirm with a lawyer/CA)

GST registration, Razorpay marketplace/route settlement KYC, DPDP Act privacy policy, Terms, cancellation/refund policy, state and aggregator regulations (Motor Vehicle Aggregator Guidelines), operator agreements (commission, settlement cycle, cancellation policy), ERP vendor partner agreements.

## 12. Decisions made and open items

**Decided**
- Customer booking is **app only**. The website is marketing only; web also hosts the operator portal and super admin.
- EC2: `ap-south-1`, `t2.small` to start, scale when users grow.
- Launch date and budget are not fixed. The 8-week timeline is a working target for sequencing, not a commitment.

**Open (decide when reached)**
- Which ERP/CRS vendors come first. Decide before starting the first adapter, ideally based on which vendors the first real operators use.
- Expected number of operators at launch, and when to upgrade the database tier and EC2 size.
