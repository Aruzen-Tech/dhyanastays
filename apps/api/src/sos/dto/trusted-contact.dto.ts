import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';

/**
 * Class-validator decorator enforcing "at least one of phone, email" on the DTO.
 * Applied to a sentinel field that's never actually read.
 */
function AtLeastOneContactChannel(
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'atLeastOneContactChannel',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(_value, args) {
          if (!args) return false;
          const obj = args.object as { phone?: string | null; email?: string | null };
          return Boolean((obj.phone && obj.phone.length > 0) || (obj.email && obj.email.length > 0));
        },
        defaultMessage() {
          return 'At least one of phone or email is required';
        },
      },
    });
  };
}

export class UpsertTrustedContactDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  /**
   * Strict E.164: starts with `+`, followed by a country code (1–9) and 6–14 digits.
   * No spaces, no dashes — SOS SMS dispatch requires this format to hit the
   * Twilio/MSG91 API without normalization headaches mid-incident.
   * Optional, but at least one of phone or email must be present.
   */
  @IsOptional()
  @ValidateIf((o: UpsertTrustedContactDto) => o.phone !== undefined && o.phone !== null && o.phone !== '')
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'phone must be in E.164 format (e.g. +919876543210) — no spaces or dashes',
  })
  phone?: string;

  /**
   * Email address. SOS broadcast will email this contact alongside (or instead of) SMS.
   * Optional, but at least one of phone or email must be present.
   */
  @IsOptional()
  @ValidateIf((o: UpsertTrustedContactDto) => o.email !== undefined && o.email !== null && o.email !== '')
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(200)
  email?: string;

  /** Sentinel: enforces "at least one of phone, email present" cross-field check. */
  @AtLeastOneContactChannel()
  private readonly _contactChannelCheck?: undefined;

  @IsString()
  @MaxLength(50)
  relation!: string;

  @IsOptional()
  @IsBoolean()
  primary?: boolean;
}
