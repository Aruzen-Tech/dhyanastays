import { UserRole } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { SyncUserDto } from './dto/sync-user.dto';
import type { RequestUser } from './strategies/jwt.strategy';
import { LoginRateLimiterService } from './services/login-rate-limiter.service';
import { ReferralService } from '../referral/referral.service';
interface IssueOptions {
    familyId?: string;
    ipAddress?: string;
    userAgent?: string;
    device?: string;
}
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly loginRateLimiter;
    private readonly referralService;
    constructor(prisma: PrismaService, jwtService: JwtService, loginRateLimiter: LoginRateLimiterService, referralService: ReferralService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        tokenType: string;
    }>;
    login(dto: LoginDto, options?: IssueOptions): Promise<{
        accessToken: string;
        refreshToken: string;
        tokenType: string;
    } | {
        mfaRequired: boolean;
        mfaToken: string;
    }>;
    refresh(dto: RefreshDto, options?: IssueOptions): Promise<{
        accessToken: string;
        refreshToken: string;
        tokenType: string;
    }>;
    logout(userId: string): Promise<{
        success: boolean;
    }>;
    logoutSession(userId: string, familyId: string): Promise<{
        success: boolean;
    }>;
    getSessions(userId: string): Promise<{
        id: string;
        familyId: string;
        ipAddress: string;
        device: string;
        lastSeen: Date;
    }[]>;
    syncUser(jwtUser: RequestUser, dto: SyncUserDto): Promise<{
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
    getMe(userId: string): Promise<{
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
    issueTokens(userId: string, email: string, role: UserRole, options?: IssueOptions): Promise<{
        accessToken: string;
        refreshToken: string;
        tokenType: string;
    }>;
    private mapRole;
    private safeProfile;
}
export {};
