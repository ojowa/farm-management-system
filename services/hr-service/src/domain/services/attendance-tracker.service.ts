export interface AttendanceSummary {
  workerId: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  attendanceRate: number;
  totalHoursWorked: number;
}

export interface ClockInResult {
  success: boolean;
  message: string;
  attendanceId?: string;
}

export class AttendanceTracker {
  static calculateSummary(records: Array<{ status: string; hoursWorked?: number }>): Omit<AttendanceSummary, 'workerId'> {
    const totalDays = records.length;
    const presentDays = records.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
    const absentDays = records.filter(r => r.status === 'ABSENT').length;
    const lateDays = records.filter(r => r.status === 'LATE').length;
    const totalHoursWorked = records.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);
    const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    return {
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,
    };
  }

  static determineStatus(checkInTime: Date, expectedStartTime: Date): string {
    const diffMs = checkInTime.getTime() - expectedStartTime.getTime();
    const diffMinutes = diffMs / (1000 * 60);

    if (diffMinutes <= 0) return 'PRESENT';
    if (diffMinutes <= 15) return 'LATE';
    return 'LATE';
  }

  static calculateHoursWorked(checkIn: Date, checkOut: Date): number {
    const diffMs = checkOut.getTime() - checkIn.getTime();
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  }

  static canClockOut(hasClockedIn: boolean, hasClockedOut: boolean): boolean {
    return hasClockedIn && !hasClockedOut;
  }
}
