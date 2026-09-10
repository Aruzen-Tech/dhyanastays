import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const AUTOMATION_TRIGGERS = ['STAGE_CHANGED', 'TAG_ADDED'] as const;
export const AUTOMATION_ACTIONS = [
  'CREATE_TASK',
  'SEND_OUTREACH',
  'ADD_TAG',
  'ASSIGN_OWNER',
] as const;

/**
 * Action parameters. Only the fields relevant to the chosen action are read;
 * the service validates that the required ones are present per action.
 */
export class AutomationConfigDto {
  // CREATE_TASK
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsIn(['LOW', 'MEDIUM', 'HIGH']) priority?: string;
  @IsOptional() @IsInt() @Min(0) dueInDays?: number;
  @IsOptional() @IsString() assigneeId?: string;

  // SEND_OUTREACH
  @IsOptional() @IsString({ each: true }) @IsIn(['EMAIL', 'SMS'], { each: true })
  channels?: string[];
  @IsOptional() @IsString() @MaxLength(200) subject?: string;
  @IsOptional() @IsString() @MaxLength(5000) body?: string;

  // ADD_TAG
  @IsOptional() @IsString() tagId?: string;

  // ASSIGN_OWNER
  @IsOptional() @IsString() ownerId?: string;
}

export class CreateAutomationRuleDto {
  @IsString() @MinLength(1) @MaxLength(80) name!: string;

  @IsOptional() @IsBoolean() enabled?: boolean;

  @IsIn(AUTOMATION_TRIGGERS) trigger!: string;

  /** STAGE_CHANGED filter — only fire when moved into this stage (optional). */
  @IsOptional() @IsString() stageId?: string;

  /** TAG_ADDED filter — only fire when this tag is added (optional). */
  @IsOptional() @IsString() tagId?: string;

  @IsIn(AUTOMATION_ACTIONS) action!: string;

  @IsObject() @ValidateNested() @Type(() => AutomationConfigDto)
  config!: AutomationConfigDto;
}

export class UpdateAutomationRuleDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) name?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsIn(AUTOMATION_TRIGGERS) trigger?: string;
  @IsOptional() @IsString() stageId?: string;
  @IsOptional() @IsString() tagId?: string;
  @IsOptional() @IsIn(AUTOMATION_ACTIONS) action?: string;
  @IsOptional() @IsObject() @ValidateNested() @Type(() => AutomationConfigDto)
  config?: AutomationConfigDto;
}
