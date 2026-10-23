import { Inject, Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { prisma } from '@farm/database';
import { RoleRepository } from '../../domain/repositories/role.repository';
import { isPlatformPermission } from './permissions.service';

/**
 * `callerOrganizationId` separates the two callers of this service:
 *  - omitted — the platform console's `/platform-roles`: every role, platform
 *    and orgs alike;
 *  - passed — the admin app's `/roles`, always `req.user.organizationId`
 *    (`?? null`): the org view, containing the caller's own custom roles plus
 *    org-applicable system roles — never platform roles, never another
 *    organization's roles.
 */
@Injectable()
export class RolesService {
  constructor(@Inject('RoleRepository') private readonly roleRepo: RoleRepository) {}

  async findAll(callerOrganizationId?: string | null) {
    return prisma.role.findMany({
      where: callerOrganizationId !== undefined ? orgScopedRoleWhere(callerOrganizationId) : undefined,
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { permissions: true, users: true } },
      },
    });
  }

  async findById(id: string, callerOrganizationId?: string | null) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    if (callerOrganizationId !== undefined && !canOrgSeeRole(role, callerOrganizationId)) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async create(data: { name: string; description?: string; organizationId?: string; permissionIds?: string[] }, callerOrganizationId?: string | null) {
    if (!data?.name?.trim()) throw new BadRequestException('Role name is required');
    const permissionIds = normalizePermissionIds(data?.permissionIds);
    if (callerOrganizationId !== undefined) {
      // Org callers can only create roles inside their own organization —
      // the body's organizationId is never trusted.
      if (!callerOrganizationId) throw new BadRequestException('An organization context is required');
      await this.assertAssignablePermissions(permissionIds, callerOrganizationId);
      const role = await prisma.role.create({
        data: { name: data.name.trim(), description: data.description || null, organizationId: callerOrganizationId },
      });
      // `permissionIds` on create used to be silently dropped — assign them now.
      if (permissionIds.length) await this.roleRepo.setPermissions(role.id, permissionIds);
      return role;
    }
    const { permissionIds: _ignored, ...rest } = data;
    await this.assertAssignablePermissions(permissionIds, undefined);
    const role = await prisma.role.create({ data: { ...rest, name: data.name.trim() } });
    if (permissionIds.length) await this.roleRepo.setPermissions(role.id, permissionIds);
    return role;
  }

  async update(id: string, data: { name?: string; description?: string; permissionIds?: string[] }, callerOrganizationId?: string | null) {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    if (callerOrganizationId !== undefined && !canOrgSeeRole(role, callerOrganizationId)) {
      throw new NotFoundException('Role not found');
    }
    if (role.isSystem) throw new BadRequestException('System roles cannot be renamed');
    if (data.name !== undefined && !data.name.trim()) throw new BadRequestException('Role name is required');
    const { permissionIds, ...clean } = data;
    const updated = await prisma.role.update({
      where: { id },
      data: { ...clean, name: data.name !== undefined ? data.name.trim() : undefined },
    });
    // When the body carries permissionIds, apply them through the same
    // validation as POST /roles/:id/permissions (org callers: own custom
    // roles only, platform permissions rejected).
    if (permissionIds !== undefined) {
      await this.setPermissions(id, permissionIds, callerOrganizationId);
    }
    return updated;
  }

  /**
   * Validates an assignment list: every id must exist, and organization
   * callers may never grant platform permissions (`undefined` caller = the
   * platform console, which may assign anything).
   */
  private async assertAssignablePermissions(permissionIds: string[], callerOrganizationId: string | null | undefined) {
    if (!permissionIds.length) return;
    const permissions = await prisma.permission.findMany({
      where: { id: { in: permissionIds } },
      select: { id: true, name: true, category: true },
    });
    if (permissions.length !== permissionIds.length) throw new BadRequestException('Unknown permission id in permissionIds');
    if (callerOrganizationId !== undefined && permissions.some((p) => isPlatformPermission(p))) {
      throw new BadRequestException('Platform permissions cannot be assigned by an organization');
    }
  }

  async delete(id: string, callerOrganizationId?: string | null) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) throw new NotFoundException('Role not found');
    if (callerOrganizationId !== undefined && !canOrgSeeRole(role, callerOrganizationId)) {
      throw new NotFoundException('Role not found');
    }
    if (role.isSystem) throw new BadRequestException('System roles cannot be deleted');
    if (role._count.users > 0) throw new ConflictException('Cannot delete role with assigned users');
    return prisma.role.delete({ where: { id } });
  }

  async setPermissions(roleId: string, permissionIdsInput: string[], callerOrganizationId?: string | null) {
    const permissionIds = normalizePermissionIds(permissionIdsInput);
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');
    if (callerOrganizationId !== undefined) {
      // Organizations manage permissions on their own custom roles only:
      // system/platform roles are shared platform-wide, and platform
      // permissions can never be granted from an organization.
      if (!canOrgSeeRole(role, callerOrganizationId)) throw new NotFoundException('Role not found');
      if (!role.organizationId) throw new BadRequestException('System roles cannot be modified');
    }
    // Existence + platform-permission rules (org callers only) in one pass.
    await this.assertAssignablePermissions(permissionIds, callerOrganizationId);
    await this.roleRepo.setPermissions(roleId, permissionIds);
  }
}

/** Dedupe and drop non-string entries so existence checks compare like for like. */
function normalizePermissionIds(ids?: string[]): string[] {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.filter((id): id is string => typeof id === 'string' && !!id))];
}

/** Org visibility: org-applicable system roles + own custom roles, never platform roles. */
function canOrgSeeRole(role: { organizationId: string | null; isPlatformAdmin: boolean }, callerOrganizationId: string | null): boolean {
  if (role.isPlatformAdmin) return false;
  if (role.organizationId && role.organizationId !== callerOrganizationId) return false;
  return true;
}

function orgScopedRoleWhere(callerOrganizationId: string | null) {
  return {
    NOT: { isPlatformAdmin: true },
    OR: [{ organizationId: null }, ...(callerOrganizationId ? [{ organizationId: callerOrganizationId }] : [])],
  };
}
