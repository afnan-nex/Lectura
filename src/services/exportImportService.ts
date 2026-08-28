import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getDatabase } from '../database/db';
import { SubjectRepository } from '../database/subjectRepository';
import { TimetableRepository } from '../database/timetableRepository';
import { AttendanceRepository } from '../database/attendanceRepository';
import { HolidayRepository } from '../database/holidayRepository';
import { AttendanceCalculator } from '../domain/calculator';
import {
  LecturaBackup,
  Subject,
  TimetableEntry,
  AttendanceSession,
  AttendanceUnit,
  Holiday,
  AttendanceStatus,
} from '../types/models';
import { DateUtils } from '../utils/dateUtils';

export class ExportImportService {
  static async exportBackupJson(): Promise<boolean> {
    try {
      const subjects = await SubjectRepository.getAllSubjects();
      const timetableEntries = await TimetableRepository.getAllTimetableEntries();
      const sessions = await AttendanceRepository.getAllSessions();
      const units = await AttendanceRepository.getAllUnits();
      const holidays = await HolidayRepository.getAllHolidays();

      const backupData: LecturaBackup = {
        version: 1,
        exportedAt: Date.now(),
        subjects,
        timetableEntries,
        sessions,
        units,
        holidays,
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const filename = `Lectura_backup_${DateUtils.todayIso()}.json`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Lectura Backup',
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  static async importBackupJson(jsonString: string): Promise<{ success: boolean; message: string }> {
    try {
      const clean = this.sanitizeJsonString(jsonString);
      const parsed: LecturaBackup = JSON.parse(clean);

      const subjects = parsed.subjects || [];
      const timetableEntries = parsed.timetableEntries || [];
      const sessions = parsed.sessions || [];
      const units = parsed.units || [];
      const holidays = parsed.holidays || [];

      if (!Array.isArray(subjects)) {
        return { success: false, message: 'Invalid backup format: subjects list missing.' };
      }

      const db = await getDatabase();
      await db.execAsync('PRAGMA foreign_keys = OFF;');

      // Clear existing
      await db.execAsync(`
        DELETE FROM attendance_units;
        DELETE FROM attendance_sessions;
        DELETE FROM timetable_entries;
        DELETE FROM holidays;
        DELETE FROM subjects;
      `);

      const now = Date.now();

      // Restore Subjects
      for (const s of subjects) {
        await db.runAsync(
          `INSERT INTO subjects (
            id, name, code, type, teacherName, room, colorValue, iconName,
            defaultSessionDurationMinutes, attendanceUnitMinutes, defaultAttendanceUnits,
            targetPercentage, defaultReminderMinutes, notes, isArchived, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            s.id,
            s.name,
            s.code || '',
            s.type || 'Lecture',
            s.teacherName || '',
            s.room || '',
            s.colorValue || '#6750A4',
            s.iconName || 'Book',
            s.defaultSessionDurationMinutes || 60,
            s.attendanceUnitMinutes || 60,
            s.defaultAttendanceUnits || 1,
            s.targetPercentage || 75.0,
            s.defaultReminderMinutes || 10,
            s.notes || '',
            s.isArchived ? 1 : 0,
            s.createdAt || now,
            s.updatedAt || now,
          ]
        );
      }

      // Restore Timetable Entries
      for (const t of timetableEntries) {
        await db.runAsync(
          `INSERT INTO timetable_entries (
            id, subjectId, dayOfWeek, startTime, endTime, roomOverride, teacherOverride,
            attendanceUnitCount, reminderMinutes, startDate, endDate, repeatType, notes,
            isActive, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            t.id,
            t.subjectId,
            t.dayOfWeek,
            t.startTime,
            t.endTime,
            t.roomOverride || '',
            t.teacherOverride || '',
            t.attendanceUnitCount || 1,
            t.reminderMinutes || 10,
            t.startDate || '',
            t.endDate || '',
            t.repeatType || 'WEEKLY',
            t.notes || '',
            t.isActive !== false ? 1 : 0,
            t.createdAt || now,
            t.updatedAt || now,
          ]
        );
      }

      // Restore Sessions
      for (const ses of sessions) {
        await db.runAsync(
          `INSERT INTO attendance_sessions (
            id, subjectId, timetableEntryId, sessionDate, startTime, endTime,
            expectedUnitCount, notes, isRescheduled, originalDate, originalTime,
            rescheduledToDate, rescheduledToTime, rescheduledReason, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            ses.id,
            ses.subjectId,
            ses.timetableEntryId,
            ses.sessionDate,
            ses.startTime,
            ses.endTime,
            ses.expectedUnitCount || 1,
            ses.notes || '',
            ses.isRescheduled ? 1 : 0,
            ses.originalDate || null,
            ses.originalTime || null,
            ses.rescheduledToDate || null,
            ses.rescheduledToTime || null,
            ses.rescheduledReason || '',
            ses.createdAt || now,
            ses.updatedAt || now,
          ]
        );
      }

      // Restore Units
      for (const u of units) {
        await db.runAsync(
          `INSERT INTO attendance_units (id, sessionId, unitIndex, status, markedAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?);`,
          [u.id, u.sessionId, u.unitIndex, u.status || 'UNMARKED', u.markedAt || now, u.updatedAt || now]
        );
      }

      // Restore Holidays
      for (const h of holidays) {
        await db.runAsync(
          `INSERT INTO holidays (id, date, title, notes) VALUES (?, ?, ?, ?);`,
          [h.id, h.date, h.title, h.notes || '']
        );
      }

      await db.execAsync('PRAGMA foreign_keys = ON;');

      return {
        success: true,
        message: `Restored ${subjects.length} subjects, ${timetableEntries.length} timetable slots, and ${sessions.length} sessions!`,
      };
    } catch (e: any) {
      return { success: false, message: `Import failed: ${e.message || 'Malformed JSON'}` };
    }
  }

  static async exportCsvReport(): Promise<boolean> {
    try {
      const subjects = await SubjectRepository.getActiveSubjects();
      const sessions = await AttendanceRepository.getAllSessions();
      const units = await AttendanceRepository.getAllUnits();

      const sessionSubjectMap = new Map<number, number>();
      sessions.forEach((s) => sessionSubjectMap.set(s.id, s.subjectId));

      let csv = 'Subject Name,Subject Code,Subject Type,Conducted Units,Present Units,Absent Units,Cancelled Units,Current Attendance %,Target %,Status\n';

      for (const sub of subjects) {
        const subUnits = units.filter((u) => sessionSubjectMap.get(u.sessionId) === sub.id);
        const statuses = subUnits.map((u) => u.status as AttendanceStatus);
        const summary = AttendanceCalculator.calculate(statuses, sub.targetPercentage);

        const row = [
          `"${sub.name.replace(/"/g, '""')}"`,
          `"${sub.code.replace(/"/g, '""')}"`,
          `"${sub.type.replace(/"/g, '""')}"`,
          summary.totalConductedUnits,
          summary.presentUnits,
          summary.absentUnits,
          summary.cancelledUnits,
          `${summary.percentage.toFixed(2)}%`,
          `${sub.targetPercentage.toFixed(1)}%`,
          `"${summary.statusMessage.replace(/"/g, '""')}"`,
        ].join(',');

        csv += `${row}\n`;
      }

      const filename = `Lectura_attendance_${DateUtils.todayIso()}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Attendance CSV Report',
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  static async loadDemoData(): Promise<void> {
    const db = await getDatabase();
    await db.execAsync('PRAGMA foreign_keys = OFF;');
    await db.execAsync(`
      DELETE FROM attendance_units;
      DELETE FROM attendance_sessions;
      DELETE FROM timetable_entries;
      DELETE FROM holidays;
      DELETE FROM subjects;
    `);
    await db.execAsync('PRAGMA foreign_keys = ON;');

    const sub1 = await SubjectRepository.insertSubject({
      name: 'Database Management Systems',
      code: 'CS301',
      type: 'Lecture',
      teacherName: 'Dr. A. Sharma',
      room: 'LH-101',
      colorValue: '#1E88E5',
      iconName: 'Storage',
      defaultSessionDurationMinutes: 60,
      attendanceUnitMinutes: 60,
      defaultAttendanceUnits: 1,
      targetPercentage: 75.0,
      defaultReminderMinutes: 10,
      notes: 'Covers Relational Algebra, SQL, Indexing & Transactions',
      isArchived: false,
    });

    const sub2 = await SubjectRepository.insertSubject({
      name: 'Operating Systems',
      code: 'CS302',
      type: 'Lecture',
      teacherName: 'Prof. R. Verma',
      room: 'LH-102',
      colorValue: '#00897B',
      iconName: 'Computer',
      defaultSessionDurationMinutes: 60,
      attendanceUnitMinutes: 60,
      defaultAttendanceUnits: 1,
      targetPercentage: 75.0,
      defaultReminderMinutes: 10,
      notes: 'Concurrency, Memory Virtualization, File Systems',
      isArchived: false,
    });

    const sub3 = await SubjectRepository.insertSubject({
      name: 'Design & Analysis of Algorithms',
      code: 'CS303',
      type: 'Lecture',
      teacherName: 'Dr. K. Patel',
      room: 'LH-103',
      colorValue: '#8E24AA',
      iconName: 'Functions',
      defaultSessionDurationMinutes: 60,
      attendanceUnitMinutes: 60,
      defaultAttendanceUnits: 1,
      targetPercentage: 75.0,
      defaultReminderMinutes: 10,
      notes: 'Dynamic Programming, Graph Theory, Complexity',
      isArchived: false,
    });

    const sub4 = await SubjectRepository.insertSubject({
      name: 'DBMS Practical Lab',
      code: 'CS301P',
      type: 'Practical Lab',
      teacherName: 'Prof. S. Gupta',
      room: 'Lab-3',
      colorValue: '#E53935',
      iconName: 'Science',
      defaultSessionDurationMinutes: 120,
      attendanceUnitMinutes: 120,
      defaultAttendanceUnits: 1,
      targetPercentage: 75.0,
      defaultReminderMinutes: 10,
      notes: 'PostgreSQL, Query Optimization, Triggers',
      isArchived: false,
    });

    // Timetable Entries
    // Monday (1)
    await TimetableRepository.insertTimetableEntry({
      subjectId: sub1,
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '10:00',
      roomOverride: '',
      teacherOverride: '',
      attendanceUnitCount: 1,
      reminderMinutes: 10,
      startDate: '',
      endDate: '',
      repeatType: 'WEEKLY',
      notes: '',
      isActive: true,
    });
    await TimetableRepository.insertTimetableEntry({
      subjectId: sub2,
      dayOfWeek: 1,
      startTime: '10:00',
      endTime: '11:00',
      roomOverride: '',
      teacherOverride: '',
      attendanceUnitCount: 1,
      reminderMinutes: 10,
      startDate: '',
      endDate: '',
      repeatType: 'WEEKLY',
      notes: '',
      isActive: true,
    });
    await TimetableRepository.insertTimetableEntry({
      subjectId: sub4,
      dayOfWeek: 1,
      startTime: '14:00',
      endTime: '16:00',
      roomOverride: '',
      teacherOverride: '',
      attendanceUnitCount: 1,
      reminderMinutes: 15,
      startDate: '',
      endDate: '',
      repeatType: 'WEEKLY',
      notes: '',
      isActive: true,
    });

    // Tuesday (2)
    await TimetableRepository.insertTimetableEntry({
      subjectId: sub3,
      dayOfWeek: 2,
      startTime: '09:00',
      endTime: '10:00',
      roomOverride: '',
      teacherOverride: '',
      attendanceUnitCount: 1,
      reminderMinutes: 10,
      startDate: '',
      endDate: '',
      repeatType: 'WEEKLY',
      notes: '',
      isActive: true,
    });
    await TimetableRepository.insertTimetableEntry({
      subjectId: sub1,
      dayOfWeek: 2,
      startTime: '11:00',
      endTime: '12:00',
      roomOverride: '',
      teacherOverride: '',
      attendanceUnitCount: 1,
      reminderMinutes: 10,
      startDate: '',
      endDate: '',
      repeatType: 'WEEKLY',
      notes: '',
      isActive: true,
    });

    // Wednesday (3)
    await TimetableRepository.insertTimetableEntry({
      subjectId: sub2,
      dayOfWeek: 3,
      startTime: '10:00',
      endTime: '11:00',
      roomOverride: '',
      teacherOverride: '',
      attendanceUnitCount: 1,
      reminderMinutes: 10,
      startDate: '',
      endDate: '',
      repeatType: 'WEEKLY',
      notes: '',
      isActive: true,
    });
    await TimetableRepository.insertTimetableEntry({
      subjectId: sub3,
      dayOfWeek: 3,
      startTime: '11:00',
      endTime: '12:00',
      roomOverride: '',
      teacherOverride: '',
      attendanceUnitCount: 1,
      reminderMinutes: 10,
      startDate: '',
      endDate: '',
      repeatType: 'WEEKLY',
      notes: '',
      isActive: true,
    });

    // Thursday (4)
    await TimetableRepository.insertTimetableEntry({
      subjectId: sub1,
      dayOfWeek: 4,
      startTime: '09:00',
      endTime: '10:00',
      roomOverride: '',
      teacherOverride: '',
      attendanceUnitCount: 1,
      reminderMinutes: 10,
      startDate: '',
      endDate: '',
      repeatType: 'WEEKLY',
      notes: '',
      isActive: true,
    });
    await TimetableRepository.insertTimetableEntry({
      subjectId: sub2,
      dayOfWeek: 4,
      startTime: '10:00',
      endTime: '11:00',
      roomOverride: '',
      teacherOverride: '',
      attendanceUnitCount: 1,
      reminderMinutes: 10,
      startDate: '',
      endDate: '',
      repeatType: 'WEEKLY',
      notes: '',
      isActive: true,
    });

    // Friday (5)
    await TimetableRepository.insertTimetableEntry({
      subjectId: sub3,
      dayOfWeek: 5,
      startTime: '10:00',
      endTime: '11:00',
      roomOverride: '',
      teacherOverride: '',
      attendanceUnitCount: 1,
      reminderMinutes: 10,
      startDate: '',
      endDate: '',
      repeatType: 'WEEKLY',
      notes: '',
      isActive: true,
    });

    // Pre-populate some historical attendance
    await AttendanceRepository.markPastAttendanceForSubject(sub1, 14);
    await AttendanceRepository.markPastAttendanceForSubject(sub2, 12);
    await AttendanceRepository.markPastAttendanceForSubject(sub3, 10);
    await AttendanceRepository.markPastAttendanceForSubject(sub4, 6);
  }

  static async clearAllData(): Promise<void> {
    const db = await getDatabase();
    await db.execAsync('PRAGMA foreign_keys = OFF;');
    await db.execAsync(`
      DELETE FROM attendance_units;
      DELETE FROM attendance_sessions;
      DELETE FROM timetable_entries;
      DELETE FROM holidays;
      DELETE FROM subjects;
    `);
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }

  private static sanitizeJsonString(jsonStr: string): string {
    let clean = jsonStr.trim();
    // Strip BOM
    if (clean.charCodeAt(0) === 0xfeff) {
      clean = clean.substring(1);
    }
    return clean;
  }
}
