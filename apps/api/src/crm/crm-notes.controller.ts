import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { AdminLevel } from '@prisma/client';
import { AdminLevelGuard } from '../common/decorators/admin-level.decorator';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { FeatureGate } from '../common/decorators/feature-gate.decorator';
import { CrmNotesService } from './crm-notes.service';
import { CreateNoteDto, UpdateNoteDto } from './dto/note.dto';

@FeatureGate('crm')
@AdminLevelGuard(AdminLevel.L2)
@Controller('admin/crm')
export class CrmNotesController {
  constructor(private readonly notes: CrmNotesService) {}

  @Get('contacts/:userId/notes')
  list(@Param('userId') userId: string) {
    return this.notes.list(userId);
  }

  @Post('contacts/:userId/notes')
  add(
    @Param('userId') userId: string,
    @Body() dto: CreateNoteDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.notes.add(userId, dto, user.sub);
  }

  @Patch('notes/:id')
  update(@Param('id') id: string, @Body() dto: UpdateNoteDto) {
    return this.notes.update(id, dto);
  }

  @Delete('notes/:id')
  remove(@Param('id') id: string) {
    return this.notes.remove(id);
  }
}
