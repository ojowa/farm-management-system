export class DateRange {
  private readonly startDate: Date;
  private readonly endDate: Date;

  private constructor(startDate: Date, endDate: Date) {
    this.startDate = startDate;
    this.endDate = endDate;
  }

  static create(startDate: Date, endDate: Date): DateRange {
    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }
    return new DateRange(startDate, endDate);
  }

  static fromStrings(startDate: string, endDate: string): DateRange {
    return this.create(new Date(startDate), new Date(endDate));
  }

  getStartDate(): Date {
    return this.startDate;
  }

  getEndDate(): Date {
    return this.endDate;
  }

  getDurationInDays(): number {
    const diffTime = this.endDate.getTime() - this.startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  includes(date: Date): boolean {
    return date >= this.startDate && date <= this.endDate;
  }

  overlaps(other: DateRange): boolean {
    return this.startDate <= other.endDate && other.startDate <= this.endDate;
  }

  equals(other: DateRange): boolean {
    return this.startDate.getTime() === other.startDate.getTime() &&
           this.endDate.getTime() === other.endDate.getTime();
  }

  toString(): string {
    return `${this.startDate.toISOString()} - ${this.endDate.toISOString()}`;
  }

  toJSON(): { startDate: string; endDate: string } {
    return {
      startDate: this.startDate.toISOString(),
      endDate: this.endDate.toISOString(),
    };
  }
}
