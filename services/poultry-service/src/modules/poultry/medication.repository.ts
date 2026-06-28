import { prisma } from '@farm/database';

export interface MedicationPaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  flockId?: string;
  status?: string;
  search?: string;
}

export class MedicationRepository {
  async create(data: {
    flockId: string;
    name: string;
    dosage: string;
    frequency: string;
    startDate: Date;
    endDate?: Date | null;
    notes?: string | null;
  }) {
    return prisma.medication.create({
      data,
      include: { flock: true },
    });
  }

  async getById(id: string) {
    return prisma.medication.findUnique({
      where: { id },
      include: { flock: true },
    });
  }

  async getAll(params: MedicationPaginationParams) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', flockId, status, search } = params;

    const where: Record<string, unknown> = {};
    if (flockId) where.flockId = flockId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { dosage: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.medication.findMany({
        where,
        include: { flock: true },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.medication.count({ where }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async update(id: string, data: {
    flockId?: string;
    name?: string;
    dosage?: string;
    frequency?: string;
    startDate?: Date;
    endDate?: Date | null;
    notes?: string | null;
    status?: string;
  }) {
    return prisma.medication.update({
      where: { id },
      data,
      include: { flock: true },
    });
  }

  async delete(id: string) {
    return prisma.medication.delete({
      where: { id },
    });
  }
}
