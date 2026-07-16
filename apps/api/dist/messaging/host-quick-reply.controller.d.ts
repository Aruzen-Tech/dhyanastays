import { RequestUser } from '../common/decorators/current-user.decorator';
import { HostQuickReplyService } from './host-quick-reply.service';
import { UpsertQuickReplyDto } from './dto/quick-reply.dto';
export declare class HostQuickReplyController {
    private readonly service;
    constructor(service: HostQuickReplyService);
    list(user: RequestUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        hostId: string;
        body: string;
        label: string;
        sortOrder: number;
    }[]>;
    create(user: RequestUser, dto: UpsertQuickReplyDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        hostId: string;
        body: string;
        label: string;
        sortOrder: number;
    }>;
    update(user: RequestUser, id: string, dto: UpsertQuickReplyDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        hostId: string;
        body: string;
        label: string;
        sortOrder: number;
    }>;
    remove(user: RequestUser, id: string): Promise<{
        success: boolean;
    }>;
}
