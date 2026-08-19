import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { Request, Response } from 'express';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { StorageService } from './storage.service';

const STUB_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.ogv': 'video/ogg',
};

@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  /**
   * POST /api/storage/presign
   * Returns a presigned PUT URL for direct browser upload.
   * Allowed for HOST and ADMIN only.
   */
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.HOST, UserRole.ADMIN)
  @Post('presign')
  async getPresignedUrl(
    @CurrentUser() user: RequestUser,
    @Body() body: { filename: string; mimeType: string; folder?: string },
  ) {
    const folder = body.folder ?? `listings/${user.sub}`;
    return this.storage.getPresignedUploadUrl(folder, body.filename, body.mimeType);
  }

  /**
   * DELETE /api/storage/object
   * Delete a stored object by key. HOST can only delete their own objects.
   */
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.HOST, UserRole.ADMIN)
  @Delete('object')
  async deleteObject(
    @CurrentUser() user: RequestUser,
    @Query('key') key: string,
  ) {
    // Basic ownership check: key must start with listings/{userId}/
    if (user.role === UserRole.HOST && !key.startsWith(`listings/${user.sub}/`)) {
      return { success: false, error: 'Forbidden' };
    }
    await this.storage.deleteObject(key);
    return { success: true };
  }

  /**
   * PUT /api/storage/stub-upload/*  — dev-only: receive the raw bytes the
   * stub presigned URL points at and persist them, so browser uploads actually
   * work in local (stub) mode. Reads the raw request stream (the ready-made
   * body parsers skip image/video content-types, so the stream is intact).
   */
  @Public()
  @Put('stub-upload/*')
  async stubUpload(@Req() req: Request, @Res() res: Response) {
    const key = decodeURIComponent(req.path.replace(/^.*\/storage\/stub-upload\//, ''));
    const bytes = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
    await this.storage.writeStubBytes(key, bytes);
    res.status(200).json({ ok: true, key, size: bytes.length });
  }

  /**
   * GET /api/storage/stub/*  — dev-only: serve objects written by the stub
   * provider (e.g. rendered Stay Pass assets) so local dev is fully functional.
   * Returns 404 outside stub mode or for unknown keys.
   */
  @Public()
  @Get('stub/*')
  async serveStub(@Req() req: Request, @Res() res: Response) {
    // Express-4-safe wildcard: derive the key from the path after /storage/stub/.
    const flatKey = decodeURIComponent(
      req.path.replace(/^.*\/storage\/stub\//, ''),
    );
    const bytes = await this.storage.readStubObject(flatKey);
    if (!bytes) throw new NotFoundException('Not found');
    const ext = (flatKey.match(/\.[a-z0-9]+$/i)?.[0] ?? '').toLowerCase();
    res.setHeader('Content-Type', STUB_MIME[ext] ?? 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    // helmet defaults CORP to same-origin, which blocks the web app (a
    // different origin in dev) from embedding these stub assets. Allow it.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(bytes);
  }
}
