import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

class BulkBaseDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  userIds!: string[];
}

export class BulkTagDto extends BulkBaseDto {
  @IsString()
  tagId!: string;
}

export class BulkOwnerDto extends BulkBaseDto {
  /** Empty / omitted clears the owner. */
  @IsOptional()
  @IsString()
  ownerId?: string;
}

export class BulkStageDto extends BulkBaseDto {
  /** Empty / omitted moves contacts to the backlog (no stage). */
  @IsOptional()
  @IsString()
  stageId?: string;
}
