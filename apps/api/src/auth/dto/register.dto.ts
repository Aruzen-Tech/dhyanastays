import { UserRole } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  fullName!: string;

  /**
   * Required: bookings, host-guest contact and SOS escalation all assume a
   * reachable number. Accepts 10-digit Indian mobiles or E.164.
   */
  @Matches(/^(\+?[1-9]\d{7,14}|[6-9]\d{9})$/, {
    message: 'phone must be a 10-digit Indian mobile or an E.164 number',
  })
  phone!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsString()
  @Length(6, 12)
  referralCode?: string;
}
