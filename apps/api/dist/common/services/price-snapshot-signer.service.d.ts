import { ConfigService } from '@nestjs/config';
export declare class PriceSnapshotSignerService {
    private readonly secret;
    constructor(config: ConfigService);
    sign(snapshot: Record<string, unknown>): string;
    verify(snapshot: Record<string, unknown>, hmac: string): boolean;
    private canonicalize;
}
