import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminLevel, CapitalCallStatus } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminLevelGuard } from '../common/decorators/admin-level.decorator';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { InvestorService } from './investor.service';
import { UpsertInvestmentDto } from './dto/upsert-investment.dto';
import {
  CreateCapitalCallDto,
  UpdateCapitalCallDto,
} from './dto/upsert-capital-call.dto';
import { UploadInvestorDocumentDto } from './dto/upload-investor-document.dto';
import {
  RecomputeDistributionDto,
  UpdateDistributionDto,
} from './dto/recompute-distribution.dto';

@Controller('admin/investor')
@UseGuards(JwtAuthGuard, RolesGuard)
@AdminLevelGuard(AdminLevel.L1, AdminLevel.L2)
export class AdminInvestorController {
  constructor(private readonly service: InvestorService) {}

  // ── Investments ─────────────────────────────────────────────────────────

  @Get('investments')
  listInvestments(
    @Query('investorUserId') investorUserId?: string,
    @Query('listingId') listingId?: string,
  ) {
    return this.service.listInvestmentsAdmin({ investorUserId, listingId });
  }

  @Post('investments')
  createInvestment(
    @Body() dto: UpsertInvestmentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.createInvestment(dto, user.sub);
  }

  @Patch('investments/:id')
  updateInvestment(
    @Param('id') id: string,
    @Body() dto: Partial<UpsertInvestmentDto>,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.updateInvestment(id, dto, user.sub);
  }

  @Delete('investments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeInvestment(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.service.removeInvestment(id, user.sub);
  }

  // ── Capital calls ───────────────────────────────────────────────────────

  @Get('capital-calls')
  listCapitalCalls(
    @Query('listingId') listingId?: string,
    @Query('status') status?: CapitalCallStatus,
  ) {
    return this.service.listCapitalCallsAdmin({ listingId, status });
  }

  @Post('capital-calls')
  createCapitalCall(
    @Body() dto: CreateCapitalCallDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.createCapitalCall(dto, user.sub);
  }

  @Patch('capital-calls/:id')
  updateCapitalCall(
    @Param('id') id: string,
    @Body() dto: UpdateCapitalCallDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.updateCapitalCall(id, dto, user.sub);
  }

  // ── Documents ───────────────────────────────────────────────────────────

  @Get('documents')
  listDocuments(@Query('investorUserId') investorUserId?: string) {
    return this.service.listDocumentsAdmin(investorUserId);
  }

  @Post('documents')
  uploadDocument(
    @Body() dto: UploadInvestorDocumentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.uploadDocument(dto, user.sub);
  }

  @Delete('documents/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeDocument(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.service.removeDocument(id, user.sub);
  }

  // ── Distributions ───────────────────────────────────────────────────────

  @Get('distributions')
  listDistributions(@Query('period') period?: string) {
    return this.service.listDistributionsAdmin({ period });
  }

  @Post('distributions/recompute')
  recomputeDistributions(
    @Body() dto: RecomputeDistributionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.recomputeDistributions(dto, user.sub);
  }

  @Patch('distributions/:id')
  updateDistribution(
    @Param('id') id: string,
    @Body() dto: UpdateDistributionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.updateDistribution(id, dto, user.sub);
  }
}
