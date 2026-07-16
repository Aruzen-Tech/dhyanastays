import { IsEnum } from 'class-validator';
import { SipStatus } from '@prisma/client';

export class SipStatusDto {
  @IsEnum(SipStatus)
  status!: SipStatus;
}
