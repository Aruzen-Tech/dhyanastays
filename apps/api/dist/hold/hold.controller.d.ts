import { RequestUser } from '../common/decorators/current-user.decorator';
import { CreateHoldDto } from './dto/create-hold.dto';
import { HoldService } from './hold.service';
export declare class HoldController {
    private readonly holdService;
    constructor(holdService: HoldService);
    create(user: RequestUser, dto: CreateHoldDto): Promise<{
        idempotencyKey: string;
        id: string;
        createdAt: Date;
        expiresAt: Date;
        startsAt: Date;
        endsAt: Date;
        listingId: string;
        guestId: string;
        priceSnapshot: import("@prisma/client/runtime/library").JsonValue;
    }>;
    status(user: RequestUser, listingId: string, checkIn: string, checkOut: string): Promise<{
        held: false;
        mine?: undefined;
        heldUntil?: undefined;
        remainingSeconds?: undefined;
    } | {
        held: true;
        mine: boolean;
        heldUntil: string;
        remainingSeconds: number;
    }>;
    release(user: RequestUser, id: string): Promise<{
        released: boolean;
        alreadyGone: boolean;
    } | {
        released: boolean;
        alreadyGone?: undefined;
    }>;
}
