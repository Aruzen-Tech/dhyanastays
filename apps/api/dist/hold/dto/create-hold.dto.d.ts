import { AddOnSelectionDto } from '../../add-on/dto/add-on-selection.dto';
export declare class CreateHoldDto {
    listingId: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    idempotencyKey: string;
    addOns?: AddOnSelectionDto[];
}
