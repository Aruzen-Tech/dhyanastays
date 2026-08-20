import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { FeatureGate } from '../common/decorators/feature-gate.decorator';
import { AssistantService } from './assistant.service';
import { AskDto } from './dto/ask.dto';

/**
 * In-app assistant. Any authenticated user (the global auth guard applies —
 * no @Public). Guide-and-navigate only: the single endpoint returns an answer
 * plus validated deep-link suggestions; there is no mutation route.
 */
@FeatureGate('in_app_assistant')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly service: AssistantService) {}

  @Post('ask')
  ask(@CurrentUser() user: RequestUser, @Body() dto: AskDto) {
    return this.service.ask(user.role, dto);
  }
}
