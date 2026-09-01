import { DomainError } from './domain-error';

export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN';

  constructor(message: string = 'Forbidden') {
    super(message);
  }
}
