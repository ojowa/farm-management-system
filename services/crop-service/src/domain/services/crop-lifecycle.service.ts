export interface CropLifecycleStage {
  name: string;
  startDate: Date;
  endDate?: Date;
  durationDays: number;
  status: 'pending' | 'active' | 'completed';
}

export interface CropGrowthRate {
  stageName: string;
  expectedDays: number;
  actualDays?: number;
  isOnSchedule: boolean;
}

export class CropLifecycleManager {
  static calculateDaysBetween(start: Date, end: Date): number {
    const diffMs = end.getTime() - start.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  static isStageOverdue(stage: CropLifecycleStage, currentDate: Date): boolean {
    if (stage.status === 'completed') return false;
    if (!stage.endDate) return false;
    return currentDate > stage.endDate;
  }

  static getGrowthProgress(stages: CropLifecycleStage[]): number {
    if (stages.length === 0) return 0;
    const completedStages = stages.filter(s => s.status === 'completed').length;
    return Math.round((completedStages / stages.length) * 100);
  }

  static estimateHarvestDate(stages: CropLifecycleStage[]): Date | null {
    const incompleteStages = stages.filter(s => s.status !== 'completed');
    if (incompleteStages.length === 0) return null;

    let estimatedDate = new Date();
    for (const stage of incompleteStages) {
      estimatedDate.setDate(estimatedDate.getDate() + stage.durationDays);
    }
    return estimatedDate;
  }

  static getNextStage(stages: CropLifecycleStage[]): CropLifecycleStage | null {
    return stages.find(s => s.status === 'pending') || null;
  }
}
