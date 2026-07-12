import { Repository, Id } from '@farm/domain-core';
import { Task } from '../entities/task.entity';
import { TaskStatus } from '../value-objects/task-status.value-object';

export interface TaskRepository extends Repository<Task> {
  findByOrganizationId(organizationId: Id): Promise<Task[]>;
  findByFarmId(farmId: Id): Promise<Task[]>;
  findByAssignedTo(userId: Id): Promise<Task[]>;
  findByStatus(status: TaskStatus, organizationId: Id): Promise<Task[]>;
}
