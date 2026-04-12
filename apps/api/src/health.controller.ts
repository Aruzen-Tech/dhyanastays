import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from './prisma/prisma.service';
import { Public } from './common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Basic liveness — process is running, no dependency checks. */
  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  /** Liveness probe — same as check, minimal overhead. */
  @Public()
  @Get('live')
  @HttpCode(HttpStatus.OK)
  live() {
    return { status: 'ok' };
  }

  /** Readiness probe — verifies database connectivity. */
  @Public()
  @Get('ready')
  async ready(@Res() res: Response) {
    const checks: Record<string, string> = {};
    let healthy = true;

    // Postgres check
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      checks.postgres = 'ok';
    } catch {
      checks.postgres = 'down';
      healthy = false;
    }

    const status = healthy ? 'ok' : 'degraded';
    res.status(healthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json({
      status,
      checks,
      timestamp: new Date().toISOString(),
    });
  }
}
