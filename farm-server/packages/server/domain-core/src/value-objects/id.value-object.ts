import { v4 as uuidv4 } from 'uuid';

export class Id {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(): Id {
    return new Id(uuidv4());
  }

  static from(value: string): Id {
    if (!value || value.trim().length === 0) {
      throw new Error('Id cannot be empty');
    }
    return new Id(value);
  }

  equals(other: Id): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}
