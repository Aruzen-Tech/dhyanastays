import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { AccountService } from './account.service';
import { UpdateAccountProfileDto } from './dto/update-account-profile.dto';

/**
 * The signed-in user's own personal information — any role.
 *
 * Intentionally not role-gated: the pre-existing `/guest/profile` routes are
 * `@Roles(GUEST)`, which left hosts and admins unable to view or correct their
 * own details.
 */
@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: RequestUser) {
    return this.accountService.getProfile(user.sub);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateAccountProfileDto,
  ) {
    return this.accountService.updateProfile(user.sub, dto);
  }
}
