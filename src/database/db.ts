import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await SQLite.openDatabaseAsync('lectura.db');
  await dbInstance.execAsync('PRAGMA foreign_keys = ON;');

  await dbInstance.execAsync(`
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT DEFAULT '',
      type TEXT DEFAULT 'Lecture',
      teacherName TEXT DEFAULT '',
      room TEXT DEFAULT '',
      colorValue TEXT DEFAULT '#6750A4',
      iconName TEXT DEFAULT 'Book',
      defaultSessionDurationMinutes INTEGER DEFAULT 60,
      attendanceUnitMinutes INTEGER DEFAULT 60,
      defaultAttendanceUnits INTEGER DEFAULT 1,
      targetPercentage REAL DEFAULT 75.0,
      defaultReminderMinutes INTEGER DEFAULT 10,
      notes TEXT DEFAULT '',
      isArchived INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS timetable_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subjectId INTEGER NOT NULL,
      dayOfWeek INTEGER NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      roomOverride TEXT DEFAULT '',
      teacherOverride TEXT DEFAULT '',
      attendanceUnitCount INTEGER DEFAULT 1,
      reminderMinutes INTEGER DEFAULT 10,
      startDate TEXT DEFAULT '',
      endDate TEXT DEFAULT '',
      repeatType TEXT DEFAULT 'WEEKLY',
      notes TEXT DEFAULT '',
      isActive INTEGER DEFAULT 1,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY(subjectId) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subjectId INTEGER NOT NULL,
      timetableEntryId INTEGER,
      sessionDate TEXT NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      expectedUnitCount INTEGER DEFAULT 1,
      notes TEXT DEFAULT '',
      isRescheduled INTEGER DEFAULT 0,
      originalDate TEXT,
      originalTime TEXT,
      rescheduledToDate TEXT,
      rescheduledToTime TEXT,
      rescheduledReason TEXT DEFAULT '',
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY(subjectId) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY(timetableEntryId) REFERENCES timetable_entries(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS attendance_units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionId INTEGER NOT NULL,
      unitIndex INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'UNMARKED',
      markedAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY(sessionId) REFERENCES attendance_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      notes TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_subject_date ON attendance_sessions(subjectId, sessionDate);
    CREATE INDEX IF NOT EXISTS idx_sessions_timetable_date ON attendance_sessions(timetableEntryId, sessionDate);
    CREATE INDEX IF NOT EXISTS idx_units_session ON attendance_units(sessionId);
    CREATE INDEX IF NOT EXISTS idx_timetable_subject_day ON timetable_entries(subjectId, dayOfWeek);
  `);

  return dbInstance;
}
