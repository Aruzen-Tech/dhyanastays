import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** Query params for the CRM contacts list. */
export class ListContactsDto {
  /** Free-text search over name / email / phone. */
  @IsOptional()
  @IsString()
  q?: string;

  /** Contact type filter. Omitted = guests + hosts. */
  @IsOptional()
  @IsIn(['guest', 'host', 'all'])
  type?: 'guest' | 'host' | 'all';

  @IsOptional()
  @IsString()
  tagId?: string;

  /** Assigned account owner (staff user id). */
  @IsOptional()
  @IsString()
  ownerId?: string;

  /** DB-sortable fields only (keeps pagination correct). */
  @IsOptional()
  @IsIn(['recent', 'name'])
  sort?: 'recent' | 'name';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
