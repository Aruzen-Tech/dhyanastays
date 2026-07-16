import { RequestUser } from '../common/decorators/current-user.decorator';
import { SosService } from './sos.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpsertTrustedContactDto } from './dto/trusted-contact.dto';
export declare class SosController {
    private readonly sos;
    constructor(sos: SosService);
    createIncident(user: RequestUser, dto: CreateIncidentDto): Promise<{
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
    listMyIncidents(user: RequestUser): Promise<{
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
    getIncident(user: RequestUser, id: string): Promise<{
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
    listContacts(user: RequestUser): Promise<{
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
    createContact(user: RequestUser, dto: UpsertTrustedContactDto): Promise<{
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
    updateContact(user: RequestUser, id: string, dto: UpsertTrustedContactDto): Promise<{
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
    deleteContact(user: RequestUser, id: string): Promise<{
        success: boolean;
    }>;
}
