import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { SyncUserDto } from './dto/sync-user.dto';
import type { RequestUser } from './strategies/jwt.strategy';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        tokenType: string;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        tokenType: string;
    }>;
    refresh(dto: RefreshDto): Promise<{
        accessToken: string;
        refreshToken: string;
        tokenType: string;
    }>;
    logout(userId: string): Promise<{
        success: boolean;
    }>;
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
    }>;
    private issueTokens;
    private mapRole;
    private safeProfile;
}
