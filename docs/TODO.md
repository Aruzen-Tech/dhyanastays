# Dhyana Stays — To-Do (post booking-engine hardening)

Status as of **2026-07-08**, commit `4e37557` on `dev`. All spec sections
(§5.6–§5.18) are delivered; the platform is in the **hardening / launch-prep**
phase. Items below are ordered by priority; each is grounded in a verified fact,
not speculation.

Legend: ☐ open · priority P0 (now) → P3 (pre-launch)

---

## P0 — Housekeeping (do first, low effort)

- ☐ **Push `dev` to origin.** Local `dev` is 6 commits ahead of `origin/dev` —
  the booking-engine fixes, changelogs, control panel, and hold feature have no
  remote backup.
- ☐ **Stop tracking `apps/api/dist/`.** Compiled build output is committed to
  git (hundreds of generated files; `tsconfig.tsbuildinfo` dirties every diff)
  and `dist` is absent from `.gitignore`. Fix: add `apps/api/dist/` to
  `.gitignore` + `git rm -r --cached apps/api/dist`.
- ☐ **Decide: commit `docs/booking-engine-test-report.docx` or keep binaries out
  of git.** The `.md` is committed; the Word version is currently untracked.
- ☐ **Triage the pre-existing unit failure** —
  `listing.service.spec.ts › moves to pending approval when sensitive fields are
  changed` (expects `PENDING_APPROVAL`, gets `undefined`). Unrelated to the
  booking engine; confirmed failing before this work. Fix the moderation code or
  the test.

## P1 — Booking engine follow-ups (from the test report)

- ☐ **Run the integration suite in CI.** `.github/workflows/ci.yml` already
  provisions a Postgres 16 service container but only runs `pnpm test` (unit).
  Add `prisma migrate deploy` + `pnpm test:int` so the 34 integration tests and
  concurrency proofs gate every PR — these are the tests that caught all four
  engine bugs.
- ☐ **Pay-later instalments 2+ lifecycle test.** The first instalment is covered
  end-to-end; `initPayLaterInstalmentPayment` / `recordInstalmentCapture`
  (seq 2+ → `PAY_LATER_INSTALMENT_CAPTURED` / `PAY_LATER_FINAL_CAPTURED`) have
  unit coverage only.
- ☐ **"Balance received" notification (product decision).** Balance settlement
  deliberately doesn't re-send the "booking confirmed" email; decide whether the
  guest should get a dedicated payment-received confirmation, then implement via
  the outbox.
- ☐ **Payout rounding test.** Deposit + balance payout lines use proportional
  rounding — for exotic totals the two lines could drift ±1 paise from the
  accommodation total. Add a targeted test pinning the intended behaviour.

## P2 — Product gaps

- ☐ **Expose PAY_LATER in the booking UI.** The backend flow now works
  end-to-end (fixed in `4e37557`), but the plan selector in
  `apps/web/app/listings/[id]/page.tsx` only offers `FULL | DEPOSIT_50`. Add the
  Pay Later option (3/6/12 months with first-instalment preview from the quote's
  `payLaterFirstInstalment`), ideally gated by a feature flag via the new
  Platform Control Panel so it can be enabled gradually.
- ☐ **Merge `dev` → `main`.** `main` is the PR target; all recent work lives
  only on `dev`. Open a PR once CI runs the integration suite.

## P3 — Launch readiness

- ☐ **Web E2E tests.** No Playwright/Cypress setup exists
  (`apps/web` has no test directory). Cover the money path at minimum:
  search → listing → hold → book → pay (stub) → cancel.
- ☐ **Provision production providers.** Env validation gates them, but the real
  credentials/accounts still need provisioning: Razorpay live keys + webhook
  secret, email/SMS providers, object storage, `SOS_OPS_PHONE`/`SOS_OPS_EMAIL`.
- ☐ **Monitoring & alerting.** Error tracking (e.g. Sentry), uptime checks, and
  alerts on the queues that back SLAs (`sos-broadcast` P99 < 5s, outbox lag,
  webhook failures).
- ☐ **Database operations.** Automated backups + restore drill; connection
  pooling for production load.
- ☐ **Security review.** RBAC/audit/idempotency/HMAC safeguards are in place —
  run a structured review (or `/security-review`) over the payment and auth
  surfaces before going live.

---

*Update this file as items complete; record shipped work in
[`CHANGELOG.md`](../CHANGELOG.md) + [`docs/CHANGELOG-detailed.md`](./CHANGELOG-detailed.md)
per convention.*
