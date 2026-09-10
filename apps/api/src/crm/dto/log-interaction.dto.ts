import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

/** Manually record a call / meeting / other touch on a contact. */
export class LogInteractionDto {
  @IsIn(['call', 'meeting', 'email', 'whatsapp', 'other'])
  channel!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  summary!: string;
}
