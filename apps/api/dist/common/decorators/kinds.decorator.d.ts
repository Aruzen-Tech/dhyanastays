import { UserKind } from '@prisma/client';
export declare const KINDS_KEY = "kinds";
export declare const Kinds: (...kinds: UserKind[]) => import("@nestjs/common").CustomDecorator<string>;
