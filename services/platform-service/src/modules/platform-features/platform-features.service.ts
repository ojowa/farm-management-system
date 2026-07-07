import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@farm/database';

@Injectable()
export class PlatformFeaturesService {
  async findAll() {
    const features = await prisma.featureFlag.findMany({
      include: {
        orgOverrides: { include: { organization: { select: { id: true, name: true } } } },
        _count: { select: { orgOverrides: true } },
      },
      orderBy: { category: 'asc' },
    });

    return {
      features: features.map((f) => ({
        id: f.id,
        key: f.key,
        name: f.name,
        description: f.description,
        category: f.category,
        defaultValue: f.defaultValue,
        isEnabled: f.isEnabled,
        overrideCount: f._count.orgOverrides,
        overrides: f.orgOverrides.map((o) => ({
          organizationId: o.organizationId,
          organizationName: o.organization.name,
          isEnabled: o.isEnabled,
        })),
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
    };
  }

  async findOne(id: string) {
    const feature = await prisma.featureFlag.findUnique({
      where: { id },
      include: { orgOverrides: { include: { organization: { select: { id: true, name: true } } } } },
    });

    if (!feature) {
      throw new NotFoundException('Feature flag not found');
    }

    return {
      id: feature.id,
      key: feature.key,
      name: feature.name,
      description: feature.description,
      category: feature.category,
      defaultValue: feature.defaultValue,
      isEnabled: feature.isEnabled,
      overrides: feature.orgOverrides.map((o) => ({
        organizationId: o.organizationId,
        organizationName: o.organization.name,
        isEnabled: o.isEnabled,
        createdAt: o.createdAt,
      })),
      createdAt: feature.createdAt,
      updatedAt: feature.updatedAt,
    };
  }

  async update(id: string, data: { isEnabled?: boolean; name?: string; description?: string }, auditUserId: string) {
    const feature = await prisma.featureFlag.findUnique({ where: { id } });
    if (!feature) {
      throw new NotFoundException('Feature flag not found');
    }

    const updated = await prisma.featureFlag.update({
      where: { id },
      data: {
        ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
      },
    });

    await prisma.auditLog.create({
      data: { userId: auditUserId, action: 'feature.toggle', entity: 'FeatureFlag', entityId: id },
    });

    return updated;
  }

  async getOverrides(featureId: string) {
    const overrides = await prisma.featureFlagOverride.findMany({
      where: { featureFlagId: featureId },
      include: { organization: { select: { id: true, name: true } } },
    });

    return {
      overrides: overrides.map((o) => ({
        id: o.id,
        organizationId: o.organizationId,
        organizationName: o.organization.name,
        isEnabled: o.isEnabled,
        createdAt: o.createdAt,
      })),
    };
  }

  async setOverride(
    featureId: string,
    data: { organizationId: string; isEnabled: boolean },
    auditUserId: string,
  ) {
    if (!data.organizationId || data.isEnabled === undefined) {
      throw new BadRequestException('organizationId and isEnabled are required');
    }

    const feature = await prisma.featureFlag.findUnique({ where: { id: featureId } });
    if (!feature) {
      throw new NotFoundException('Feature flag not found');
    }

    const org = await prisma.organization.findUnique({ where: { id: data.organizationId } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const override = await prisma.featureFlagOverride.upsert({
      where: {
        featureFlagId_organizationId: {
          featureFlagId: featureId,
          organizationId: data.organizationId,
        },
      },
      update: { isEnabled: data.isEnabled },
      create: { featureFlagId: featureId, organizationId: data.organizationId, isEnabled: data.isEnabled },
    });

    await prisma.auditLog.create({
      data: { userId: auditUserId, action: 'feature.override.set', entity: 'FeatureFlagOverride', entityId: override.id },
    });

    return override;
  }

  async deleteOverride(featureId: string, orgId: string, auditUserId: string) {
    const override = await prisma.featureFlagOverride.findUnique({
      where: { featureFlagId_organizationId: { featureFlagId: featureId, organizationId: orgId } },
    });

    if (!override) {
      throw new NotFoundException('Override not found');
    }

    await prisma.featureFlagOverride.delete({
      where: { featureFlagId_organizationId: { featureFlagId: featureId, organizationId: orgId } },
    });

    await prisma.auditLog.create({
      data: { userId: auditUserId, action: 'feature.override.delete', entity: 'FeatureFlagOverride', entityId: override.id },
    });

    return { message: 'Override removed successfully' };
  }
}
