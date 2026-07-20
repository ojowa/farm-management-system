import { Injectable } from '@nestjs/common';
import { prisma } from '@farm/database';
import { RoleRepository } from '../../domain/repositories/role.repository';

@Injectable()
export class PrismaRoleRepository implements RoleRepository {
  async findById(id: string): Promise<{ id: string; name: string; isSystem: boolean; organizationId: string | null } | null> {
    const role = await prisma.role.findUnique({
      where: { id },
      select: { id: true, name: true, isSystem: true, organizationId: true },
    });
    return role;
  }

  async findByName(name: string, organizationId: string | null): Promise<{ id: string; name: string } | null> {
    const role = await prisma.role.findFirst({
      where: { name, organizationId },
      select: { id: true, name: true },
    });
    return role;
  }

  async findDefaultRole(): Promise<{ id: string; name: string } | null> {
    const role = await prisma.role.findFirst({
      where: { name: 'WORKER', organizationId: null },
      select: { id: true, name: true },
    });
    return role;
  }

  async findManyByIds(ids: string[]): Promise<Array<{ id: string; name: string; isSystem: boolean }>> {
    return prisma.role.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, isSystem: true },
    });
  }
}
