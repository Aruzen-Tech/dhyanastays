import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { RateLimitService } from '../../admin/rate-limit.service';
export declare class ThrottleTrackerInterceptor implements NestInterceptor {
    private readonly rateLimitService;
    constructor(rateLimitService: RateLimitService);
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>;
}
