import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { RateLimitService } from '../../admin/rate-limit.service';

@Injectable()
export class ThrottleTrackerInterceptor implements NestInterceptor {
  constructor(private readonly rateLimitService: RateLimitService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((err) => {
        if (err instanceof HttpException && err.getStatus() === 429) {
          const req = context.switchToHttp().getRequest();
          const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
          this.rateLimitService.recordBlocked(ip, req.url);
        }
        return throwError(() => err);
      }),
    );
  }
}
