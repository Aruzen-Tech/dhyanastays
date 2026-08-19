import { CrmStageKind } from '@prisma/client';
import { IsEnum, IsHexColor, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateStageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  @IsEnum(CrmStageKind)
  kind!: CrmStageKind;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class UpdateStageDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class MoveStageDto {
  /** Target stage id; empty/omitted removes the contact from the pipeline. */
  @IsOptional()
  @IsString()
  stageId?: string;
}
