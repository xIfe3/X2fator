import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, inArray, ne } from 'drizzle-orm';

import {
  db,
  permissions,
  roles,
  rolePermissions,
  userRoles,
  users,
} from '../../database';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class AdminRolesService {
  constructor(private readonly auditService: AuditService) {}

  async listPermissions() {
    return db.query.permissions.findMany({ orderBy: [permissions.name] });
  }

  /**
   * Every role, with its permission names and how many staff currently
   * hold it — the staff-management overview.
   */
  async listRoles() {
    const allRoles = await db.query.roles.findMany({ orderBy: [roles.name] });

    const rows = await db
      .select({
        roleId: rolePermissions.roleId,
        permissionName: permissions.name,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId));

    const staffCounts = await db
      .select({ roleId: userRoles.roleId, userId: userRoles.userId })
      .from(userRoles);

    return allRoles.map((role) => ({
      ...role,
      permissions: rows
        .filter((r) => r.roleId === role.id)
        .map((r) => r.permissionName),
      staffCount: staffCounts.filter((s) => s.roleId === role.id).length,
    }));
  }

  async createRole(
    adminId: string,
    params: { name: string; description?: string; permissionNames: string[] },
  ) {
    const existing = await db.query.roles.findFirst({
      where: eq(roles.name, params.name),
    });

    if (existing) {
      throw new BadRequestException('A role with this name already exists');
    }

    const grantedPermissions =
      params.permissionNames.length > 0
        ? await db.query.permissions.findMany({
            where: inArray(permissions.name, params.permissionNames),
          })
        : [];

    const role = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(roles)
        .values({
          name: params.name,
          description: params.description,
          isSystemRole: false,
        })
        .returning();

      if (grantedPermissions.length > 0) {
        await tx.insert(rolePermissions).values(
          grantedPermissions.map((p) => ({
            roleId: created.id,
            permissionId: p.id,
          })),
        );
      }

      return created;
    });

    await this.auditService.log({
      actorId: adminId,
      action: 'create',
      entityType: 'system',
      entityId: role.id,
      description: `Created role "${role.name}"`,
      newValues: { name: role.name, permissions: params.permissionNames },
    });

    return role;
  }

  /**
   * Replaces a role's full permission set (not additive — the caller
   * sends the complete desired list).
   */
  async setRolePermissions(
    adminId: string,
    roleId: string,
    permissionNames: string[],
  ) {
    const role = await db.query.roles.findFirst({ where: eq(roles.id, roleId) });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystemRole) {
      throw new BadRequestException(
        "This is a system role — its permissions can't be changed here",
      );
    }

    const grantedPermissions =
      permissionNames.length > 0
        ? await db.query.permissions.findMany({
            where: inArray(permissions.name, permissionNames),
          })
        : [];

    await db.transaction(async (tx) => {
      await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

      if (grantedPermissions.length > 0) {
        await tx.insert(rolePermissions).values(
          grantedPermissions.map((p) => ({
            roleId,
            permissionId: p.id,
          })),
        );
      }
    });

    await this.auditService.log({
      actorId: adminId,
      action: 'update',
      entityType: 'system',
      entityId: roleId,
      description: `Updated permissions for role "${role.name}"`,
      newValues: { permissions: permissionNames },
    });

    return { message: 'Role permissions updated.' };
  }

  async deleteRole(adminId: string, roleId: string) {
    const role = await db.query.roles.findFirst({ where: eq(roles.id, roleId) });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystemRole) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    const assignedCount = await db.query.userRoles.findFirst({
      where: eq(userRoles.roleId, roleId),
    });

    if (assignedCount) {
      throw new BadRequestException(
        'Unassign this role from all staff before deleting it',
      );
    }

    await db.delete(roles).where(eq(roles.id, roleId));

    await this.auditService.log({
      actorId: adminId,
      action: 'delete',
      entityType: 'system',
      entityId: roleId,
      description: `Deleted role "${role.name}"`,
    });

    return { message: 'Role deleted.' };
  }

  /**
   * Every staff member (any user holding at least one role beyond the
   * default "user" role) with their assigned roles.
   */
  async listStaff() {
    const nonDefaultRoles = await db.query.roles.findMany({
      where: ne(roles.name, 'user'),
    });
    const nonDefaultRoleIds = nonDefaultRoles.map((r) => r.id);

    if (nonDefaultRoleIds.length === 0) {
      return [];
    }

    const staffLinks = await db
      .select({
        userId: userRoles.userId,
        roleId: userRoles.roleId,
        roleName: roles.name,
      })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(inArray(userRoles.roleId, nonDefaultRoleIds));

    const staffUserIds = [...new Set(staffLinks.map((s) => s.userId))];

    if (staffUserIds.length === 0) {
      return [];
    }

    const staffUsers = await db.query.users.findMany({
      where: inArray(users.id, staffUserIds),
    });

    return staffUsers.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      status: u.status,
      roles: staffLinks
        .filter((s) => s.userId === u.id)
        .map((s) => ({ id: s.roleId, name: s.roleName })),
    }));
  }

  /**
   * Assigns a role to a user (in addition to whatever roles they
   * already hold — a staff member can carry multiple roles).
   */
  async assignRole(adminId: string, userId: string, roleId: string) {
    const [user, role] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, userId) }),
      db.query.roles.findFirst({ where: eq(roles.id, roleId) }),
    ]);

    if (!user) throw new NotFoundException('User not found');
    if (!role) throw new NotFoundException('Role not found');

    const existing = await db.query.userRoles.findFirst({
      where: and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)),
    });

    if (existing) {
      return { message: 'User already holds this role.' };
    }

    await db.insert(userRoles).values({ userId, roleId });

    await this.auditService.log({
      actorId: adminId,
      action: 'update',
      entityType: 'user',
      entityId: userId,
      description: `Assigned role "${role.name}" to ${user.email}`,
    });

    return { message: 'Role assigned.' };
  }

  async unassignRole(adminId: string, userId: string, roleId: string) {
    const [user, role] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, userId) }),
      db.query.roles.findFirst({ where: eq(roles.id, roleId) }),
    ]);

    if (!user) throw new NotFoundException('User not found');
    if (!role) throw new NotFoundException('Role not found');

    if (role.name === 'user') {
      throw new BadRequestException('The default "user" role cannot be removed');
    }

    await db
      .delete(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));

    await this.auditService.log({
      actorId: adminId,
      action: 'update',
      entityType: 'user',
      entityId: userId,
      description: `Removed role "${role.name}" from ${user.email}`,
    });

    return { message: 'Role removed.' };
  }
}
