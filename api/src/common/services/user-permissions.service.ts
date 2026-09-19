import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { db, permissions, rolePermissions, userRoles } from '../../database';

@Injectable()
export class UserPermissionsService {
  /**
   * Every permission granted to a user, resolved through all of their
   * roles (a user can hold more than one). Deduplicated. This is the
   * single source of truth for "what can this user do" — both
   * PermissionsGuard and GET /auth/me use it, so the API's enforcement
   * and the frontend's UI gating never drift apart.
   */
  async getPermissionNames(userId: string): Promise<string[]> {
    const rows = await db
      .select({ permissionName: permissions.name })
      .from(userRoles)
      .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(userRoles.userId, userId));

    return [...new Set(rows.map((r) => r.permissionName))];
  }
}
