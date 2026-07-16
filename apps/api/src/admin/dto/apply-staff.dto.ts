import { AdminLevel, ServiceType } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyStaffDto {
  @ApiProperty({ example: 'applicant@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Jane Smith' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @ApiProperty({ enum: AdminLevel, description: 'L1=Super Admin, L2=Ops, L3=Cluster, L4=Property, L5=Service' })
  @IsEnum(AdminLevel)
  requestedLevel!: AdminLevel;

  @ApiPropertyOptional({ enum: ServiceType, description: 'Required when requestedLevel is L5' })
  @IsOptional()
  @IsEnum(ServiceType)
  requestedService?: ServiceType;

  @ApiPropertyOptional({ description: 'Cluster / region reference (L3 context)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  clusterId?: string;

  @ApiPropertyOptional({ description: 'Property reference (L4 context)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  propertyId?: string;

  @ApiProperty({ description: 'Why you are applying for this role', minLength: 20, maxLength: 2000 })
  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  justification!: string;
}
