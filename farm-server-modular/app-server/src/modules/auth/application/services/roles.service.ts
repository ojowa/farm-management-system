import { Inject, Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { prisma } from '../../../../kernel/database';
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

  async create(data: { name: string; description?: string; organizationId?: string }, callerOrganizationId?: string | null) {
    if (!data?.name?.trim()) throw new BadRequestException('Role name is required');
    if (callerOrganizationId !== undefined) {
      // Org callers can only create roles inside their own organization —
      // the body's organizationId is never trusted.
      if (!callerOrganizationId) throw new BadRequestException('An organization context is required');
      return prisma.role.create({
        data: { name: data.name.trim(), description: data.description || null, organizationId: callerOrganizationId },
      });
    }
    return prisma.role.create({ data: { ...data, name: data.name.trim() } });
  }

  async update(id: string, data: { name?: string; description?: string }, callerOrganizationId?: string | null) {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    if (callerOrganizationId !== undefined && !canOrgSeeRole(role, callerOrganizationId)) {
      throw new NotFoundException('Role not found');
    }
    if (role.isSystem) throw new BadRequestException('System roles cannot be renamed');
    if (data.name !== undefined && !data.name.trim()) throw new BadRequestException('Role name is required');
    return prisma.role.update({
      where: { id },
      data: { ...data, name: data.name !== undefined ? data.name.trim() : undefined },
    });
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

  async setPermissions(roleId: string, permissionIds: string[], callerOrganizationId?: string | null) {
    if (callerOrganizationId !== undefined) {
      // Organizations manage permissions on their own custom roles only:
      // system/platform roles are shared platform-wide, and platform
      // permissions can never be granted from an organization.
      const role = await prisma.role.findUnique({ where: { id: roleId } });
      if (!role || !canOrgSeeRole(role, callerOrganizationId)) throw new NotFoundException('Role not found');
      if (!role.organizationId) throw new BadRequestException('System roles cannot be modified');
      const permissions = await prisma.permission.findMany({
        where: { id: { in: permissionIds } },
        select: { name: true, category: true },
      });
      if (permissions.some((p) => isPlatformPermission(p))) {
        throw new BadRequestException('Platform permissions cannot be assigned by an organization');
      }
    }
    await this.roleRepo.setPermissions(roleId, permissionIds);
  }
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
