# API (Phase 1 baseline)

## Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

## Listings
- `POST /api/host/listings`
- `PATCH /api/host/listings/:id`
- `GET /api/listings`
- `GET /api/listings/:id`

## Admin approvals
- `GET /api/admin/listings/pending`
- `POST /api/admin/listings/:id/approve`
- `POST /api/admin/listings/:id/reject`
- `POST /api/admin/listings/:id/request-changes`

## Pending in next iteration
- Pricing/holds/bookings endpoints
- Payments init/webhook endpoints
- Payout endpoints