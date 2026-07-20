import { DomainError } from './domain-error';

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.field = field;
  }
}
