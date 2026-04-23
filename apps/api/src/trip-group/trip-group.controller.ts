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
import { TripGroupService } from './trip-group.service';
import { CreateTripGroupDto } from './dto/create-trip-group.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';

@UseGuards(JwtAuthGuard)
@Controller('trip-groups')
export class TripGroupController {
  constructor(private readonly service: TripGroupService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.service.listForUser(user.sub);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateTripGroupDto) {
    return this.service.create(user.sub, dto);
  }

  @Get(':id')
  detail(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.getDetail(user.sub, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.delete(user.sub, id);
  }

  @Post(':id/members')
  invite(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.service.inviteMember(user.sub, id, dto);
  }

  @Post(':id/accept')
  accept(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.acceptInvite(user.sub, id);
  }

  @Delete(':id/members/:memberId')
  removeMember(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.service.removeMember(user.sub, id, memberId);
  }

  @Post(':id/expenses')
  createExpense(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.service.createExpense(user.sub, id, dto);
  }

  @Delete(':id/expenses/:expenseId')
  deleteExpense(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('expenseId') expenseId: string,
  ) {
    return this.service.deleteExpense(user.sub, id, expenseId);
  }

  @Patch(':id/expenses/:expenseId/shares/:shareId')
  markSettled(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('expenseId') expenseId: string,
    @Param('shareId') shareId: string,
    @Body('settled') settled: boolean,
  ) {
    return this.service.markShareSettled(user.sub, id, expenseId, shareId, !!settled);
  }

  @Get(':id/balances')
  balances(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.getBalances(user.sub, id);
  }
}
