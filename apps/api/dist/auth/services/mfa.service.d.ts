import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth.service';
export declare class MfaService {
    private readonly prisma;
    private readonly jwtService;
    private readonly authService;
    constructor(prisma: PrismaService, jwtService: JwtService, authService: AuthService);
    setupTotp(userId: string): Promise<{
        secret: string;
        otpAuthUrl: string;
        manualEntryKey: string;
    }>;
    confirmTotp(userId: string, code: string): Promise<{
        success: boolean;
        message: string;
    }>;
    disableTotp(userId: string, code: string): Promise<{
        success: boolean;
        message: string;
    }>;
    challenge(mfaToken: string, code: string, options?: {
        ipAddress?: string;
        userAgent?: string;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
        tokenType: string;
    }>;
    getStatus(userId: string): Promise<{
        totpEnabled: boolean;
        factors: {
            type: import("@prisma/client").$Enums.MfaType;
            confirmed: boolean;
            enrolledAt: Date;
        }[];
    }>;
}
