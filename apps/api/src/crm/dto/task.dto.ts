import { CrmTaskPriority, CrmTaskStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /** Contact this task is about (omit for a standalone task). */
  @IsOptional()
  @IsString()
  userId?: string;

  /** Staff member the task is assigned to. */
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsEnum(CrmTaskPriority)
  priority?: CrmTaskPriority;

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /** Empty string clears the assignee. */
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsEnum(CrmTaskPriority)
  priority?: CrmTaskPriority;

  @IsOptional()
  @IsEnum(CrmTaskStatus)
  status?: CrmTaskStatus;

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}
