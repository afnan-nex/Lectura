import { getDatabase } from './db';
import { Subject } from '../types/models';

export class SubjectRepository {
  static async getAllSubjects(): Promise<Subject[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>('SELECT * FROM subjects ORDER BY name ASC;');
    return rows.map(this.mapRowToSubject);
  }

  static async getActiveSubjects(): Promise<Subject[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>('SELECT * FROM subjects WHERE isArchived = 0 ORDER BY name ASC;');
    return rows.map(this.mapRowToSubject);
  }

  static async getSubjectById(id: number): Promise<Subject | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>('SELECT * FROM subjects WHERE id = ?;', [id]);
    return row ? this.mapRowToSubject(row) : null;
  }

  static async insertSubject(subject: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const db = await getDatabase();
    const now = Date.now();
    const result = await db.runAsync(
      `INSERT INTO subjects (
        name, code, type, teacherName, room, colorValue, iconName,
        defaultSessionDurationMinutes, attendanceUnitMinutes, defaultAttendanceUnits,
        targetPercentage, defaultReminderMinutes, notes, isArchived, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        subject.name,
        subject.code || '',
        subject.type || 'Lecture',
        subject.teacherName || '',
        subject.room || '',
        subject.colorValue || '#6750A4',
        subject.iconName || 'Book',
        subject.defaultSessionDurationMinutes || 60,
        subject.attendanceUnitMinutes || 60,
        subject.defaultAttendanceUnits || 1,
        subject.targetPercentage || 75.0,
        subject.defaultReminderMinutes || 10,
        subject.notes || '',
        subject.isArchived ? 1 : 0,
        now,
        now,
      ]
    );
    return result.lastInsertRowId;
  }

  static async updateSubject(subject: Subject): Promise<void> {
    const db = await getDatabase();
    const now = Date.now();
    await db.runAsync(
      `UPDATE subjects SET
        name = ?, code = ?, type = ?, teacherName = ?, room = ?, colorValue = ?, iconName = ?,
        defaultSessionDurationMinutes = ?, attendanceUnitMinutes = ?, defaultAttendanceUnits = ?,
        targetPercentage = ?, defaultReminderMinutes = ?, notes = ?, isArchived = ?, updatedAt = ?
      WHERE id = ?;`,
      [
        subject.name,
        subject.code,
        subject.type,
        subject.teacherName,
        subject.room,
        subject.colorValue,
        subject.iconName,
        subject.defaultSessionDurationMinutes,
        subject.attendanceUnitMinutes,
        subject.defaultAttendanceUnits,
        subject.targetPercentage,
        subject.defaultReminderMinutes,
        subject.notes,
        subject.isArchived ? 1 : 0,
        now,
        subject.id,
      ]
    );
  }

  static async setSubjectArchived(id: number, isArchived: boolean): Promise<void> {
    const db = await getDatabase();
    const now = Date.now();
    await db.runAsync('UPDATE subjects SET isArchived = ?, updatedAt = ? WHERE id = ?;', [
      isArchived ? 1 : 0,
      now,
      id,
    ]);
  }

  static async deleteSubject(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM subjects WHERE id = ?;', [id]);
  }

  private static mapRowToSubject(row: any): Subject {
    return {
      id: row.id,
      name: row.name,
      code: row.code || '',
      type: row.type || 'Lecture',
      teacherName: row.teacherName || '',
      room: row.room || '',
      colorValue: row.colorValue || '#6750A4',
      iconName: row.iconName || 'Book',
      defaultSessionDurationMinutes: row.defaultSessionDurationMinutes || 60,
      attendanceUnitMinutes: row.attendanceUnitMinutes || 60,
      defaultAttendanceUnits: row.defaultAttendanceUnits || 1,
      targetPercentage: row.targetPercentage || 75.0,
      defaultReminderMinutes: row.defaultReminderMinutes || 10,
      notes: row.notes || '',
      isArchived: Boolean(row.isArchived),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
