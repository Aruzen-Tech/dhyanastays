import { IsString, Length } from 'class-validator';

export class MfaChallengeDto {
  @IsString()
  mfaToken!: string;

  @IsString()
  @Length(6, 8)
  code!: string;
}
