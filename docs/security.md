# Security

## Auth/RBAC
- JWT bearer auth enforced globally (except explicit `@Public()` routes).
- Role checks are server-side via `@Roles()` and `RolesGuard`.
- Admin self-registration is disabled.

## Payment/Webhook (Phase 1 next iterations)
- Razorpay webhook signature verification required.
- Booking confirmation only after verified server-side payment event.
- Idempotency keys required for payment and booking mutations.

## Platform controls
- Audit logs are append-only records for auth/admin/financial actions.
- Secrets are loaded from env vars, not hardcoded.