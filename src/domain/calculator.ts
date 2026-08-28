import { AttendanceStatus, AttendanceSummary } from '../types/models';

export class AttendanceCalculator {
  private static readonly EPSILON = 1e-9;

  static calculate(statuses: AttendanceStatus[], targetPercentage = 75.0): AttendanceSummary {
    const presentUnits = statuses.filter((s) => s === AttendanceStatus.PRESENT).length;
    const absentUnits = statuses.filter((s) => s === AttendanceStatus.ABSENT).length;
    const bunkedUnits = statuses.filter((s) => s === AttendanceStatus.BUNKED).length;
    const cancelledUnits = statuses.filter((s) => s === AttendanceStatus.CANCELLED).length;

    const totalConducted = presentUnits + absentUnits + bunkedUnits;

    if (totalConducted === 0) {
      return {
        totalConductedUnits: 0,
        presentUnits: 0,
        absentUnits: 0,
        cancelledUnits,
        bunkedUnits: 0,
        percentage: 0.0,
        targetPercentage,
        safeBunks: 0,
        requiredUnitsToTarget: 0,
        statusMessage: 'No attendance recorded yet.',
      };
    }

    const percentage = (presentUnits / totalConducted) * 100.0;
    const target = Math.max(1.0, Math.min(100.0, targetPercentage));

    let safeBunks = 0;
    if (presentUnits > 0) {
      const calc = Math.floor((100.0 * presentUnits - target * totalConducted) / target + this.EPSILON);
      safeBunks = Math.max(0, calc);
    }

    let requiredUnitsToTarget = 0;
    let statusMessage = '';

    if (percentage >= target - this.EPSILON) {
      requiredUnitsToTarget = 0;
      if (safeBunks > 0) {
        statusMessage = `On track! You can safely miss ${safeBunks} unit${safeBunks > 1 ? 's' : ''} and remain above ${target}%.`;
      } else {
        statusMessage = `Right on track (${percentage.toFixed(1)}%). Don't miss the next class.`;
      }
    } else {
      if (target >= 100.0 && (absentUnits + bunkedUnits) > 0) {
        requiredUnitsToTarget = Infinity;
        statusMessage = `Target is 100%. Cannot reach target after an absence.`;
      } else {
        const numerator = target * totalConducted - 100.0 * presentUnits;
        const denominator = 100.0 - target;
        const calc = Math.ceil(numerator / denominator - this.EPSILON);
        requiredUnitsToTarget = Math.max(0, calc);
        statusMessage = `Attend the next ${requiredUnitsToTarget} consecutive unit${requiredUnitsToTarget > 1 ? 's' : ''} to reach ${target}%.`;
      }
    }

    return {
      totalConductedUnits: totalConducted,
      presentUnits,
      absentUnits,
      cancelledUnits,
      bunkedUnits,
      percentage,
      targetPercentage: target,
      safeBunks,
      requiredUnitsToTarget,
      statusMessage,
    };
  }

  static calculateAttendanceUnits(durationMinutes: number, unitRuleMinutes: number): number {
    const rule = Math.max(1, unitRuleMinutes);
    const units = Math.round(durationMinutes / rule);
    return Math.max(1, units);
  }
}
