import { Injectable, Logger } from '@nestjs/common';

export interface BlockedEntry {
  ip: string;
  path: string;
  blockedAt: string;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly recentBlocked: BlockedEntry[] = [];
  private readonly ipCounts = new Map<string, number>();
  private totalBlocked = 0;

  recordBlocked(ip: string, path: string) {
    this.totalBlocked++;
    this.ipCounts.set(ip, (this.ipCounts.get(ip) ?? 0) + 1);
    this.recentBlocked.unshift({ ip, path, blockedAt: new Date().toISOString() });
    if (this.recentBlocked.length > 100) this.recentBlocked.pop();
  }

  getStats() {
    const topBlockedIPs = [...this.ipCounts.entries()]
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return {
      totalBlocked: this.totalBlocked,
      topBlockedIPs,
      recentBlocked: this.recentBlocked.slice(0, 50),
    };
  }
}
