import { Module } from '@nestjs/common';
import { TripGroupController } from './trip-group.controller';
import { TripGroupService } from './trip-group.service';

@Module({
  controllers: [TripGroupController],
  providers: [TripGroupService],
  exports: [TripGroupService],
})
export class TripGroupModule {}
