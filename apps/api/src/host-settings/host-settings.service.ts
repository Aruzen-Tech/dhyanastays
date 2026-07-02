import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FeatureFlagService } from '../feature/feature-flag.service';
import { FEATURE_REGISTRY } from '../feature/feature-flags.registry';

export interface HostSettingsDto {
  instantBook?: boolean;
  allowGuestMessages?: boolean;
  allowConciergeChat?: boolean;
  emailOnNewBooking?: boolean;
  smsOnNewBooking?: boolean;
}

@Injectable()
export class HostSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagService,
  ) {}

  /** Resolve hostId from the authenticated user. */
  private async hostIdFor(userId: string): Promise<string> {
    const host = await this.prisma.host.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!host) throw new ForbiddenException('Host profile not found');
    return host.id;
  }

  /** Get (or lazily create) this host's settings + host-relevant feature availability. */
  async getForHost(userId: string) {
    const hostId = await this.hostIdFor(userId);
    const settings = await this.prisma.hostSetting.upsert({
      where: { hostId },
      create: { hostId },
      update: {},
    });

    // Read-only platform feature availability for features hosts care about.
    const enabled = await this.featureFlags.enabledMap();
    const features = FEATURE_REGISTRY.filter((f) => f.audience.includes('host')).map(
      (f) => ({
        key: f.key,
        label: f.label,
        description: f.description,
        category: f.category,
        enabled: enabled[f.key] ?? f.defaultEnabled,
      }),
    );

    return { settings, features };
  }

  /** Host updates their own toggles. */
  async update(userId: string, dto: HostSettingsDto) {
    const hostId = await this.hostIdFor(userId);
    const settings = await this.prisma.hostSetting.upsert({
      where: { hostId },
      create: { hostId, ...sanitize(dto) },
      update: sanitize(dto),
    });
    return settings;
  }

  // ── Enforcement helpers (used by messaging / concierge) ───────────────────
  // Callers hold the host's USER id; resolve to hostId internally.

  private async settingByHostUserId(hostUserId: string) {
    const host = await this.prisma.host.findUnique({
      where: { userId: hostUserId },
      select: { id: true },
    });
    if (!host) return null;
    return this.prisma.hostSetting.findUnique({ where: { hostId: host.id } });
  }

  /** Does this host accept direct guest messages? Defaults true if no row. */
  async allowsGuestMessages(hostUserId: string): Promise<boolean> {
    const s = await this.settingByHostUserId(hostUserId);
    return s ? s.allowGuestMessages : true;
  }

  /** Does this host accept concierge chat on their bookings? Defaults true. */
  async allowsConciergeChat(hostUserId: string): Promise<boolean> {
    const s = await this.settingByHostUserId(hostUserId);
    return s ? s.allowConciergeChat : true;
  }
}

function sanitize(dto: HostSettingsDto): HostSettingsDto {
  const out: HostSettingsDto = {};
  for (const k of [
    'instantBook',
    'allowGuestMessages',
    'allowConciergeChat',
    'emailOnNewBooking',
    'smsOnNewBooking',
  ] as const) {
    if (typeof dto[k] === 'boolean') out[k] = dto[k];
  }
  return out;
}
