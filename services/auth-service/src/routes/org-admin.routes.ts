import { Router, Request, Response } from 'express';
import { authMiddleware } from '@farm/auth/express';
import { prisma } from '@farm/database';
import { subscriptionLimitGuard } from '@farm/database';
import { sendInvitationEmail } from '../utils/email';

const router = Router();

// Org-owner and above can access these routes
const orgAccess = authMiddleware({ roles: ['SUPER_ADMIN', 'SUPPORT_ADMIN', 'ORGANIZATION_OWNER'] });

function getUserId(req: Request): string {
  return String((req as any).user?.sub || '');
}

function getUserRole(req: Request): string {
  return String((req as any).user?.role || '');
}

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

// GET /org-admin/me - Get current user's organization details
router.get('/me', orgAccess, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ message: 'No organization context' });
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: { select: { users: true, farms: true } },
      },
    });
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    res.json(org);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /org-admin/me - Update current user's organization settings
router.put('/me', orgAccess, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ message: 'No organization context' });
    }

    const { name, email, phone, website, industry, logo, settings } = req.body;
    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(website !== undefined && { website }),
        ...(industry !== undefined && { industry }),
        ...(logo !== undefined && { logo }),
        ...(settings !== undefined && { settings }),
      },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /org-admin/users - List users in current user's organization
router.get('/users', orgAccess, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ message: 'No organization context' });
    }

    const users = await prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        email: true,
        phone: true,
        avatar: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        role: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /org-admin/users - Invite/add user to current user's organization
router.post('/users', orgAccess, subscriptionLimitGuard('users'), async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ message: 'No organization context' });
    }

    const { firstName, lastName, middleName, email, phone, roleId } = req.body;
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ message: 'firstName, lastName, and email are required' });
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    // If no roleId provided, default to WORKER
    let assignedRoleId = roleId;
    if (!assignedRoleId) {
      const workerRole = await prisma.role.findFirst({ where: { name: 'WORKER', organizationId: null } });
      assignedRoleId = workerRole?.id;
    }
    if (!assignedRoleId) {
      return res.status(400).json({ message: 'No valid role specified' });
    }

    // Generate a temporary password
    const bcrypt = require('bcryptjs');
    const tempPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await prisma.user.create({
      data: {
        organizationId: orgId,
        firstName,
        lastName,
        middleName: middleName || null,
        email,
        phone: phone || null,
        passwordHash,
        roleId: assignedRoleId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: { select: { name: true } },
      },
    });

    // Send invitation email (best-effort, don't fail user creation)
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
    sendInvitationEmail(email, firstName, tempPassword, org?.name || 'your organization');

    res.status(201).json({ user });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /org-admin/users/:id - Update user in current user's organization
router.put('/users/:id', orgAccess, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = String(req.params.id);
    if (!orgId) {
      return res.status(400).json({ message: 'No organization context' });
    }

    // Verify user belongs to this org
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser || targetUser.organizationId !== orgId) {
      return res.status(404).json({ message: 'User not found in your organization' });
    }

    // Cannot change own role
    const currentUserId = getUserId(req);
    const { roleId, isActive, firstName, lastName, phone } = req.body;

    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (roleId !== undefined && userId !== currentUserId) updateData.roleId = roleId;
    if (isActive !== undefined && userId !== currentUserId) updateData.isActive = isActive;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        role: { select: { id: true, name: true } },
      },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /org-admin/users/:id - Remove user from current user's organization
router.delete('/users/:id', orgAccess, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = String(req.params.id);
    if (!orgId) {
      return res.status(400).json({ message: 'No organization context' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser || targetUser.organizationId !== orgId) {
      return res.status(404).json({ message: 'User not found in your organization' });
    }

    // Cannot remove yourself
    const currentUserId = getUserId(req);
    if (userId === currentUserId) {
      return res.status(400).json({ message: 'Cannot remove yourself from the organization' });
    }

    await prisma.user.delete({ where: { id: userId } });
    res.json({ message: 'User removed' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ── Role Management (org-scoped custom roles) ───────────────

// GET /org-admin/roles - List roles visible to this org (system + org custom)
router.get('/roles', orgAccess, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const roles = await prisma.role.findMany({
      where: {
        OR: [
          { organizationId: null },   // system roles
          { organizationId: orgId },  // this org's custom roles
        ],
      },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
    res.json(roles);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /org-admin/roles - Create a custom role scoped to this org
router.post('/roles', orgAccess, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ message: 'No organization context' });
    }

    const { name, description, permissionIds } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ message: 'Role name is required' });
    }

    // Check name uniqueness within this org (and globally for system-scoped check)
    const existing = await prisma.role.findFirst({
      where: { name: name.trim(), organizationId: orgId },
    });
    if (existing) {
      return res.status(409).json({ message: 'A role with this name already exists in your organization' });
    }

    const role = await prisma.role.create({
      data: {
        name: name.trim(),
        description: description || null,
        isSystem: false,
        organizationId: orgId,
        permissions: permissionIds?.length
          ? {
              create: permissionIds.map((pid: string) => ({
                permissionId: pid,
              })),
            }
          : undefined,
      },
      include: {
        permissions: { include: { permission: true } },
      },
    });

    res.status(201).json(role);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /org-admin/roles/:id - Get a specific role
router.get('/roles/:id', orgAccess, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const roleId = String(req.params.id);

    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });

    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Must be system role or belong to this org
    if (role.organizationId !== null && role.organizationId !== orgId) {
      return res.status(404).json({ message: 'Role not found' });
    }

    res.json(role);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /org-admin/roles/:id - Update a custom org role (not system roles)
router.put('/roles/:id', orgAccess, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const roleId = String(req.params.id);

    const existing = await prisma.role.findUnique({ where: { id: roleId } });
    if (!existing) {
      return res.status(404).json({ message: 'Role not found' });
    }
    if (existing.isSystem) {
      return res.status(403).json({ message: 'Cannot modify system roles' });
    }
    if (existing.organizationId !== orgId) {
      return res.status(403).json({ message: 'Cannot modify roles from other organizations' });
    }

    const { name, description, permissionIds } = req.body;

    // Check name uniqueness if renaming
    if (name && name.trim() !== existing.name) {
      const dup = await prisma.role.findFirst({
        where: { name: name.trim(), organizationId: orgId, id: { not: roleId } },
      });
      if (dup) {
        return res.status(409).json({ message: 'A role with this name already exists in your organization' });
      }
    }

    // Update role and optionally replace permissions
    const role = await prisma.role.update({
      where: { id: roleId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(permissionIds !== undefined && {
          permissions: {
            deleteMany: {},
            create: permissionIds.map((pid: string) => ({ permissionId: pid })),
          },
        }),
      },
      include: {
        permissions: { include: { permission: true } },
      },
    });

    res.json(role);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /org-admin/roles/:id - Delete a custom org role (not system roles)
router.delete('/roles/:id', orgAccess, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const roleId = String(req.params.id);

    const existing = await prisma.role.findUnique({
      where: { id: roleId },
      include: { _count: { select: { users: true } } },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Role not found' });
    }
    if (existing.isSystem) {
      return res.status(403).json({ message: 'Cannot delete system roles' });
    }
    if (existing.organizationId !== orgId) {
      return res.status(403).json({ message: 'Cannot delete roles from other organizations' });
    }
    if (existing._count.users > 0) {
      return res.status(400).json({ message: 'Cannot delete role with assigned users. Reassign them first.' });
    }

    // Delete permissions first, then role
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    await prisma.role.delete({ where: { id: roleId } });
    res.json({ message: 'Role deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
