# State Machines

All state transitions are enforced server-side in code. No client can skip a state.

---

## 1. Booking State Machine

### States

| State | Meaning |
|---|---|
| `HOLD` | Inventory locked for 15 min; no payment yet |
| `PAYMENT_PENDING` | Booking created from hold; awaiting payment |
| `CONFIRMED_DEPOSIT` | 50% deposit captured; balance due later |
| `BALANCE_DUE` | Balance payment window has opened (48h before check-in) |
| `CONFIRMED_PAID` | Full payment captured |
| `CANCELLED` | Cancelled with no refund |
| `REFUNDED` | Cancelled with partial or full refund issued |
| `COMPLETED` | Guest checked out; booking closed |

### Transitions

```
FULL payment plan:
  HOLD
    └─[POST /bookings]──────────────────► PAYMENT_PENDING
                                              └─[webhook: payment.captured]──► CONFIRMED_PAID
                                                                                    └─[checkout]──► COMPLETED
                                                                                    └─[cancel ≥48h]─► REFUNDED (100%)
                                                                                    └─[cancel <48h >10h]─► REFUNDED (50%)
                                                                                    └─[cancel ≤10h]─► CANCELLED (0%)

DEPOSIT_50 payment plan:
  HOLD
    └─[POST /bookings]──────────────────► PAYMENT_PENDING
                                              └─[webhook: payment.captured (deposit)]──► CONFIRMED_DEPOSIT
                                                                                              └─[balanceDueAt reached]──► BALANCE_DUE
                                                                                              │                               └─[balance paid]──► CONFIRMED_PAID
                                                                                              │                               └─[24h grace expired]──► CANCELLED (auto)
                                                                                              └─[full amount captured]──► CONFIRMED_PAID
                                                                                                                              └─[checkout]──► COMPLETED

Any CONFIRMED_* state:
  CONFIRMED_DEPOSIT / CONFIRMED_PAID
    └─[admin cancel]──► REFUNDED or CANCELLED (policy-based)
```

### Triggers

| Trigger | Actor | Code location |
|---|---|---|
| Hold created | Guest | `HoldService.createHold()` |
| Booking created from hold | Guest | `BookingService.createBooking()` |
| Payment captured | Razorpay webhook | `PaymentService.handleWebhook()` → `BookingService.confirmPayment()` |
| Balance due transition | Cron (every 15 min) | `BookingService.transitionToBalanceDue()` |
| Auto-cancel unpaid balance | Cron (every 15 min) | `BookingService.autoCancelUnpaidBalance()` |
| Guest/Admin cancel | API | `BookingService.cancelBooking()` |
| Checkout complete | Admin/System | `BookingService.completeBooking()` |

### Cancellation Refund Policy (locked)

| Hours before check-in | Refund |
|---|---|
| ≥ 48h | 100% of total paid |
| < 48h and > 10h | 50% of total paid |
| ≤ 10h | 0% |

Implemented in: `PricingService.computeRefundAmount()`

---

## 2. Payout State Machine

### States

| State | Meaning |
|---|---|
| `NOT_ELIGIBLE` | Payout line created; check-in not yet occurred |
| `ELIGIBLE` | Check-in + 24h passed; ready to be batched |
| `SCHEDULED` | Included in a weekly payout batch |
| `PAID` | Payout sent to host bank account |
| `ON_HOLD` | Manually held by admin (dispute/investigation) |
| `REVERSED` | Payout reversed after refund-after-payout |

### Transitions

```
NOT_ELIGIBLE
  └─[check-in + 24h]──────────────────► ELIGIBLE
                                            └─[weekly batch run]──► SCHEDULED
                                                                         └─[batch marked paid]──► PAID
                                                                         └─[refund after payout]──► REVERSED
                                                                                                       └─[negative balance carry-forward]

ELIGIBLE / SCHEDULED
  └─[admin hold]──► ON_HOLD
                        └─[admin release]──► ELIGIBLE
```

### Triggers

| Trigger | Actor | Code location |
|---|---|---|
| Payout line created | Payment webhook | `BookingService.confirmPayment()` |
| Mark eligible | Cron (hourly) | `PayoutService.markEligible()` |
| Weekly batch | Cron (Monday 03:30 UTC) | `PayoutService.runWeeklyBatch()` |
| Mark batch paid | Admin API | `PayoutService.markBatchPaid()` |
| Refund after payout | Admin/System | `PayoutService.handleRefundAfterPayout()` |

### Host Share Calculation

```
hostShare = Math.round(capturedAmountINR × 0.90)   // 90% to host
platformFee = capturedAmountINR - hostShare          // 10% retained
```

---

## 3. Listing Approval State Machine

### States

| State | Meaning |
|---|---|
| `DRAFT` | Not yet submitted |
| `PENDING_APPROVAL` | Submitted; awaiting admin review |
| `APPROVED` | Live and bookable |
| `REJECTED` | Rejected by admin |
| `CHANGES_REQUESTED` | Admin requested changes before approval |

### Transitions

```
DRAFT
  └─[host submits]──► PENDING_APPROVAL
                           └─[admin approve]──► APPROVED
                           └─[admin reject]──► REJECTED
                           └─[admin request changes]──► CHANGES_REQUESTED
                                                             └─[host resubmits]──► PENDING_APPROVAL

APPROVED
  └─[host edits sensitive fields]──► PENDING_APPROVAL (re-approval required)
```

### Re-approval Trigger Fields

Editing any of these fields on an `APPROVED` listing forces it back to `PENDING_APPROVAL`:
- `city`
- `state`
- `country`
- `description`

Implemented in: `ListingService.isReapprovalTriggered()`

---

## 4. Hold State Machine

### States

| State | Meaning |
|---|---|
| `ACTIVE` | Hold is valid; inventory locked |
| `EXPIRED` | TTL (15 min) elapsed; inventory released |
| `CONVERTED` | Converted to a booking |

### Transitions

```
ACTIVE
  └─[15 min TTL]──► EXPIRED (job: hold_expiry, every minute)
  └─[POST /bookings]──► CONVERTED
```

---

## 5. Payment State Machine

### States

| State | Meaning |
|---|---|
| `INITIATED` | Razorpay order created; awaiting client payment |
| `CAPTURED` | Payment confirmed by Razorpay webhook |
| `FAILED` | Payment failed |
| `REFUNDED` | Refund issued |

### Transitions

```
INITIATED
  └─[webhook: payment.captured]──► CAPTURED
  └─[webhook: payment.failed]──► FAILED

CAPTURED
  └─[booking cancelled with refund]──► REFUNDED
