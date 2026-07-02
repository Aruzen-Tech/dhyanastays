export interface BlockedEntry {
    ip: string;
    path: string;
    blockedAt: string;
}
export declare class RateLimitService {
    private readonly logger;
    private readonly recentBlocked;
    private readonly ipCounts;
    private totalBlocked;
    recordBlocked(ip: string, path: string): void;
    getStats(): {
        totalBlocked: number;
        topBlockedIPs: {
            ip: string;
            count: number;
        }[];
        recentBlocked: BlockedEntry[];
    };
}
