import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { ExperienceService } from './experience.service';
import { EXPERIENCE_CATEGORIES } from './dto/create-experience.dto';

@Controller('experiences')
export class PublicExperienceController {
  constructor(private readonly service: ExperienceService) {}

  @Public()
  @Get()
  list(
    @Query('city') city?: string,
    @Query('category') category?: string,
  ) {
    return this.service.listPublicExperiences({ city, category, upcoming: true });
  }

  @Public()
  @Get('meta/categories')
  categories() {
    return { categories: EXPERIENCE_CATEGORIES };
  }

  @Public()
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getPublicExperience(id);
  }
}
