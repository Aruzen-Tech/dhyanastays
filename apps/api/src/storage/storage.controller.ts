import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { StorageService } from './storage.service';

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
   * GET /api/storage/stub/*
   * Stub endpoint — returns a placeholder SVG for local dev.
   * Only active when STORAGE_PROVIDER=stub.
   *
   * Note: NestJS/Express stores unnamed wildcard matches as param '0'.
   * Named wildcards (*key) are not supported — use @Param('0') instead.
   */
  @Public()
  @Get('stub/*')
  stubGet(@Param('0') key: string) {
    const filename = (key ?? '').split('/').pop() ?? 'image';
    // Return a minimal SVG as placeholder
    const svg = `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="300" fill="#1a5c4a"/>
      <text x="200" y="160" text-anchor="middle" fill="white" font-size="14" font-family="sans-serif">
        ${filename}
      </text>
    </svg>`;
    return svg;
  }
}
