import { InfluencerVerificationStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewVerificationDto {
  @IsEnum(InfluencerVerificationStatus)
  status!: InfluencerVerificationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminComments?: string;
}
