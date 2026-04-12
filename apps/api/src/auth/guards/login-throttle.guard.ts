import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { LoginRateLimiterService } from '../services/login-rate-limiter.service';

@Injectable()
export class LoginThrottleGuard implements CanActivate {
  constructor(private readonly rateLimiter: LoginRateLimiterService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const email = req.body?.email;
    if (typeof email !== 'string') return true; // let validation pipe handle it

    const result = await this.rateLimiter.check(email);

    if (result.blocked) {
      res.setHeader('Retry-After', String(result.retryAfter));
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many login attempts. Please try again later.',
          retryAfter: result.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
