import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessControlService } from '../access-control/access-control.service';
export declare class RolesGuard implements CanActivate {
    private readonly reflector;
    private readonly accessControlService;
    constructor(reflector: Reflector, accessControlService: AccessControlService);
    canActivate(context: ExecutionContext): boolean;
}
