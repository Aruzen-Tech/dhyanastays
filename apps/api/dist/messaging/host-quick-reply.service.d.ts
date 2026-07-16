import { PrismaService } from '../prisma/prisma.service';
import { UpsertQuickReplyDto } from './dto/quick-reply.dto';
export declare class HostQuickReplyService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(hostUserId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        hostId: string;
        body: string;
        label: string;
        sortOrder: number;
    }[]>;
    create(hostUserId: string, dto: UpsertQuickReplyDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        hostId: string;
        body: string;
        label: string;
        sortOrder: number;
    }>;
    update(hostUserId: string, id: string, dto: UpsertQuickReplyDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        hostId: string;
        body: string;
        label: string;
        sortOrder: number;
    }>;
    remove(hostUserId: string, id: string): Promise<{
        success: boolean;
    }>;
    private resolveHost;
}
