import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MfaService } from './services/mfa.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { LoginRateLimiterService } from './services/login-rate-limiter.service';
import { ReferralModule } from '../referral/referral.module';

@Module({
  imports: [JwtModule.register({}), ReferralModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    MfaService,
    JwtStrategy,
    LoginRateLimiterService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
