import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DEFAULT_THEME,
  LAUNCH_THEMES,
  LAUNCH_THEMES_BY_ID,
  ThemeBundle,
  ThemeTokens,
} from './themes.registry';

/**
 * Theme registry: resolves a listing → its active theme bundle, with the
 * built-in default as the guaranteed fallback (spec §2.4). Also seeds/CRUDs the
 * `StayTheme` table for curator tooling.
 */
@Injectable()
export class ThemeService {
  private readonly logger = new Logger(ThemeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve the theme for a listing. Order: listing.stayThemeId → active DB
   * theme → built-in launch theme of the same id → DEFAULT_THEME. Never throws.
   */
  async resolveForListing(listingId: string): Promise<ThemeBundle> {
    try {
      const listing = await this.prisma.listing.findUnique({
        where: { id: listingId },
        select: { stayThemeId: true },
      });
      const themeId = listing?.stayThemeId;
      if (!themeId) return DEFAULT_THEME;

      const dbTheme = await this.prisma.stayTheme.findUnique({
        where: { id: themeId },
      });
      if (dbTheme && dbTheme.status === 'ACTIVE') {
        return {
          id: dbTheme.id,
          version: dbTheme.version,
          displayName: dbTheme.displayName,
          tokens: dbTheme.tokens as unknown as ThemeTokens,
        };
      }
      // DB row missing/retired → built-in of the same id, else default.
      return LAUNCH_THEMES_BY_ID[themeId] ?? DEFAULT_THEME;
    } catch (err) {
      this.logger.warn(
        `Theme resolve failed for listing ${listingId}, using default: ${err instanceof Error ? err.message : String(err)}`,
      );
      return DEFAULT_THEME;
    }
  }

  /** List active themes (admin/curator). */
  async list() {
    return this.prisma.stayTheme.findMany({ orderBy: { id: 'asc' } });
  }

  /** Upsert the six launch themes into the registry (idempotent). */
  async seedLaunchThemes(): Promise<number> {
    let n = 0;
    for (const t of LAUNCH_THEMES) {
      await this.prisma.stayTheme.upsert({
        where: { id: t.id },
        create: {
          id: t.id,
          version: t.version,
          displayName: t.displayName,
          status: 'ACTIVE',
          tokens: t.tokens as unknown as object,
          assets: {},
        },
        update: {}, // don't clobber curator edits on reseed
      });
      n++;
    }
    return n;
  }

  /** Assign a theme to a listing (called from admin listing approval). */
  async assignToListing(listingId: string, themeId: string | null) {
    return this.prisma.listing.update({
      where: { id: listingId },
      data: { stayThemeId: themeId },
    });
  }
}
