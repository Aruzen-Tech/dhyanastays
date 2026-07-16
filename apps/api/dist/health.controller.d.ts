import type { Response } from 'express';
import { PrismaService } from './prisma/prisma.service';
export declare class HealthController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    check(): {
        status: string;
        timestamp: string;
        uptime: number;
    };
    live(): {
        status: string;
    };
    ready(res: Response): Promise<void>;
}
