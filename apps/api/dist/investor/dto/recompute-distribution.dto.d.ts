import { DistributionStatus } from '@prisma/client';
export declare class RecomputeDistributionDto {
    period?: string;
    investorUserId?: string;
}
export declare class UpdateDistributionDto {
    status: DistributionStatus;
    ledgerEventId?: string;
}
