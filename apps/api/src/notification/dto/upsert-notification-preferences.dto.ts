import { IsObject, IsOptional, IsString, Matches } from 'class-validator';

export class QuietHoursDto {
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'start must be HH:mm (24h)',
  })
  start!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'end must be HH:mm (24h)',
  })
  end!: string;

  @IsOptional()
  @IsString()
  tz?: string;
}

/**
 * `channels` is a two-level map: { [kind]: { email?, sms?, whatsapp?, push?, in_app? } }.
 * `false` marks an opt-out; missing keys default to allowed. Transactional
 * kinds (booking.confirmed, booking.cancelled, sos.ack) ignore opt-outs.
 */
export class UpsertNotificationPreferencesDto {
  @IsOptional()
  @IsObject()
  channels?: Record<string, Record<string, boolean>>;

  @IsOptional()
  @IsObject()
  quietHours?: QuietHoursDto;
}
