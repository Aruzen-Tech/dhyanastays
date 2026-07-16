import { Request } from 'express';
import { AuthService } from './auth.service';
import { MfaService } from './services/mfa.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { SyncUserDto } from './dto/sync-user.dto';
import { MfaVerifyDto } from './dto/mfa-verify.dto';
import { MfaChallengeDto } from './dto/mfa-challenge.dto';
import { RequestUser } from '../common/decorators/current-user.decorator';
export declare class AuthController {
    private readonly authService;
    private readonly mfaService;
    constructor(authService: AuthService, mfaService: MfaService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        tokenType: string;
    }>;
    login(dto: LoginDto, req: Request): Promise<{
        accessToken: string;
        refreshToken: string;
        tokenType: string;
    } | {
        mfaRequired: boolean;
        mfaToken: string;
    }>;
    refresh(dto: RefreshDto, req: Request): Promise<{
        accessToken: string;
        refreshToken: string;
        tokenType: string;
    }>;
    logout(user: RequestUser): Promise<{
        success: boolean;
    }>;
    getSessions(user: RequestUser): Promise<{
        id: string;
        familyId: string;
        ipAddress: string;
        device: string;
        lastSeen: Date;
    }[]>;
    logoutSession(user: RequestUser, familyId: string): Promise<{
        success: boolean;
    }>;
    getMfaStatus(user: RequestUser): Promise<{
        totpEnabled: boolean;
        factors: {
            type: import("@prisma/client").$Enums.MfaType;
            confirmed: boolean;
            enrolledAt: Date;
        }[];
    }>;
    setupMfa(user: RequestUser): Promise<{
        secret: string;
        otpAuthUrl: string;
        manualEntryKey: string;
    }>;
    confirmMfa(user: RequestUser, dto: MfaVerifyDto): Promise<{
        success: boolean;
        message: string;
    }>;
    disableMfa(user: RequestUser, dto: MfaVerifyDto): Promise<{
        success: boolean;
        message: string;
    }>;
    mfaChallenge(dto: MfaChallengeDto, req: Request): Promise<{
        accessToken: string;
        refreshToken: string;
        tokenType: string;
    }>;
    syncUser(user: RequestUser, dto: SyncUserDto): Promise<{
        id: string;
        email: string;
        fullName: string;
        role: import("@prisma/client").$Enums.UserRole;
        isActive: boolean;
        auth0Sub: string | null;
        createdAt: Date;
        hostProfile: {
            id: string;
            verificationStatus: string;
        } | null;
        adminLevel: string | null;
    }>;
    getMe(user: RequestUser): Promise<{
        id: string;
        email: string;
        fullName: string;
        role: import("@prisma/client").$Enums.UserRole;
        isActive: boolean;
        auth0Sub: string | null;
        createdAt: Date;
        hostProfile: {
            id: string;
            verificationStatus: string;
        } | null;
        adminLevel: string | null;
    }>;
}
