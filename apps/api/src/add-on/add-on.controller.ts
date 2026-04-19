import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AddOnStatus, AdminLevel } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { AdminLevelGuard } from '../common/decorators/admin-level.decorator';
import {
  CurrentUser,
  RequestUser,
} from '../common/decorators/current-user.decorator';
import { AddOnService } from './add-on.service';
import { CreateAddOnDto } from './dto/create-add-on.dto';
import { CreateServiceProviderDto } from './dto/create-service-provider.dto';
import { ReviewAddOnDto } from './dto/review-add-on.dto';

@Controller()
export class AddOnController {
  constructor(private readonly addOnService: AddOnService) {}

  // ── Public: add-ons available for a listing ──────────────────────────────
  @Public()
  @Get('listings/:id/addons')
  listForListing(@Param('id') listingId: string) {
    return this.addOnService.listPublicAddOnsForListing(listingId);
  }

  // ── Admin: service providers ─────────────────────────────────────────────
  @AdminLevelGuard(AdminLevel.L2)
  @Get('admin/service-providers')
  listProviders(@Query('activeOnly') activeOnly?: string) {
    return this.addOnService.listServiceProviders(activeOnly === 'true');
  }

  @AdminLevelGuard(AdminLevel.L2)
  @Post('admin/service-providers')
  createProvider(
    @CurrentUser() actor: RequestUser,
    @Body() dto: CreateServiceProviderDto,
  ) {
    return this.addOnService.createServiceProvider(actor.sub, dto);
  }

  @AdminLevelGuard(AdminLevel.L2)
  @Patch('admin/service-providers/:id/activate')
  activateProvider(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
  ) {
    return this.addOnService.setServiceProviderActive(actor.sub, id, true);
  }

  @AdminLevelGuard(AdminLevel.L2)
  @Patch('admin/service-providers/:id/deactivate')
  deactivateProvider(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
  ) {
    return this.addOnService.setServiceProviderActive(actor.sub, id, false);
  }

  // ── Admin: add-on CRUD & review ──────────────────────────────────────────
  @AdminLevelGuard(AdminLevel.L2)
  @Get('admin/addons')
  listAdmin(
    @Query('status') status?: string,
    @Query('providerId') providerId?: string,
  ) {
    const statusFilter = status
      ? (status.toUpperCase() as AddOnStatus)
      : undefined;
    return this.addOnService.listAddOns({
      status: statusFilter,
      providerId,
    });
  }

  @AdminLevelGuard(AdminLevel.L2)
  @Post('admin/addons')
  create(@CurrentUser() actor: RequestUser, @Body() dto: CreateAddOnDto) {
    return this.addOnService.createAddOn(actor.sub, dto);
  }

  @AdminLevelGuard(AdminLevel.L2)
  @Post('admin/addons/:id/approve')
  approve(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
    @Body() dto: ReviewAddOnDto,
  ) {
    return this.addOnService.approveAddOn(actor.sub, id, dto);
  }

  @AdminLevelGuard(AdminLevel.L2)
  @Post('admin/addons/:id/reject')
  reject(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
    @Body() dto: ReviewAddOnDto,
  ) {
    return this.addOnService.rejectAddOn(actor.sub, id, dto);
  }

  @AdminLevelGuard(AdminLevel.L2)
  @Post('admin/addons/:id/retire')
  retire(@CurrentUser() actor: RequestUser, @Param('id') id: string) {
    return this.addOnService.retireAddOn(actor.sub, id);
  }

  // ── Guest: view add-ons attached to their booking ─────────────────────────
  @Get('bookings/:id/addons')
  listForBooking(@Param('id') bookingId: string) {
    return this.addOnService.getBookingAddOns(bookingId);
  }
}
