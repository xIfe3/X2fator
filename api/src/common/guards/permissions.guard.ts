import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { UserPermissionsService } from '../services/user-permissions.service';

import { REQUIRED_PERMISSION_KEY } from '../decorators/required-permission.decorator';

import type { AuthenticatedUser } from '../types/authenticated-request';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userPermissionsService: UserPermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      REQUIRED_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Endpoint does not require a permission.
    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const permissionNames = await this.userPermissionsService.getPermissionNames(
      user.id,
    );

    if (!permissionNames.includes(requiredPermission)) {
      throw new ForbiddenException(
        `Missing required permission: ${requiredPermission}`,
      );
    }

    return true;
  }
}
