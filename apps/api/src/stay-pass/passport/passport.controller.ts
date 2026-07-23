import { Controller, Get } from '@nestjs/common';
import {
  CurrentUser,
  RequestUser,
} from '../../common/decorators/current-user.decorator';
import { FeatureGate } from '../../common/decorators/feature-gate.decorator';
import { PassportService } from './passport.service';

/**
 * The guest's Stay Passport — their profile's collectible page.
 * GET /me/passport → stamps, collection-set progress, and stay stats.
 */
@FeatureGate('stay_pass')
@Controller('me/passport')
export class PassportController {
  constructor(private readonly passport: PassportService) {}

  @Get()
  get(@CurrentUser() user: RequestUser) {
    return this.passport.getPassport(user.sub);
  }
}
