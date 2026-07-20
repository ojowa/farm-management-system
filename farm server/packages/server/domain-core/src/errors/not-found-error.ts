import { DomainError } from './domain-error';

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';

  constructor(entityName: string, id: string) {
    super(`${entityName} with id '${id}' not found`);
  }
}
