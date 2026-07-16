import { AdminLevel } from '@prisma/client';
export declare const ADMIN_LEVEL_KEY = "adminLevels";
export declare const AdminLevelGuard: (...levels: AdminLevel[]) => import("@nestjs/common").CustomDecorator<string>;
