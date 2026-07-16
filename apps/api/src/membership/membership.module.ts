import { Module } from '@nestjs/common';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';
import { SipService } from './sip.service';

@Module({
  controllers: [MembershipController],
  providers: [MembershipService, SipService],
  exports: [MembershipService, SipService],
})
export class MembershipModule {}
