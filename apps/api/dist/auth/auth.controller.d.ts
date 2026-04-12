import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { SyncUserDto } from './dto/sync-user.dto';
import { RequestUser } from '../common/decorators/current-user.decorator';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
    logout(user: RequestUser): Promise<{
        success: boolean;
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
    }>;
}
