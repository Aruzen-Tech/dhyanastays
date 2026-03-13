import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { SyncUserDto } from './dto/sync-user.dto';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── Custom JWT auth ───────────────────────────────────────────────────────

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser() user: RequestUser) {
    return this.authService.logout(user.sub);
  }

  // ─── Auth0 endpoints ───────────────────────────────────────────────────────

  /**
   * POST /auth/sync
   *
   * Called by the frontend immediately after Auth0 login.
   * The JWT guard verifies the Auth0 access token.
   * Creates or updates the user record in our DB.
   *
   * Returns a safe user profile (no passwordHash).
   */
  @UseGuards(JwtAuthGuard)
  @Post('sync')
  syncUser(@CurrentUser() user: RequestUser, @Body() dto: SyncUserDto) {
    return this.authService.syncUser(user, dto);
  }

  /**
   * GET /auth/me
   *
   * Returns the current user's profile from our DB.
   * Works for both custom JWT and Auth0 JWT.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: RequestUser) {
    return this.authService.getMe(user.sub);
  }
}
