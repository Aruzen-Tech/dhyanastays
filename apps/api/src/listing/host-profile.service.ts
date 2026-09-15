import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { PayoutCryptoService } from '../common/services/payout-crypto.service';
import { SubmitHostProfileDto } from './dto/host-profile.dto';

/** Never carries ciphertext or a full identifier off the server. */
export interface MaskedHostProfile {
  legalName: string;
  businessName: string | null;
  about: string | null;
  website: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  panLast4: string | null;
  gstin: string | null;
  idType: string | null;
  idLast4: string | null;
  idDocumentUrl: string | null;
  submittedAt: Date | null;
  updatedAt: Date;
}

/**
 * The host application.
 *
 * Registering as a host creates an empty `Host` row, so without this staff were
 * approving an account with nothing but a name and an email attached. A complete
 * profile is now required before a listing can be submitted, which guarantees
 * the reviewer always has something to review.
 *
 * PAN and the photo-ID number reuse {@link PayoutCryptoService} rather than a
 * second crypto path: AES-256-GCM at rest, `*Last4` on the way out.
 */
@Injectable()
export class HostProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly crypto: PayoutCryptoService,
  ) {}

  /** The host's own application plus why they can or can't list yet. */
  async getMine(userId: string) {
    const host = await this.requireHost(userId);
    return {
      verificationStatus: host.verificationStatus,
      rejectionReason: host.rejectionReason,
      profile: host.profile ? this.mask(host.profile) : null,
      complete: this.isComplete(host.profile),
    };
  }

  /**
   * Submit or update the application. Any submission returns the host to
   * PENDING: a changed legal identity or address must be re-checked before the
   * account is treated as verified again.
   */
  async submit(userId: string, dto: SubmitHostProfileDto) {
    const host = await this.requireHost(userId);

    const data = {
      legalName: dto.legalName,
      businessName: dto.businessName || null,
      about: dto.about || null,
      website: dto.website || null,
      addressLine1: dto.addressLine1,
      addressLine2: dto.addressLine2 || null,
      city: dto.city,
      state: dto.state,
      postalCode: dto.postalCode,
      country: dto.country || 'India',
      panLast4: this.crypto.last4(dto.pan),
      panEnc: this.crypto.encrypt(dto.pan),
      gstin: dto.gstin || null,
      idType: dto.idType as never,
      idLast4: this.crypto.last4(dto.idNumber),
      idEnc: this.crypto.encrypt(dto.idNumber),
      idDocumentUrl: dto.idDocumentUrl || null,
      submittedAt: new Date(),
    };

    const profile = await this.prisma.hostProfile.upsert({
      where: { hostId: host.id },
      create: { hostId: host.id, ...data },
      update: data,
    });

    // Re-submitting re-opens review; clear any stale rejection reason.
    await this.prisma.host.update({
      where: { id: host.id },
      data: { verificationStatus: 'PENDING', rejectionReason: null },
    });

    await this.audit.log(userId, 'HOST_PROFILE_SUBMITTED', 'host', host.id, {
      panLast4: profile.panLast4,
      idType: profile.idType,
      hasDocument: !!profile.idDocumentUrl,
    });

    return { profile: this.mask(profile), complete: this.isComplete(profile) };
  }

  /**
   * Gate used by listing submission. Returns the missing pieces rather than a
   * bare boolean so the host is told exactly what to finish.
   */
  async assertCompleteForListing(hostId: string): Promise<void> {
    const profile = await this.prisma.hostProfile.findUnique({ where: { hostId } });
    const missing = this.missingFields(profile);
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Complete your host profile before submitting a listing — still needed: ${missing.join(', ')}.`,
      );
    }
  }

  private missingFields(profile: { [k: string]: unknown } | null): string[] {
    if (!profile) return ['host profile'];
    const required: Array<[string, string]> = [
      ['legalName', 'legal name'],
      ['addressLine1', 'address'],
      ['city', 'city'],
      ['state', 'state'],
      ['postalCode', 'PIN code'],
      ['panEnc', 'PAN'],
      ['idEnc', 'photo ID'],
    ];
    return required.filter(([key]) => !profile[key]).map(([, label]) => label);
  }

  private isComplete(profile: { [k: string]: unknown } | null): boolean {
    return this.missingFields(profile).length === 0;
  }

  private async requireHost(userId: string) {
    const host = await this.prisma.host.findUnique({
      where: { userId },
      select: {
        id: true,
        verificationStatus: true,
        rejectionReason: true,
        profile: true,
      },
    });
    if (!host) throw new NotFoundException('Host profile not found');
    return host;
  }

  private mask(p: Record<string, unknown>): MaskedHostProfile {
    return {
      legalName: p.legalName as string,
      businessName: (p.businessName as string) ?? null,
      about: (p.about as string) ?? null,
      website: (p.website as string) ?? null,
      addressLine1: p.addressLine1 as string,
      addressLine2: (p.addressLine2 as string) ?? null,
      city: p.city as string,
      state: p.state as string,
      postalCode: p.postalCode as string,
      country: p.country as string,
      panLast4: (p.panLast4 as string) ?? null,
      gstin: (p.gstin as string) ?? null,
      idType: (p.idType as string) ?? null,
      idLast4: (p.idLast4 as string) ?? null,
      idDocumentUrl: (p.idDocumentUrl as string) ?? null,
      submittedAt: (p.submittedAt as Date) ?? null,
      updatedAt: p.updatedAt as Date,
    };
  }
}
