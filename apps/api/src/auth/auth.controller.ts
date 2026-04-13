import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { MfaService } from './services/mfa.service';
import { Public } from '../common/decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { SyncUserDto } from './dto/sync-user.dto';
import { MfaVerifyDto } from './dto/mfa-verify.dto';
import { MfaChallengeDto } from './dto/mfa-challenge.dto';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { LoginThrottleGuard } from './guards/login-throttle.guard';

function clientInfo(req: Request) {
  return {
    ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? 'unknown',
    userAgent: req.headers['user-agent'] ?? 'unknown',
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mfaService: MfaService,
  ) {}

  // ─── Custom JWT auth ───────────────────────────────────────────────────────

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @UseGuards(LoginThrottleGuard)
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, clientInfo(req));
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.authService.refresh(dto, clientInfo(req));
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser() user: RequestUser) {
    return this.authService.logout(user.sub);
  }

  // ─── Sessions ─────────────────────────────────────────────────────────────

  /** GET /auth/sessions — list all active sessions for the current user */
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  getSessions(@CurrentUser() user: RequestUser) {
    return this.authService.getSessions(user.sub);
  }

  /** DELETE /auth/sessions/:familyId — revoke a single device session */
  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:familyId')
  logoutSession(
    @CurrentUser() user: RequestUser,
    @Param('familyId') familyId: string,
  ) {
    return this.authService.logoutSession(user.sub, familyId);
  }

  // ─── MFA ──────────────────────────────────────────────────────────────────

  /** GET /auth/mfa — return MFA status for current user */
  @UseGuards(JwtAuthGuard)
  @Get('mfa')
  getMfaStatus(@CurrentUser() user: RequestUser) {
    return this.mfaService.getStatus(user.sub);
  }

  /** POST /auth/mfa/setup — start TOTP enrollment, returns secret + otpAuthUrl */
  @UseGuards(JwtAuthGuard)
  @Post('mfa/setup')
  setupMfa(@CurrentUser() user: RequestUser) {
    return this.mfaService.setupTotp(user.sub);
  }

  /** POST /auth/mfa/confirm — confirm TOTP with first code from authenticator app */
  @UseGuards(JwtAuthGuard)
  @Post('mfa/confirm')
  confirmMfa(@CurrentUser() user: RequestUser, @Body() dto: MfaVerifyDto) {
    return this.mfaService.confirmTotp(user.sub, dto.code);
  }

  /** DELETE /auth/mfa — disable TOTP (requires current code to confirm intent) */
  @UseGuards(JwtAuthGuard)
  @Delete('mfa')
  disableMfa(@CurrentUser() user: RequestUser, @Body() dto: MfaVerifyDto) {
    return this.mfaService.disableTotp(user.sub, dto.code);
  }

  /**
   * POST /auth/mfa/challenge
   * Second step of MFA login: exchange mfaToken + TOTP code for full session tokens.
   * This endpoint is @Public() — the mfaToken already proves identity.
   */
  @Public()
  @Post('mfa/challenge')
  mfaChallenge(@Body() dto: MfaChallengeDto, @Req() req: Request) {
    return this.mfaService.challenge(dto.mfaToken, dto.code, clientInfo(req));
  }

  // ─── Auth0 endpoints ───────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('sync')
  syncUser(@CurrentUser() user: RequestUser, @Body() dto: SyncUserDto) {
    return this.authService.syncUser(user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: RequestUser) {
    return this.authService.getMe(user.sub);
  }
}
