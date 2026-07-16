"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingStateMachine = exports.TRANSITIONS = exports.GuardFailedException = exports.IllegalTransitionException = void 0;
const common_1 = require("@nestjs/common");
class IllegalTransitionException extends common_1.ConflictException {
    constructor(from, event) {
        super({
            statusCode: 409,
            error: 'IllegalTransition',
            message: `No transition for event ${event} from state ${from}`,
            from,
            event,
        });
    }
}
exports.IllegalTransitionException = IllegalTransitionException;
class GuardFailedException extends common_1.ConflictException {
    constructor(event, reason) {
        super({
            statusCode: 409,
            error: 'GuardFailed',
            message: `Guard rejected event ${event}: ${reason}`,
            event,
            reason,
        });
    }
}
exports.GuardFailedException = GuardFailedException;
exports.TRANSITIONS = [
    {
        event: 'PAYMENT_CONFIRMED_FULL',
        from: ['PAYMENT_PENDING'],
        to: 'CONFIRMED_PAID',
        guard: (b) => b.plan === 'FULL',
    },
    {
        event: 'PAYMENT_CONFIRMED_DEPOSIT',
        from: ['PAYMENT_PENDING'],
        to: 'CONFIRMED_DEPOSIT',
        guard: (b) => b.plan === 'DEPOSIT_50',
    },
    {
        event: 'PAY_LATER_FIRST_CAPTURED',
        from: ['PAYMENT_PENDING'],
        to: 'CONFIRMED_DEPOSIT',
        guard: (b) => b.plan === 'PAY_LATER',
    },
    {
        event: 'PAY_LATER_INSTALMENT_CAPTURED',
        from: ['CONFIRMED_DEPOSIT'],
        to: 'CONFIRMED_DEPOSIT',
        guard: (b) => b.plan === 'PAY_LATER',
    },
    {
        event: 'PAY_LATER_FINAL_CAPTURED',
        from: ['CONFIRMED_DEPOSIT'],
        to: 'CONFIRMED_PAID',
        guard: (b) => b.plan === 'PAY_LATER',
    },
    {
        event: 'BALANCE_DUE_TRIGGERED',
        from: ['CONFIRMED_DEPOSIT'],
        to: 'BALANCE_DUE',
    },
    {
        event: 'BALANCE_PAID',
        from: ['BALANCE_DUE'],
        to: 'CONFIRMED_PAID',
    },
    {
        event: 'GUEST_CANCELLED',
        from: ['PAYMENT_PENDING', 'CONFIRMED_DEPOSIT', 'CONFIRMED_PAID', 'BALANCE_DUE'],
        to: cancelTarget,
    },
    {
        event: 'ADMIN_CANCELLED',
        from: ['PAYMENT_PENDING', 'CONFIRMED_DEPOSIT', 'CONFIRMED_PAID', 'BALANCE_DUE'],
        to: cancelTarget,
    },
    {
        event: 'AUTO_CANCEL_UNPAID_BALANCE',
        from: ['BALANCE_DUE'],
        to: cancelTarget,
    },
    {
        event: 'AUTO_CANCEL_PAY_LATER_DEFAULT',
        from: ['PAYMENT_PENDING', 'CONFIRMED_DEPOSIT', 'BALANCE_DUE'],
        to: cancelTarget,
    },
    {
        event: 'STAY_COMPLETED',
        from: ['CONFIRMED_PAID', 'CONFIRMED_DEPOSIT'],
        to: 'COMPLETED',
    },
    {
        event: 'AUTO_COMPLETED',
        from: ['CONFIRMED_PAID', 'CONFIRMED_DEPOSIT'],
        to: 'COMPLETED',
    },
    {
        event: 'ADMIN_FULL_REFUND_ISSUED',
        from: ['CONFIRMED_DEPOSIT', 'CONFIRMED_PAID', 'BALANCE_DUE', 'COMPLETED', 'CANCELLED'],
        to: 'REFUNDED',
    },
];
function cancelTarget(_booking, ctx) {
    return (ctx.refundAmountPaise ?? 0) > 0 ? 'REFUNDED' : 'CANCELLED';
}
let BookingStateMachine = class BookingStateMachine {
    async transition(tx, booking, event, ctx) {
        const transition = exports.TRANSITIONS.find((t) => t.event === event && t.from.includes(booking.status));
        if (!transition) {
            throw new IllegalTransitionException(booking.status, event);
        }
        if (transition.guard && !transition.guard(booking, ctx)) {
            throw new GuardFailedException(event, `from=${booking.status} plan=${booking.plan}`);
        }
        const to = typeof transition.to === 'function' ? transition.to(booking, ctx) : transition.to;
        const entry = {
            from: booking.status,
            to,
            event,
            actorId: ctx.actorId,
            at: new Date().toISOString(),
            ...(ctx.metadata ? { metadata: ctx.metadata } : {}),
        };
        const existing = Array.isArray(booking.statusHistory)
            ? booking.statusHistory
            : [];
        const nextHistory = [...existing, entry];
        const updated = await tx.booking.update({
            where: { id: booking.id },
            data: {
                status: to,
                statusHistory: nextHistory,
            },
        });
        return updated;
    }
    static readHistory(booking) {
        return Array.isArray(booking.statusHistory)
            ? booking.statusHistory
            : [];
    }
};
exports.BookingStateMachine = BookingStateMachine;
exports.BookingStateMachine = BookingStateMachine = __decorate([
    (0, common_1.Injectable)()
], BookingStateMachine);
//# sourceMappingURL=state-machine.js.map