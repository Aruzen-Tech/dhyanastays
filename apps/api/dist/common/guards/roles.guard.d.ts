import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CapabilitiesService } from '../services/capabilities.service';
export declare class RolesGuard implements CanActivate {
    private readonly reflector;
    private readonly capabilities;
    constructor(reflector: Reflector, capabilities: CapabilitiesService);
    canActivate(context: ExecutionContext): boolean;
}
