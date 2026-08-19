import { Module } from '@nestjs/common';
import { SpotlightController } from './spotlight.controller';
import { SpotlightAdminController } from './spotlight-admin.controller';
import { SpotlightService } from './spotlight.service';

/**
 * Stay Spotlight: admin-curated featured listings for the homepage carousel.
 * Public feed (`GET /spotlight`) plus admin CRUD/reorder (`/admin/spotlight`,
 * L2+). PrismaService is injected from the global PrismaModule.
 */
@Module({
  controllers: [SpotlightController, SpotlightAdminController],
  providers: [SpotlightService],
  exports: [SpotlightService],
})
export class SpotlightModule {}
