import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { BookingStateMachine } from '../booking/state-machine';
import { StayPassService } from './stay-pass.service';
import { ThemeService } from './theme/theme.service';
import { QrTokenSignerService } from './qr/qr-token.signer';
import { CheckinService } from './qr/checkin.service';
import { TicketController } from './ticket/ticket.controller';
import { CheckinController } from './qr/checkin.controller';

/**
 * Stay Pass module — themed tickets, signed-QR check-in (Phases A+B).
 *
 * BookingStateMachine is stateless (no constructor deps), so this module
 * provides its own instance rather than importing BookingModule — the check-in
 * transition still goes through the same guarded transition table, and avoids
 * a booking↔stay-pass module cycle.
 *
 * Rendering runs via the `ticket-render` sweep in JobsModule (Redis-gated);
 * the HTTP surface here works regardless.
 */
@Module({
  imports: [StorageModule],
  providers: [
    StayPassService,
    ThemeService,
    QrTokenSignerService,
    CheckinService,
    BookingStateMachine,
  ],
  controllers: [TicketController, CheckinController],
  exports: [StayPassService, ThemeService],
})
export class StayPassModule {}
