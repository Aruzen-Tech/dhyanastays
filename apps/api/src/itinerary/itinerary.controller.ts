import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { ItineraryService } from './itinerary.service';
import { GenerateItineraryDto } from './dto/generate-itinerary.dto';
import { SuggestItineraryDto } from './dto/suggest-itinerary.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { FeatureGate } from '../common/decorators/feature-gate.decorator';

const ONE_HOUR_MS = 60 * 60 * 1000;

@UseGuards(JwtAuthGuard)
@FeatureGate('ai_itinerary')
@Controller('itineraries')
export class ItineraryController {
  constructor(private readonly service: ItineraryService) {}

  // ── Listing ──────────────────────────────────────────────────────────────

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.service.listForUser(user.sub);
  }

  /** Per-user usage + monthly cap status for the dashboard. */
  @Get('usage')
  usage(@CurrentUser() user: RequestUser) {
    return this.service.getUsage(user.sub);
  }

  // ── Step 1: suggestions (concept cards) ──────────────────────────────────
  // Cheaper than full generation; 10/hr is plenty for browsing concepts.
  @Throttle({ default: { limit: 10, ttl: ONE_HOUR_MS } })
  @Post('suggestions')
  suggest(
    @CurrentUser() user: RequestUser,
    @Body() dto: SuggestItineraryDto,
  ) {
    return this.service.suggestConcepts(user.sub, dto);
  }

  // ── Step 2: full generation ──────────────────────────────────────────────
  // Expensive; 5/hr per user is a hard ceiling on top of the monthly cost cap.
  @Throttle({ default: { limit: 5, ttl: ONE_HOUR_MS } })
  @Post('generate')
  generate(@CurrentUser() user: RequestUser, @Body() dto: GenerateItineraryDto) {
    return this.service.generate(user.sub, dto);
  }

  // ── Step 3: chat refinement ──────────────────────────────────────────────

  @Get(':id/messages')
  listMessages(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.listMessages(user.sub, id);
  }

  // 30 messages/hr/user — refining a plan rarely needs more than a handful.
  @Throttle({ default: { limit: 30, ttl: ONE_HOUR_MS } })
  @Post(':id/messages')
  sendMessage(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.service.sendMessage(user.sub, id, dto.content);
  }

  // ── Detail / lifecycle ───────────────────────────────────────────────────

  @Get(':id')
  getOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.getById(user.sub, id);
  }

  @Patch(':id/finalize')
  finalize(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.finalize(user.sub, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.delete(user.sub, id);
  }
}
