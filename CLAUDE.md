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

The shared backend API and shared types are not placed yet; see `plan/plan.md` section 3 for the intended monorepo layout and ask before creating them.

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
