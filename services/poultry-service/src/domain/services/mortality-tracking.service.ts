export interface MortalityTrackingProps {
  flockId: string;
  totalMortality: number;
  currentBirdCount: number;
}

export class MortalityTracking {
  private props: MortalityTrackingProps;

  private constructor(props: MortalityTrackingProps) {
    this.props = props;
  }

  static create(props: MortalityTrackingProps): MortalityTracking {
    return new MortalityTracking(props);
  }

  static reconstitute(props: MortalityTrackingProps): MortalityTracking {
    return new MortalityTracking(props);
  }

  canRecordMortality(count: number): boolean {
    return count <= this.props.currentBirdCount && count > 0;
  }

  recordMortality(count: number): void {
    if (!this.canRecordMortality(count)) {
      throw new Error(`Mortality count (${count}) cannot exceed current bird count (${this.props.currentBirdCount})`);
    }
    this.props.totalMortality += count;
    this.props.currentBirdCount -= count;
  }

  reverseMortality(count: number): void {
    this.props.totalMortality -= count;
    this.props.currentBirdCount += count;
  }

  getCurrentBirdCount(): number {
    return this.props.currentBirdCount;
  }

  getTotalMortality(): number {
    return this.props.totalMortality;
  }

  getMortalityRate(): number {
    const total = this.props.totalMortality + this.props.currentBirdCount;
    return total > 0 ? (this.props.totalMortality / total) * 100 : 0;
  }

  toProps(): MortalityTrackingProps {
    return { ...this.props };
  }
}
