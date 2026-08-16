import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

/**
 * One navigable feature the caller can access. Sent by the client (derived
 * from `buildNavItems` + local hints) so the assistant is grounded in exactly
 * what this user can reach — always in sync, no server-side role catalog to
 * drift. Suggestions are validated against these hrefs, and navigation itself
 * stays auth-gated per page, so trusting the client list is safe for a
 * guide-only assistant.
 */
export class AssistantCatalogItemDto {
  @IsString()
  @MaxLength(120)
  label!: string;

  @IsString()
  @MaxLength(300)
  href!: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;
}

export class AskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message!: string;

  /** Current route, for light context. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  path?: string;

  @IsArray()
  @ArrayMaxSize(150)
  @ValidateNested({ each: true })
  @Type(() => AssistantCatalogItemDto)
  items!: AssistantCatalogItemDto[];
}
