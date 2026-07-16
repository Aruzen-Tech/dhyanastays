import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AdminLevel, UserKind } from '@prisma/client';

export type RequestUser = {
  sub: string;
  role: string;
  email: string;
  kind?: UserKind;
  adminLevel?: AdminLevel;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as RequestUser;
  },
);
