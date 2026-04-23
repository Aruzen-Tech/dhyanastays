import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { HostQuickReplyService } from './host-quick-reply.service';
import { UpsertQuickReplyDto } from './dto/quick-reply.dto';

@Controller('host/quick-replies')
@Roles(UserRole.HOST)
export class HostQuickReplyController {
  constructor(private readonly service: HostQuickReplyService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.service.list(user.sub);
  }

  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpsertQuickReplyDto,
  ) {
    return this.service.create(user.sub, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpsertQuickReplyDto,
  ) {
    return this.service.update(user.sub, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.remove(user.sub, id);
  }
}
