import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import {
  FEATURE_REGISTRY,
  FeatureDefinition,
  getFeatureDefinition,
} from './feature-flags.registry';

export interface ResolvedFeature extends FeatureDefinition {
  /** Effective state = override ?? defaultEnabled. */
  enabled: boolean;
  /** True when an admin override row exists (i.e. differs from code default if changed). */
  overridden: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

/**
 * Resolves the canonical feature registry against admin overrides in the DB.
 * In-memory cache (short TTL) keeps the per-request `isEnabled` check cheap on
 * the hot path (the FeatureGuard runs on gated endpoints). Cache is busted on
 * any toggle so changes take effect immediately for the toggling instance;
 * other instances pick it up within CACHE_TTL_MS.
 */
@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);
  private cache: Map<string, boolean> | null = null;
  private cacheLoadedAt = 0;
  private static readonly CACHE_TTL_MS = 15_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /** Fast path used by the guard. Returns the effective enabled state. */
  async isEnabled(key: string): Promise<boolean> {
    const def = getFeatureDefinition(key);
    if (!def) {
      // Unknown key = not gated. Fail open so a typo doesn't 503 everything.
      this.logger.warn(`isEnabled called for unknown feature key "${key}"`);
      return true;
    }
    const overrides = await this.loadOverrides();
    return overrides.has(key) ? overrides.get(key)! : def.defaultEnabled;
  }

  /** Full resolved list for the admin control panel. */
  async listResolved(): Promise<ResolvedFeature[]> {
    const rows = await this.prisma.featureFlag.findMany();
    const byKey = new Map(rows.map((r) => [r.key, r]));
    return FEATURE_REGISTRY.map((def) => {
      const row = byKey.get(def.key);
      return {
        ...def,
        enabled: row ? row.enabled : def.defaultEnabled,
        overridden: !!row,
        updatedAt: row ? row.updatedAt.toISOString() : null,
        updatedBy: row?.updatedBy ?? null,
      };
    });
  }

  /** Map of key → enabled, for the public UI-gating endpoint. */
  async enabledMap(): Promise<Record<string, boolean>> {
    const overrides = await this.loadOverrides();
    const out: Record<string, boolean> = {};
    for (const def of FEATURE_REGISTRY) {
      out[def.key] = overrides.has(def.key)
        ? overrides.get(def.key)!
        : def.defaultEnabled;
    }
    return out;
  }

  /** Admin toggle. Upserts the override row, audits, busts the cache. */
  async setEnabled(
    actorId: string,
    key: string,
    enabled: boolean,
  ): Promise<ResolvedFeature> {
    const def = getFeatureDefinition(key);
    if (!def) throw new NotFoundException(`Unknown feature "${key}"`);

    await this.prisma.featureFlag.upsert({
      where: { key },
      create: { key, enabled, updatedBy: actorId },
      update: { enabled, updatedBy: actorId },
    });
    await this.auditService.log(actorId, 'FEATURE_FLAG_TOGGLED', 'feature', key, {
      enabled,
      label: def.label,
    });
    this.bustCache();

    const row = await this.prisma.featureFlag.findUnique({ where: { key } });
    return {
      ...def,
      enabled: row!.enabled,
      overridden: true,
      updatedAt: row!.updatedAt.toISOString(),
      updatedBy: row!.updatedBy,
    };
  }

  /** Bulk toggle — returns the resolved list. */
  async setMany(
    actorId: string,
    updates: Array<{ key: string; enabled: boolean }>,
  ): Promise<ResolvedFeature[]> {
    for (const u of updates) {
      const def = getFeatureDefinition(u.key);
      if (!def) continue; // skip unknown keys silently in bulk
      await this.prisma.featureFlag.upsert({
        where: { key: u.key },
        create: { key: u.key, enabled: u.enabled, updatedBy: actorId },
        update: { enabled: u.enabled, updatedBy: actorId },
      });
    }
    await this.auditService.log(actorId, 'FEATURE_FLAGS_BULK_TOGGLED', 'feature', 'bulk', {
      count: updates.length,
    });
    this.bustCache();
    return this.listResolved();
  }

  // ── cache ────────────────────────────────────────────────────────────────

  private async loadOverrides(): Promise<Map<string, boolean>> {
    const now = Date.now();
    if (this.cache && now - this.cacheLoadedAt < FeatureFlagService.CACHE_TTL_MS) {
      return this.cache;
    }
    const rows = await this.prisma.featureFlag.findMany();
    this.cache = new Map(rows.map((r) => [r.key, r.enabled]));
    this.cacheLoadedAt = now;
    return this.cache;
  }

  private bustCache(): void {
    this.cache = null;
    this.cacheLoadedAt = 0;
  }
}
