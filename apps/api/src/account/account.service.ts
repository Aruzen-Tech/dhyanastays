import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { UpdateAccountProfileDto } from './dto/update-account-profile.dto';

/** Fields a user may change about themselves — used for the audit diff. */
const EDITABLE = ['fullName', 'phone', 'avatarUrl'] as const;

/**
 * Personal information for the signed-in user, whatever their role.
 *
 * The existing profile endpoints live under `/guest` and are `@Roles(GUEST)`,
 * so hosts and admins had no way to see or correct their own details. This is
 * deliberately role-agnostic; role-specific records (the host application, the
 * payout account, guest preferences) stay where they are and are linked from
 * the page instead of being merged in here.
 */
@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        kind: true,
        createdAt: true,
        // Mapped to a boolean below - the hash never leaves the service.
        passwordHash: true,
        // Enough context to point the user at whatever they still need to do.
        hostProfile: {
          select: {
            id: true,
            verificationStatus: true,
            rejectionReason: true,
            profile: { select: { id: true, panEnc: true, idEnc: true } },
            payoutAccount: { select: { status: true } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const host = user.hostProfile;
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      kind: user.kind,
      createdAt: user.createdAt,
      /** False for Auth0/SSO accounts, which have no local password to change. */
      hasPassword: !!user.passwordHash,
      /** Phone became required at signup; older accounts still have none. */
      missing: [
        ...(user.phone ? [] : ['phone']),
      ],
      host: host
        ? {
            verificationStatus: host.verificationStatus,
            rejectionReason: host.rejectionReason,
            // Never leak the ciphertext — just whether it's on file.
            applicationComplete: !!host.profile?.panEnc && !!host.profile?.idEnc,
            payoutAccountStatus: host.payoutAccount?.status ?? null,
          }
        : null,
    };
  }

  /** Update own details. Only the fields actually sent are written. */
  async updateProfile(userId: string, dto: UpdateAccountProfileDto) {
    const before = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, phone: true, avatarUrl: true },
    });
    if (!before) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName !== undefined && { fullName: dto.fullName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      },
    });

    // Record what actually changed — a self-service edit to contact details is
    // worth being able to reconstruct later.
    const changed = EDITABLE.filter(
      (f) => dto[f] !== undefined && dto[f] !== before[f],
    );
    if (changed.length > 0) {
      await this.audit.log(userId, 'ACCOUNT_PROFILE_UPDATED', 'user', userId, {
        fields: changed,
      });
    }

    return this.getProfile(userId);
  }
}
