import { PrismaService } from '../prisma/prisma.service';
import { UpsertQuickReplyDto } from './dto/quick-reply.dto';
export declare class HostQuickReplyService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(hostUserId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        sortOrder: number;
        hostId: string;
        body: string;
    }[]>;
    create(hostUserId: string, dto: UpsertQuickReplyDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        sortOrder: number;
        hostId: string;
        body: string;
    }>;
    update(hostUserId: string, id: string, dto: UpsertQuickReplyDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        sortOrder: number;
        hostId: string;
        body: string;
    }>;
    remove(hostUserId: string, id: string): Promise<{
        success: boolean;
    }>;
    private resolveHost;
}
