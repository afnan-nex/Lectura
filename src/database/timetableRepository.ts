import { getDatabase } from './db';
import { TimetableEntry } from '../types/models';
import { DateUtils } from '../utils/dateUtils';

export class TimetableRepository {
  static async getAllActiveTimetableEntries(): Promise<TimetableEntry[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM timetable_entries WHERE isActive = 1 ORDER BY startTime ASC;'
    );
    return rows.map(this.mapRowToTimetableEntry);
  }

  static async getAllTimetableEntries(): Promise<TimetableEntry[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM timetable_entries ORDER BY dayOfWeek ASC, startTime ASC;'
    );
    return rows.map(this.mapRowToTimetableEntry);
  }

  static async getTimetableEntriesForDay(dayOfWeek: number): Promise<TimetableEntry[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM timetable_entries WHERE dayOfWeek = ? AND isActive = 1 ORDER BY startTime ASC;',
      [dayOfWeek]
    );
    return rows.map(this.mapRowToTimetableEntry);
  }

  static async getTimetableEntriesForSubject(subjectId: number): Promise<TimetableEntry[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM timetable_entries WHERE subjectId = ? AND isActive = 1 ORDER BY dayOfWeek ASC, startTime ASC;',
      [subjectId]
    );
    return rows.map(this.mapRowToTimetableEntry);
  }

  static async insertTimetableEntry(
    entry: Omit<TimetableEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<number> {
    const db = await getDatabase();
    const now = Date.now();
    const result = await db.runAsync(
      `INSERT INTO timetable_entries (
        subjectId, dayOfWeek, startTime, endTime, roomOverride, teacherOverride,
        attendanceUnitCount, reminderMinutes, startDate, endDate, repeatType, notes,
        isActive, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        entry.subjectId,
        entry.dayOfWeek,
        entry.startTime,
        entry.endTime,
        entry.roomOverride || '',
        entry.teacherOverride || '',
        entry.attendanceUnitCount || 1,
        entry.reminderMinutes || 10,
        entry.startDate || '',
        entry.endDate || '',
        entry.repeatType || 'WEEKLY',
        entry.notes || '',
        entry.isActive !== false ? 1 : 0,
        now,
        now,
      ]
    );
    return result.lastInsertRowId;
  }

  static async updateTimetableEntry(entry: TimetableEntry): Promise<void> {
    const db = await getDatabase();
    const now = Date.now();
    await db.runAsync(
      `UPDATE timetable_entries SET
        subjectId = ?, dayOfWeek = ?, startTime = ?, endTime = ?, roomOverride = ?,
        teacherOverride = ?, attendanceUnitCount = ?, reminderMinutes = ?, startDate = ?,
        endDate = ?, repeatType = ?, notes = ?, isActive = ?, updatedAt = ?
      WHERE id = ?;`,
      [
        entry.subjectId,
        entry.dayOfWeek,
        entry.startTime,
        entry.endTime,
        entry.roomOverride,
        entry.teacherOverride,
        entry.attendanceUnitCount,
        entry.reminderMinutes,
        entry.startDate,
        entry.endDate,
        entry.repeatType,
        entry.notes,
        entry.isActive ? 1 : 0,
        now,
        entry.id,
      ]
    );
  }

  static async updateTimetableEntryFromDate(
    oldEntryId: number,
    updated: TimetableEntry,
    effectiveStartDate: string = DateUtils.todayIso()
  ): Promise<void> {
    const db = await getDatabase();
    const now = Date.now();
    const yesterday = DateUtils.addDays(effectiveStartDate, -1);

    // 1. End old entry
    await db.runAsync('UPDATE timetable_entries SET endDate = ?, updatedAt = ? WHERE id = ?;', [
      yesterday,
      now,
      oldEntryId,
    ]);

    // 2. Insert new entry with startDate
    await this.insertTimetableEntry({
      ...updated,
      startDate: effectiveStartDate,
      endDate: '',
      isActive: true,
    });
  }

  static async retireTimetableEntry(
    id: number,
    effectiveDate: string = DateUtils.todayIso()
  ): Promise<void> {
    const db = await getDatabase();
    const now = Date.now();
    const yesterday = DateUtils.addDays(effectiveDate, -1);
    await db.runAsync(
      'UPDATE timetable_entries SET endDate = ?, isActive = 0, updatedAt = ? WHERE id = ?;',
      [yesterday, now, id]
    );
  }

  static async deleteTimetableEntry(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM timetable_entries WHERE id = ?;', [id]);
  }

  static async copyDayEntriesToOtherDays(sourceDay: number, targetDays: number[]): Promise<void> {
    const sourceEntries = await this.getTimetableEntriesForDay(sourceDay);
    for (const targetDay of targetDays) {
      if (targetDay === sourceDay) continue;
      for (const entry of sourceEntries) {
        await this.insertTimetableEntry({
          ...entry,
          dayOfWeek: targetDay,
        });
      }
    }
  }

  private static mapRowToTimetableEntry(row: any): TimetableEntry {
    return {
      id: row.id,
      subjectId: row.subjectId,
      dayOfWeek: row.dayOfWeek,
      startTime: row.startTime,
      endTime: row.endTime,
      roomOverride: row.roomOverride || '',
      teacherOverride: row.teacherOverride || '',
      attendanceUnitCount: row.attendanceUnitCount || 1,
      reminderMinutes: row.reminderMinutes || 10,
      startDate: row.startDate || '',
      endDate: row.endDate || '',
      repeatType: row.repeatType || 'WEEKLY',
      notes: row.notes || '',
      isActive: Boolean(row.isActive),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
