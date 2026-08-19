import { Module } from '@nestjs/common';
import { AdvertisementController } from './advertisement.controller';
import { AdvertisementAdminController } from './advertisement-admin.controller';
import { AdvertisementService } from './advertisement.service';

/**
 * Advertisement Centre: admin-authored Explore-page popups. Public feed +
 * impression/click tracking (`/advertisements`, gated by the `advertisements`
 * flag) and admin CRUD (`/admin/advertisements`, L2+). PrismaService comes
 * from the global PrismaModule.
 */
@Module({
  controllers: [AdvertisementController, AdvertisementAdminController],
  providers: [AdvertisementService],
  exports: [AdvertisementService],
})
export class AdvertisementModule {}
