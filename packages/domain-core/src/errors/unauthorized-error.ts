import { DomainError } from './domain-error';

export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED';

  constructor(message: string = 'Unauthorized') {
    super(message);
  }
}
