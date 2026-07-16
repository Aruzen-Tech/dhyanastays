import { AdminLevel, ServiceType, UserKind } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChangeUserKindDto {
  @ApiProperty({ enum: UserKind })
  @IsEnum(UserKind)
  kind!: UserKind;

  @ApiProperty({ minLength: 3, maxLength: 500, description: 'Reason for role change (audit trail)' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;

  // ── STAFF-only fields (ignored unless kind === STAFF) ─────────────────────
  @ApiPropertyOptional({ enum: AdminLevel })
  @ValidateIf((o) => o.kind === UserKind.STAFF)
  @IsEnum(AdminLevel)
  level?: AdminLevel;

  @ApiPropertyOptional({ enum: ServiceType })
  @IsOptional()
  @IsEnum(ServiceType)
  serviceType?: ServiceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  clusterId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  propertyId?: string;
}
