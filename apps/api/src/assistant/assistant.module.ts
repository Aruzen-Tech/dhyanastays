import { Module } from '@nestjs/common';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';

/**
 * In-app navigation assistant. ConfigService (global) is injected for the
 * optional ANTHROPIC_API_KEY; with no key the service uses a deterministic
 * keyword fallback. Gated by @FeatureGate('in_app_assistant').
 */
@Module({
  controllers: [AssistantController],
  providers: [AssistantService],
})
export class AssistantModule {}
