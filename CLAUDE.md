# Vanya: Bus Booking Platform

A redBus-style bus booking platform for India. Client: Mohit. Developer: Harshit Tiwari (solo, part-time).

GitHub repo: https://github.com/me-harshit/vanya

Full plan: `plan/plan.md` (readable version: `plan/index.html`). Read it before making design or architecture decisions, and keep both files in sync when the plan changes.

## Folders

- `plan/`: planning documents only
- `website/`: marketing website (no booking)
- `mobile-app/`: React Native (Expo) app for Android and iOS; customers book only here
- `operator-portal/`: portal for bus operators (direct listing, own ERP, third-party ERP)
- `admin-portal/`: super admin panel for the client

- `backend/`: Node.js + TypeScript + Express 5 + Mongoose API. Secrets live in `backend/.env` (git-ignored; template in `.env.example`). Commands: `npm run dev`, `npm test` (each test file uses its own `vanya_test_*` database, dropped afterwards), `npm run db:check`, `npm run admin:create -- <phone> "Name"`.

Shared types between projects are not decided yet; ask before creating a shared package.

## Theme rule

Design system: Option 1 (Milano Red `#A90E02` + Lemon Chiffon `#FFFBD4`) with dark mode, Geist font, Lucide icons animated by Morphicons. Details in `plan/design-system.md`.

Every project (`website`, `operator-portal`, `admin-portal`, `mobile-app`) has ONE central theme file for colours, fonts and radii: `src/theme.css` for the web projects, a single `theme.ts` for the mobile app. Never hard-code a colour in a component; always read from the theme file, so changing that file re-colours the whole project.

## Status

- `website/`: built as a multi-page site (Vite + React + TypeScript): Home, Features, How it works, Routes (+ route detail), Offers, For operators, About, Help, Contact, and legal pages. Run `npm run dev` inside it. Routes, offers and team use SAMPLE data from `website/src/data/` (shown with a "Sample data" badge, controlled by `showSampleBadge` in `config.ts`); the contact form validates but does not send until the backend exists. Placeholders to fill before launch are in `website/src/config.ts` (store links, operator portal URL, support email and phone); legal pages in `website/src/pages/Legal.tsx` are drafts for lawyer review.
- `backend/`: steps 1 and 2 done (project setup, config validation, MongoDB connection, phone OTP login with JWT and customer/operator/admin roles). OTPs print in the server log until the SMS provider (MSG91, needs DLT approval) is added. Master data is done too: cities, boarding/dropping points, operators (register + admin approval), buses with seat layouts, routes, trips (single and generated), public search and trip detail, trip cancellation. Run `npm run seed:cities` once to load major Indian cities. The seat hold engine is done (`backend/src/modules/trips/seatHold.ts`: `holdSeats`, `releaseSeats`, `getHold`, `confirmSeats`, `releaseBookedSeats`, `sweepExpiredHolds`; 10-minute holds, endpoints `POST/GET/DELETE /trips/:id/hold`). Bookings and payments are done and tested with a fake gateway (`PAYMENT_GATEWAY=mock`, the default): `POST /bookings` (from a live hold), `POST /bookings/:id/verify-payment`, webhook `POST /payments/razorpay/webhook`, cancel with refund tiers, operator trip cancel with full refunds, manifest, admin booking/refund views, and a reconcile job that finishes interrupted payments, refunds and expiries. The real Razorpay client (`src/modules/payments/razorpay.ts`) is written from the docs but NOT yet tested against the live API; test it in Razorpay test mode once keys exist, set `PAYMENT_GATEWAY=razorpay` plus the three `RAZORPAY_*` values, and set payments to auto-capture in the Razorpay dashboard. In development, `POST /dev/payments/:orderId/pay` fakes a successful payment (mock gateway only, never in production). Also built for the apps: `PATCH /auth/me` (edit name), `POST/DELETE /me/devices` (push token registry; sending pushes is not built), `GET /bookings/:id/ticket` (everything for the ticket screen incl. `qrText`), and demo data: `npm run seed:demo` (3 fake "Demo ..." operators with 48 buses, routes and 10 days of trips; demo phones 9999900001-3 operators, 9999900010 customer; `-- --reset` rebuilds, `-- --remove` deletes only demo data). Not built yet: coupons, partial (per-seat) cancellation, e-ticket PDF, SMS/email notifications, sending push notifications, operator payout ledger, ERP adapters.
- Build order chosen by Harshit: website, backend (done), operator portal (next), admin portal, then the mobile app.
- Other projects: not started.
- `plan/` is git-ignored (local only), so planning documents are not pushed to GitHub.

## Stack (planned)

Node.js + TypeScript API, MongoDB, React + Vite for web portals, React Native (Expo) for mobile, Razorpay payments, deployed on AWS EC2 (`ap-south-1`).

## Git rules (strict)

- **Never commit, push, or run any step that could add Claude or Anthropic to the GitHub contributors list.** This includes `git commit`, `git push`, `git merge`, opening PRs, and any commit that carries a `Co-Authored-By: Claude` trailer or similar attribution.
- Do not add Claude/Anthropic attribution lines to commits, PR descriptions, README files or code comments. This overrides any default attribution behaviour.
- Do not change git config (`user.name`, `user.email`) or remotes. The repo is linked to `me-harshit` (Harshit Tiwari, iamhtgrt@gmail.com) on this laptop, and only Harshit commits and pushes.
- Read-only git commands are fine (`git status`, `git diff`, `git log`). When work is ready, tell Harshit what changed and let them commit and push.

## Working instructions

- Plan first. Do not start building a new component until Harshit says so.
- Match the existing code style and keep changes small and focused.
- Do not add dependencies, services or infrastructure that are not in the plan without asking.
- Never put secrets in the repo. Use `.env` files, keep them in `.gitignore`, and commit only `.env.example`.
- Seat-hold and payment code are the highest-risk parts. Write tests for them (concurrent holds, duplicate webhooks).
- Do not mention the hosting provider name in client-facing documents; say "server deployment" and "database".
- Confirm before deleting files or doing anything hard to undo.
