import { SosIncident, SosStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { AdminNotificationService } from '../admin/admin-notification.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { AckIncidentDto, ResolveIncidentDto } from './dto/update-incident.dto';
import { UpsertTrustedContactDto } from './dto/trusted-contact.dto';
export declare class SosService {
    private readonly prisma;
    private readonly auditService;
    private readonly adminNotifications;
    private readonly broadcastQueue;
    private readonly logger;
    constructor(prisma: PrismaService, auditService: AuditService, adminNotifications: AdminNotificationService, broadcastQueue: Queue);
    listTrustedContacts(userId: string): Promise<{
        name: string;
        id: string;
        email: string | null;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        userId: string;
        relation: string;
        primary: boolean;
    }[]>;
    createTrustedContact(userId: string, dto: UpsertTrustedContactDto): Promise<{
        name: string;
        id: string;
        email: string | null;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        userId: string;
        relation: string;
        primary: boolean;
    }>;
    updateTrustedContact(userId: string, id: string, dto: UpsertTrustedContactDto): Promise<{
        name: string;
        id: string;
        email: string | null;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        userId: string;
        relation: string;
        primary: boolean;
    }>;
    deleteTrustedContact(userId: string, id: string): Promise<{
        success: boolean;
    }>;
    createIncident(userId: string, dto: CreateIncidentDto): Promise<SosIncident>;
    getIncidentForUser(userId: string, id: string): Promise<{
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
    }>;
    listMyIncidents(userId: string): Promise<{
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
    }[]>;
    listIncidents(status?: SosStatus): Promise<({
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
    ackIncident(operatorId: string, id: string, _dto: AckIncidentDto): Promise<{
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
    startProgress(operatorId: string, id: string): Promise<{
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
    getOpsMetrics(windowHours?: number): Promise<{
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
    listMessages(actorId: string, incidentId: string, role: 'GUEST' | 'ADMIN'): Promise<{
        id: string;
        createdAt: Date;
        senderId: string;
        senderRole: string;
        content: string;
        incidentId: string;
    }[]>;
    sendMessage(actorId: string, incidentId: string, role: 'GUEST' | 'ADMIN', content: string): Promise<{
        id: string;
        createdAt: Date;
        senderId: string;
        senderRole: string;
        content: string;
        incidentId: string;
    }>;
    getStatusTimeline(actorId: string, incidentId: string, role: 'GUEST' | 'ADMIN'): Promise<{
        status: import("@prisma/client").$Enums.SosStatus;
        timeline: {
            status: string;
            at: string;
            note?: string;
        }[];
    }>;
    private assertIncidentAccess;
    resolveIncident(operatorId: string, id: string, dto: ResolveIncidentDto): Promise<{
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
