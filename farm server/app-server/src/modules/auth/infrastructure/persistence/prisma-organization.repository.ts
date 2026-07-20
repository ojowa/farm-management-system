import { Injectable } from '@nestjs/common';
import { prisma } from '@farm/database';
import { OrganizationRepository } from '../../domain/repositories/organization.repository';

@Injectable()
export class PrismaOrganizationRepository implements OrganizationRepository {
  async findById(id: string): Promise<{ id: string; name: string; slug: string } | null> {
    const org = await prisma.organization.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true },
    });
    return org;
  }

  async findBySlug(slug: string): Promise<{ id: string; name: string; slug: string } | null> {
    const org = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true },
    });
    return org;
  }

  async findAll(): Promise<Array<{ id: string; name: string; slug: string }>> {
    return prisma.organization.findMany({
      select: { id: true, name: true, slug: true },
    });
  }
}
