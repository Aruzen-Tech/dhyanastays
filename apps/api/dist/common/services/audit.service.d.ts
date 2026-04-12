import { PrismaService } from '../../prisma/prisma.service';
type TxClient = Omit<PrismaService, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'> | any;
export declare class AuditService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    log(actorUserId: string | null, action: string, resourceType: string, resourceId: string, metadata: Record<string, unknown>, tx?: TxClient): Promise<void>;
}
export {};
