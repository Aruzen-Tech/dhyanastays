import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ContributeSipDto {
  @IsInt()
  @Min(1)
  amountMinor!: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  paymentRef?: string;
}
