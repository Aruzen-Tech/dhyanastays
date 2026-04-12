import { IsString, Length } from 'class-validator';

export class ApplyReferralDto {
  @IsString()
  @Length(6, 12)
  referralCode!: string;
}
