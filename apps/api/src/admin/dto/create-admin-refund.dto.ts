import { IsString, IsInt, Min } from 'class-validator';

export class CreateAdminRefundDto {
  @IsString()
  bookingId!: string;

  @IsInt()
  @Min(1)
  amount!: number;

  @IsString()
  reason!: string;
}
