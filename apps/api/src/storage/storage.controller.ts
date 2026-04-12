import {
  Body,
  Controller,
  Delete,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
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

}
