import { UserKind } from '@prisma/client';
import { SetMetadata } from '@nestjs/common';

export const KINDS_KEY = 'kinds';

/**
 * Restrict an endpoint to users of the specified UserKind(s).
 * Admins (STAFF) always pass this check.
 *
 * @example
 * @Kinds(UserKind.INVESTOR)              // Investor (or admin) only
 * @Kinds(UserKind.INVESTOR, UserKind.OWNER)
 */
export const Kinds = (...kinds: UserKind[]) => SetMetadata(KINDS_KEY, kinds);
