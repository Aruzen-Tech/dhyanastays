import { AdminLevel } from '@prisma/client';
import { SetMetadata } from '@nestjs/common';

export const ADMIN_LEVEL_KEY = 'adminLevels';

/**
 * Restrict an endpoint to staff members at or above the specified admin level(s).
 *
 * @example
 * @AdminLevel(AdminLevel.L1)              // Super Admin only
 * @AdminLevel(AdminLevel.L1, AdminLevel.L2)  // L1 or L2
 */
export const AdminLevelGuard = (...levels: AdminLevel[]) =>
  SetMetadata(ADMIN_LEVEL_KEY, levels);
