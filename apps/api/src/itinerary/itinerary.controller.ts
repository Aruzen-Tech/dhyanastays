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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { ItineraryService } from './itinerary.service';
import { GenerateItineraryDto } from './dto/generate-itinerary.dto';

@UseGuards(JwtAuthGuard)
@Controller('itineraries')
export class ItineraryController {
  constructor(private readonly service: ItineraryService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.service.listForUser(user.sub);
  }

  @Post('generate')
  generate(@CurrentUser() user: RequestUser, @Body() dto: GenerateItineraryDto) {
    return this.service.generate(user.sub, dto);
  }

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
