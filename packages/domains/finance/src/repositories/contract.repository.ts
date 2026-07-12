import { Repository, Id } from '@farm/domain-core';
import { Contract } from '../entities/contract.entity';
import { ContractStatus } from '../value-objects/contract-status.value-object';
import { ContractType } from '../value-objects/contract-type.value-object';

export interface ContractRepository extends Repository<Contract> {
  findByOrganizationId(organizationId: Id): Promise<Contract[]>;
  findByStatus(status: ContractStatus, organizationId: Id): Promise<Contract[]>;
  findByType(type: ContractType, organizationId: Id): Promise<Contract[]>;
  findActiveByEntityId(entityId: Id, entityType: string): Promise<Contract[]>;
}
