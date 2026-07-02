import { SosStatus } from '@prisma/client';
import { RequestUser } from '../common/decorators/current-user.decorator';
import { SosService } from './sos.service';
import { AckIncidentDto, ResolveIncidentDto } from './dto/update-incident.dto';
export declare class AdminSosController {
    private readonly sos;
    constructor(sos: SosService);
    list(status?: SosStatus): Promise<({
        user: {
            id: string;
            fullName: string;
            phone: string | null;
        };
        broadcasts: {
            id: string;
            updatedAt: Date;
            status: string;
            channel: string;
            lastError: string | null;
            sentAt: Date;
            incidentId: string;
            target: string;
        }[];
    } & {
        message: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: import("@prisma/client").$Enums.SosStatus;
        bookingId: string | null;
        resolvedAt: Date | null;
        tier: import("@prisma/client").$Enums.SosTier;
        lat: number;
        lng: number;
        openedAt: Date;
        ackedAt: Date | null;
        ackedBy: string | null;
        resolvedBy: string | null;
    })[]>;
    metrics(windowHours?: string): Promise<{
        windowHours: number;
        totalIncidents: number;
        ackedCount: number;
        pendingAckCount: number;
        ackLatencyMs: {
            p50: number | null;
            p95: number | null;
            p99: number | null;
            max: number | null;
        };
        broadcastChannels: {
            sent: number;
            failed: number;
            skipped: number;
        };
        slaBreaches: number;
    }>;
    get(id: string): Promise<({
        user: {
            id: string;
            fullName: string;
            phone: string | null;
        };
        broadcasts: {
            id: string;
            updatedAt: Date;
            status: string;
            channel: string;
            lastError: string | null;
            sentAt: Date;
            incidentId: string;
            target: string;
        }[];
    } & {
        message: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: import("@prisma/client").$Enums.SosStatus;
        bookingId: string | null;
        resolvedAt: Date | null;
        tier: import("@prisma/client").$Enums.SosTier;
        lat: number;
        lng: number;
        openedAt: Date;
        ackedAt: Date | null;
        ackedBy: string | null;
        resolvedBy: string | null;
    }) | undefined>;
    getTimeline(user: RequestUser, id: string): Promise<{
        status: import("@prisma/client").$Enums.SosStatus;
        timeline: {
            status: string;
            at: string;
            note?: string;
        }[];
    }>;
    listMessages(user: RequestUser, id: string): Promise<{
        id: string;
        createdAt: Date;
        senderId: string;
        senderRole: string;
        content: string;
        incidentId: string;
    }[]>;
    sendMessage(user: RequestUser, id: string, body: {
        content: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        senderId: string;
        senderRole: string;
        content: string;
        incidentId: string;
    }>;
    ack(user: RequestUser, id: string, dto: AckIncidentDto): Promise<{
        message: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: import("@prisma/client").$Enums.SosStatus;
        bookingId: string | null;
        resolvedAt: Date | null;
        tier: import("@prisma/client").$Enums.SosTier;
        lat: number;
        lng: number;
        openedAt: Date;
        ackedAt: Date | null;
        ackedBy: string | null;
        resolvedBy: string | null;
    }>;
    start(user: RequestUser, id: string): Promise<{
        message: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: import("@prisma/client").$Enums.SosStatus;
        bookingId: string | null;
        resolvedAt: Date | null;
        tier: import("@prisma/client").$Enums.SosTier;
        lat: number;
        lng: number;
        openedAt: Date;
        ackedAt: Date | null;
        ackedBy: string | null;
        resolvedBy: string | null;
    }>;
    resolve(user: RequestUser, id: string, dto: ResolveIncidentDto): Promise<{
        message: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: import("@prisma/client").$Enums.SosStatus;
        bookingId: string | null;
        resolvedAt: Date | null;
        tier: import("@prisma/client").$Enums.SosTier;
        lat: number;
        lng: number;
        openedAt: Date;
        ackedAt: Date | null;
        ackedBy: string | null;
        resolvedBy: string | null;
    }>;
}
