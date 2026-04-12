import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

let app: INestApplication;
let prisma: PrismaService;

/**
 * Bootstrap a real NestJS test app with full module graph.
 * Requires a running PostgreSQL instance (use Docker or CI service).
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [await AppModule.forRoot()],
  }).compile();

  app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();
  prisma = app.get(PrismaService);

  return app;
}

export function getApp() {
  return app;
}

export function getPrisma() {
  return prisma;
}

/**
 * Register a user and return an auth token.
 */
export async function getAuthToken(
  role: 'GUEST' | 'HOST' | 'ADMIN',
  emailPrefix = role.toLowerCase(),
): Promise<{ token: string; userId: string }> {
  const email = `${emailPrefix}-${Date.now()}@test.local`;

  const registerRes = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({
      email,
      password: 'TestPassword123!',
      fullName: `Test ${role}`,
      role,
    })
    .expect(201);

  return {
    token: registerRes.body.accessToken,
    userId: registerRes.body.user.id,
  };
}

/**
 * Truncate all tables (preserving schema) for test isolation.
 * Order matters due to foreign key constraints.
 */
export async function truncateTables() {
  const tables = [
    'IdempotencyKey',
    'LedgerEvent',
    'AuditLog',
    'AdminNotification',
    'HostNotification',
    'PayoutLine',
    'PayoutBatch',
    'Refund',
    'Payment',
    'Booking',
    'Hold',
    'AvailabilityBlock',
    'SeasonalRate',
    'ListingMedia',
    'ListingTag',
    'Tag',
    'RateRule',
    'Listing',
    'Host',
    'SystemConfig',
    'User',
  ];

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
  }
}

export async function closeTestApp() {
  await app?.close();
}
