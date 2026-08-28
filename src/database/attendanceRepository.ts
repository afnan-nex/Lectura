import { getDatabase } from './db';
import {
  AttendanceSession,
  AttendanceUnit,
  AttendanceStatus,
  SessionWithUnits,
} from '../types/models';
import { DateUtils } from '../utils/dateUtils';
import { HolidayRepository } from './holidayRepository';
import { TimetableRepository } from './timetableRepository';

export class AttendanceRepository {
  static async getOrCreateSession(
    subjectId: number,
    timetableEntryId: number | null,
    sessionDate: string,
    startTime: string,
    endTime: string,
    expectedUnitCount: number
  ): Promise<SessionWithUnits> {
    const db = await getDatabase();

    // Check existing
    let sessionRow: any = null;
    if (timetableEntryId) {
      sessionRow = await db.getFirstAsync<any>(
        'SELECT * FROM attendance_sessions WHERE timetableEntryId = ? AND sessionDate = ?;',
        [timetableEntryId, sessionDate]
      );
    }

    if (!sessionRow) {
      sessionRow = await db.getFirstAsync<any>(
        'SELECT * FROM attendance_sessions WHERE subjectId = ? AND sessionDate = ? AND startTime = ?;',
        [subjectId, sessionDate, startTime]
      );
    }

    let sessionId: number;
    let session: AttendanceSession;

    if (sessionRow) {
      sessionId = sessionRow.id;
      session = this.mapRowToSession(sessionRow);
    } else {
      const now = Date.now();
      const insertResult = await db.runAsync(
        `INSERT INTO attendance_sessions (
          subjectId, timetableEntryId, sessionDate, startTime, endTime,
          expectedUnitCount, notes, isRescheduled, originalDate, originalTime,
          rescheduledToDate, rescheduledToTime, rescheduledReason, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          subjectId,
          timetableEntryId,
          sessionDate,
          startTime,
          endTime,
          expectedUnitCount,
          '',
          0,
          null,
          null,
          null,
          null,
          '',
          now,
          now,
        ]
      );
      sessionId = insertResult.lastInsertRowId;
      session = {
        id: sessionId,
        subjectId,
        timetableEntryId,
        sessionDate,
        startTime,
        endTime,
        expectedUnitCount,
        notes: '',
        isRescheduled: false,
        originalDate: null,
        originalTime: null,
        rescheduledToDate: null,
        rescheduledToTime: null,
        rescheduledReason: '',
        createdAt: now,
        updatedAt: now,
      };

      // Create units
      for (let i = 0; i < expectedUnitCount; i++) {
        await db.runAsync(
          `INSERT INTO attendance_units (sessionId, unitIndex, status, markedAt, updatedAt)
           VALUES (?, ?, ?, ?, ?);`,
          [sessionId, i, AttendanceStatus.UNMARKED, now, now]
        );
      }
    }

    const units = await this.getUnitsForSession(sessionId);
    return { session, units };
  }

  static async getSessionsForDate(sessionDate: string): Promise<SessionWithUnits[]> {
    const db = await getDatabase();
    const sessionRows = await db.getAllAsync<any>(
      'SELECT * FROM attendance_sessions WHERE sessionDate = ? ORDER BY startTime ASC;',
      [sessionDate]
    );

    const results: SessionWithUnits[] = [];
    for (const row of sessionRows) {
      const session = this.mapRowToSession(row);
      const units = await this.getUnitsForSession(session.id);
      results.push({ session, units });
    }
    return results;
  }

  static async getSessionsForSubject(subjectId: number): Promise<AttendanceSession[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM attendance_sessions WHERE subjectId = ? ORDER BY sessionDate DESC, startTime DESC;',
      [subjectId]
    );
    return rows.map(this.mapRowToSession);
  }

  static async getAllSessions(): Promise<AttendanceSession[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM attendance_sessions ORDER BY sessionDate DESC, startTime DESC;'
    );
    return rows.map(this.mapRowToSession);
  }

  static async getUnitsForSession(sessionId: number): Promise<AttendanceUnit[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM attendance_units WHERE sessionId = ? ORDER BY unitIndex ASC;',
      [sessionId]
    );
    return rows.map(this.mapRowToUnit);
  }

  static async getAllUnits(): Promise<AttendanceUnit[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>('SELECT * FROM attendance_units;');
    return rows.map(this.mapRowToUnit);
  }

  static async updateUnitStatus(unitId: number, status: AttendanceStatus): Promise<void> {
    const db = await getDatabase();
    const now = Date.now();
    await db.runAsync('UPDATE attendance_units SET status = ?, updatedAt = ? WHERE id = ?;', [
      status,
      now,
      unitId,
    ]);
  }

  static async markCompleteSessionStatus(sessionId: number, status: AttendanceStatus): Promise<void> {
    const db = await getDatabase();
    const now = Date.now();
    await db.runAsync('UPDATE attendance_units SET status = ?, updatedAt = ? WHERE sessionId = ?;', [
      status,
      now,
      sessionId,
    ]);
  }

  static async resetSessionAttendance(sessionId: number): Promise<void> {
    await this.markCompleteSessionStatus(sessionId, AttendanceStatus.UNMARKED);
  }

  static async deleteSession(sessionId: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM attendance_sessions WHERE id = ?;', [sessionId]);
  }

  static async rescheduleSession(
    originalSessionId: number,
    newDate: string,
    newStartTime: string,
    newEndTime: string,
    reason: string = ''
  ): Promise<number> {
    const db = await getDatabase();
    const now = Date.now();

    const original = await db.getFirstAsync<any>(
      'SELECT * FROM attendance_sessions WHERE id = ?;',
      [originalSessionId]
    );
    if (!original) throw new Error('Original session not found');

    // 1. Update original session
    await db.runAsync(
      `UPDATE attendance_sessions SET
        rescheduledToDate = ?, rescheduledToTime = ?, rescheduledReason = ?, updatedAt = ?
      WHERE id = ?;`,
      [newDate, newStartTime, reason, now, originalSessionId]
    );

    // Cancel units on original
    await db.runAsync(
      'UPDATE attendance_units SET status = ?, updatedAt = ? WHERE sessionId = ?;',
      [AttendanceStatus.CANCELLED, now, originalSessionId]
    );

    // 2. Create target session
    const insertTarget = await db.runAsync(
      `INSERT INTO attendance_sessions (
        subjectId, timetableEntryId, sessionDate, startTime, endTime,
        expectedUnitCount, notes, isRescheduled, originalDate, originalTime,
        rescheduledToDate, rescheduledToTime, rescheduledReason, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        original.subjectId,
        original.timetableEntryId,
        newDate,
        newStartTime,
        newEndTime,
        original.expectedUnitCount,
        original.notes || '',
        1,
        original.sessionDate,
        original.startTime,
        null,
        null,
        reason,
        now,
        now,
      ]
    );

    const newSessionId = insertTarget.lastInsertRowId;

    // Create target UNMARKED units
    for (let i = 0; i < original.expectedUnitCount; i++) {
      await db.runAsync(
        `INSERT INTO attendance_units (sessionId, unitIndex, status, markedAt, updatedAt)
         VALUES (?, ?, ?, ?, ?);`,
        [newSessionId, i, AttendanceStatus.UNMARKED, now, now]
      );
    }

    return newSessionId;
  }

  static async revertRescheduledSession(sessionId: number): Promise<void> {
    const db = await getDatabase();
    const now = Date.now();

    const current = await db.getFirstAsync<any>(
      'SELECT * FROM attendance_sessions WHERE id = ?;',
      [sessionId]
    );
    if (!current) return;

    if (current.isRescheduled) {
      // Reverting from target session
      const orig = await db.getFirstAsync<any>(
        'SELECT * FROM attendance_sessions WHERE subjectId = ? AND sessionDate = ? AND startTime = ?;',
        [current.subjectId, current.originalDate, current.originalTime]
      );
      if (orig) {
        await db.runAsync(
          `UPDATE attendance_sessions SET
            rescheduledToDate = NULL, rescheduledToTime = NULL, rescheduledReason = '', updatedAt = ?
          WHERE id = ?;`,
          [now, orig.id]
        );
        await db.runAsync(
          'UPDATE attendance_units SET status = ?, updatedAt = ? WHERE sessionId = ?;',
          [AttendanceStatus.UNMARKED, now, orig.id]
        );
      }
      await db.runAsync('DELETE FROM attendance_sessions WHERE id = ?;', [sessionId]);
    } else if (current.rescheduledToDate) {
      // Reverting from original session
      const target = await db.getFirstAsync<any>(
        'SELECT * FROM attendance_sessions WHERE subjectId = ? AND sessionDate = ? AND startTime = ? AND isRescheduled = 1;',
        [current.subjectId, current.rescheduledToDate, current.rescheduledToTime]
      );
      if (target) {
        await db.runAsync('DELETE FROM attendance_sessions WHERE id = ?;', [target.id]);
      }
      await db.runAsync(
        `UPDATE attendance_sessions SET
          rescheduledToDate = NULL, rescheduledToTime = NULL, rescheduledReason = '', updatedAt = ?
        WHERE id = ?;`,
        [now, sessionId]
      );
      await db.runAsync(
        'UPDATE attendance_units SET status = ?, updatedAt = ? WHERE sessionId = ?;',
        [AttendanceStatus.UNMARKED, now, sessionId]
      );
    }
  }

  static async addExtraClass(
    subjectId: number,
    date: string,
    startTime: string,
    endTime: string,
    unitCount: number = 1,
    notes: string = ''
  ): Promise<number> {
    const db = await getDatabase();
    const now = Date.now();

    const result = await db.runAsync(
      `INSERT INTO attendance_sessions (
        subjectId, timetableEntryId, sessionDate, startTime, endTime,
        expectedUnitCount, notes, isRescheduled, originalDate, originalTime,
        rescheduledToDate, rescheduledToTime, rescheduledReason, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        subjectId,
        null,
        date,
        startTime,
        endTime,
        unitCount,
        notes,
        0,
        null,
        null,
        null,
        null,
        '',
        now,
        now,
      ]
    );

    const sessionId = result.lastInsertRowId;
    for (let i = 0; i < unitCount; i++) {
      await db.runAsync(
        `INSERT INTO attendance_units (sessionId, unitIndex, status, markedAt, updatedAt)
         VALUES (?, ?, ?, ?, ?);`,
        [sessionId, i, AttendanceStatus.UNMARKED, now, now]
      );
    }

    return sessionId;
  }

  static async markPastAttendanceForSubject(
    subjectId: number,
    attendedCount: number
  ): Promise<{ success: boolean; message: string }> {
    if (attendedCount <= 0) {
      return { success: false, message: 'Please enter a count greater than 0.' };
    }

    const holidays = await HolidayRepository.getAllHolidays();
    const holidayDates = new Set(holidays.map((h) => h.date));
    const timetableEntries = await TimetableRepository.getTimetableEntriesForSubject(subjectId);

    if (timetableEntries.length === 0) {
      return {
        success: false,
        message: 'No weekly timetable schedule found for this subject.',
      };
    }

    let remainingToMark = attendedCount;
    let currentDateIso = DateUtils.addDays(DateUtils.todayIso(), -1);
    let daysChecked = 0;
    let sessionsUpdated = 0;

    while (remainingToMark > 0 && daysChecked < 365) {
      if (!holidayDates.has(currentDateIso)) {
        const dayOfWeek = DateUtils.getDayOfWeekFromIso(currentDateIso);
        const dayEntries = timetableEntries.filter((e) => e.dayOfWeek === dayOfWeek);

        for (const entry of dayEntries) {
          if (remainingToMark <= 0) break;

          const sessionWithUnits = await this.getOrCreateSession(
            subjectId,
            entry.id,
            currentDateIso,
            entry.startTime,
            entry.endTime,
            entry.attendanceUnitCount
          );

          let modifiedSession = false;
          for (const unit of sessionWithUnits.units) {
            if (remainingToMark <= 0) break;
            if (unit.status !== AttendanceStatus.PRESENT) {
              await this.updateUnitStatus(unit.id, AttendanceStatus.PRESENT);
              remainingToMark--;
              modifiedSession = true;
            }
          }

          if (modifiedSession) {
            sessionsUpdated++;
          }
        }
      }

      currentDateIso = DateUtils.addDays(currentDateIso, -1);
      daysChecked++;
    }

    const marked = attendedCount - remainingToMark;
    return {
      success: true,
      message: `Successfully marked ${marked} attendance unit(s) across ${sessionsUpdated} past session(s).`,
    };
  }

  private static mapRowToSession(row: any): AttendanceSession {
    return {
      id: row.id,
      subjectId: row.subjectId,
      timetableEntryId: row.timetableEntryId ?? null,
      sessionDate: row.sessionDate,
      startTime: row.startTime,
      endTime: row.endTime,
      expectedUnitCount: row.expectedUnitCount || 1,
      notes: row.notes || '',
      isRescheduled: Boolean(row.isRescheduled),
      originalDate: row.originalDate ?? null,
      originalTime: row.originalTime ?? null,
      rescheduledToDate: row.rescheduledToDate ?? null,
      rescheduledToTime: row.rescheduledToTime ?? null,
      rescheduledReason: row.rescheduledReason || '',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private static mapRowToUnit(row: any): AttendanceUnit {
    return {
      id: row.id,
      sessionId: row.sessionId,
      unitIndex: row.unitIndex,
      status: (row.status as AttendanceStatus) || AttendanceStatus.UNMARKED,
      markedAt: row.markedAt,
      updatedAt: row.updatedAt,
    };
  }
}
