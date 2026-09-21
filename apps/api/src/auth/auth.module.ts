import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MfaService } from './services/mfa.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { FeatureGuard } from '../common/guards/feature.guard';
import { LoginRateLimiterService } from './services/login-rate-limiter.service';
import { PasswordResetService } from './services/password-reset.service';
import { NotificationModule } from '../notification/notification.module';
import { ReferralModule } from '../referral/referral.module';

@Module({
  imports: [JwtModule.register({}), ReferralModule, NotificationModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    MfaService,
    JwtStrategy,
    LoginRateLimiterService,
    PasswordResetService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      // Runs after auth/roles — enforces @FeatureGate (503 when a feature
      // is toggled off in the admin control panel).
      provide: APP_GUARD,
      useClass: FeatureGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
