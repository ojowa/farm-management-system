import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { prisma } from '../../../../kernel/database';

/**
 * Platform-wide permissions (category `Platform` / `platform.*` names) belong
 * to the platform console alone — organizations never see or manage them.
 */
export function isPlatformPermission(p: { name?: string | null; category?: string | null }): boolean {
  return p.category === 'Platform' || !!p.name?.startsWith('platform.');
}

@Injectable()
export class PermissionsService {
  /**
   * `excludePlatform` comes from the org-facing `/permissions` route; the
   * platform console's `/platform-permissions` calls without it and gets the
   * full catalog.
   */
  async findAll(options?: { excludePlatform?: boolean }) {
    return prisma.permission.findMany({
      where: options?.excludePlatform
        ? { NOT: { OR: [{ category: 'Platform' }, { name: { startsWith: 'platform.' } }] } }
        : undefined,
      include: { _count: { select: { roles: true } } },
      orderBy: { category: 'asc' },
    });
  }

  async create(data: { name: string; description?: string; category?: string }, options?: { orgScoped?: boolean }) {
    if (!data?.name?.trim()) throw new BadRequestException('Permission name is required');
    if (options?.orgScoped && isPlatformPermission({ name: data.name.trim(), category: data.category })) {
      throw new BadRequestException('Platform permissions cannot be created by an organization');
    }
    return prisma.permission.create({
      data: { ...data, name: data.name.trim(), description: data.description || null, category: data.category || null },
    });
  }

  async delete(id: string, options?: { orgScoped?: boolean }) {
    const permission = await prisma.permission.findUnique({
      where: { id },
      include: { _count: { select: { roles: true } } },
    });
    if (!permission) throw new NotFoundException('Permission not found');
    if (options?.orgScoped && isPlatformPermission(permission)) {
      throw new BadRequestException('Platform permissions cannot be deleted by an organization');
    }
    if (permission._count.roles > 0) throw new ConflictException('Cannot delete permission assigned to roles');
    return prisma.permission.delete({ where: { id } });
  }
}
