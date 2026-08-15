import { Module } from '@nestjs/common';
import { InfluencerService } from './influencer.service';
import { InfluencerSelfController } from './influencer-self.controller';
import { AdminInfluencerController } from './admin-influencer.controller';
import { PublicInfluencerController } from './public-influencer.controller';

@Module({
  providers: [InfluencerService],
  controllers: [InfluencerSelfController, AdminInfluencerController, PublicInfluencerController],
  exports: [InfluencerService],
})
export class InfluencerModule {}
