import { RequestUser } from '../common/decorators/current-user.decorator';
import { CreateHoldDto } from './dto/create-hold.dto';
import { HoldService } from './hold.service';
export declare class HoldController {
    private readonly holdService;
    constructor(holdService: HoldService);
    create(user: RequestUser, dto: CreateHoldDto): Promise<{
        id: string;
        idempotencyKey: string;
        listingId: string;
        guestId: string;
        startsAt: Date;
        endsAt: Date;
        expiresAt: Date;
        priceSnapshot: import("@prisma/client/runtime/library").JsonValue;
        createdAt: Date;
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
