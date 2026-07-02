import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { AdminLevel, UserRole } from '@prisma/client';
import { IsArray, IsBoolean, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminLevelGuard } from '../common/decorators/admin-level.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { FeatureFlagService } from './feature-flag.service';

class ToggleFeatureDto {
  @IsBoolean()
  enabled!: boolean;
}

class BulkToggleItem {
  @IsString()
  key!: string;

  @IsBoolean()
  enabled!: boolean;
}

class BulkToggleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkToggleItem)
  updates!: BulkToggleItem[];
}

/**
 * Admin control-panel API for platform feature flags. L1+ only — this is the
 * platform kill-switch surface. NOT gated by @FeatureGate (it's how features
 * get turned back on).
 */
@AdminLevelGuard(AdminLevel.L1)
@Controller('admin/features')
export class AdminFeatureFlagController {
  constructor(private readonly featureFlags: FeatureFlagService) {}

  @Get()
  list() {
    return this.featureFlags.listResolved();
  }

  @Patch('bulk')
  bulk(@CurrentUser() user: RequestUser, @Body() dto: BulkToggleDto) {
    return this.featureFlags.setMany(user.sub, dto.updates);
  }

  @Patch(':key')
  toggle(
    @CurrentUser() user: RequestUser,
    @Param('key') key: string,
    @Body() dto: ToggleFeatureDto,
  ) {
    return this.featureFlags.setEnabled(user.sub, key, dto.enabled);
  }
}

/**
 * Public feature-availability map for UI gating. Any authenticated user can
 * read which features are on so the frontend can hide disabled surfaces.
 * (Public decorator skips role checks; still behind JWT in practice via the
 * frontend, but safe to expose — it's just on/off booleans, no secrets.)
 */
@Controller('platform/features')
export class PublicFeatureFlagController {
  constructor(private readonly featureFlags: FeatureFlagService) {}

  @Public()
  @Get()
  enabledMap() {
    return this.featureFlags.enabledMap();
  }
}
