import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type RequestUser = {
  sub: string;
  role: string;
  email: string;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as RequestUser;
  },
);
