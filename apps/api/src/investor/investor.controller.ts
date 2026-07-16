import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserKind } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Kinds } from '../common/decorators/kinds.decorator';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { InvestorService } from './investor.service';
import { FeatureGate } from '../common/decorators/feature-gate.decorator';

@FeatureGate('investor_dashboard')
@Controller('investor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Kinds(UserKind.INVESTOR)
export class InvestorController {
  constructor(private readonly service: InvestorService) {}

  @Get('portfolio')
  portfolio(@CurrentUser() user: RequestUser) {
    return this.service.getPortfolio(user.sub);
  }

  @Get('distributions')
  distributions(
    @CurrentUser() user: RequestUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.listDistributions(user.sub, { from, to });
  }

  @Get('capital-calls')
  capitalCalls(@CurrentUser() user: RequestUser) {
    return this.service.listCapitalCallsForInvestor(user.sub);
  }

  @Get('documents')
  documents(@CurrentUser() user: RequestUser) {
    return this.service.listDocuments(user.sub);
  }
}
