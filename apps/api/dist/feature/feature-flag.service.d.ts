import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { FeatureDefinition } from './feature-flags.registry';
export interface ResolvedFeature extends FeatureDefinition {
    enabled: boolean;
    overridden: boolean;
    updatedAt: string | null;
    updatedBy: string | null;
}
export declare class FeatureFlagService {
    private readonly prisma;
    private readonly auditService;
    private readonly logger;
    private cache;
    private cacheLoadedAt;
    private static readonly CACHE_TTL_MS;
    constructor(prisma: PrismaService, auditService: AuditService);
    isEnabled(key: string): Promise<boolean>;
    listResolved(): Promise<ResolvedFeature[]>;
    enabledMap(): Promise<Record<string, boolean>>;
    setEnabled(actorId: string, key: string, enabled: boolean): Promise<ResolvedFeature>;
    setMany(actorId: string, updates: Array<{
        key: string;
        enabled: boolean;
    }>): Promise<ResolvedFeature[]>;
    private loadOverrides;
    private bustCache;
}
