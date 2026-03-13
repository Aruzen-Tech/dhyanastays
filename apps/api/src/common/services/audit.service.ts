import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxClient = Omit<PrismaService, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'> | any;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    actorUserId: string | null,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata: Record<string, unknown>,
    tx?: TxClient,
  ): Promise<void> {
    const client: TxClient = tx ?? this.prisma;
    await client.auditLog.create({
      data: {
        actorUserId,
        action,
        resourceType,
        resourceId,
        metadata,
      },
    });
  }
}
