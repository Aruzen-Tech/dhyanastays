import { Module } from '@nestjs/common';
import { AddOnController } from './add-on.controller';
import { AddOnService } from './add-on.service';

@Module({
  controllers: [AddOnController],
  providers: [AddOnService],
  exports: [AddOnService],
})
export class AddOnModule {}
