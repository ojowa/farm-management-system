export class Phone {
  private static readonly PHONE_REGEX = /^\+?[\d\s\-()]{7,20}$/;

  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): Phone {
    if (!value || value.trim().length === 0) {
      throw new Error('Phone cannot be empty');
    }
    const normalized = value.trim();
    if (!Phone.PHONE_REGEX.test(normalized)) {
      throw new Error(`Invalid phone format: ${value}`);
    }
    return new Phone(normalized);
  }

  equals(other: Phone): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}
