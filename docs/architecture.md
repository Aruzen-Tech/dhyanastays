# Architecture

## Monorepo
- `apps/api`: NestJS API (Phase 1 core marketplace backend)
- `apps/web`: Next.js frontend shell
- `packages/shared`: shared types/constants

## Infrastructure
- PostgreSQL for transactional data
- Redis for queue/job scheduling
- Meilisearch for faceted listing discovery index
- S3-compatible storage + CDN (stubbed in env)
- Razorpay for payment processing (integration in upcoming iteration)

## Phase 1 boundaries
This iteration includes scaffold, Auth/RBAC, host listing workflow, admin approvals.
Booking engine, payments, refunds, payouts, workers, and search indexing are in next iterations.