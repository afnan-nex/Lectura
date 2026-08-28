export enum AttendanceStatus {
  UNMARKED = 'UNMARKED',
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  CANCELLED = 'CANCELLED',
  BUNKED = 'BUNKED',
}

export enum SubjectType {
  LECTURE = 'Lecture',
  TUTORIAL = 'Tutorial',
  PRACTICAL_LAB = 'Practical Lab',
  WORKSHOP = 'Workshop',
  SEMINAR = 'Seminar',
  OTHER = 'Other',
}

export interface Subject {
  id: number;
  name: string;
  code: string;
  type: string;
  teacherName: string;
  room: string;
  colorValue: string; // Hex color string e.g. "#1E88E5"
  iconName: string;
  defaultSessionDurationMinutes: number;
  attendanceUnitMinutes: number;
  defaultAttendanceUnits: number;
  targetPercentage: number;
  defaultReminderMinutes: number;
  notes: string;
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TimetableEntry {
  id: number;
  subjectId: number;
  dayOfWeek: number; // 1 = Monday, 7 = Sunday
  startTime: string; // "HH:mm" 24hr format
  endTime: string;   // "HH:mm" 24hr format
  roomOverride: string;
  teacherOverride: string;
  attendanceUnitCount: number;
  reminderMinutes: number;
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD"
  repeatType: string;
  notes: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AttendanceSession {
  id: number;
  subjectId: number;
  timetableEntryId: number | null;
  sessionDate: string; // "YYYY-MM-DD"
  startTime: string;   // "HH:mm"
  endTime: string;     // "HH:mm"
  expectedUnitCount: number;
  notes: string;
  isRescheduled: boolean;
  originalDate: string | null;
  originalTime: string | null;
  rescheduledToDate: string | null;
  rescheduledToTime: string | null;
  rescheduledReason: string;
  createdAt: number;
  updatedAt: number;
}

export interface AttendanceUnit {
  id: number;
  sessionId: number;
  unitIndex: number;
  status: AttendanceStatus;
  markedAt: number;
  updatedAt: number;
}

export interface Holiday {
  id: number;
  date: string; // "YYYY-MM-DD"
  title: string;
  notes: string;
}

export interface UserPreferences {
  notificationsEnabled: boolean;
  defaultTargetAttendance: number;
  defaultReminderMinutes: number;
  trackBySemester: boolean;
  semesterStartDate: string;
  semesterEndDate: string;
  firstDayOfWeek: number;
  timeFormat24Hr: boolean;
  themeMode: 'SYSTEM' | 'LIGHT' | 'DARK';
  dynamicColors: boolean;
  themeColorStyle: 'DYNAMIC' | 'DEFAULT' | 'CUSTOM';
  customThemeColor: string; // Hex seed color e.g. "#6750A4"
  onboardingCompleted: boolean;
  confirmMarkingAbsent: boolean;
  notificationSound: boolean;
  notificationVibrate: boolean;
  geminiApiKey: string;
}

export interface SessionWithUnits {
  session: AttendanceSession;
  units: AttendanceUnit[];
}

export interface TimetableWithSubject {
  entry: TimetableEntry;
  subject: Subject;
}

export interface ClassScheduleItem {
  session: AttendanceSession | null;
  timetableEntry: TimetableEntry;
  subject: Subject;
  units: AttendanceUnit[];
  isHoliday?: boolean;
  holidayTitle?: string | null;
  isRescheduledAway?: boolean;
  rescheduledToDate?: string | null;
  rescheduledToTime?: string | null;
  isRescheduledIncoming?: boolean;
  originalDate?: string | null;
  originalTime?: string | null;
  rescheduledReason?: string;
}

export interface AttendanceSummary {
  totalConductedUnits: number;
  presentUnits: number;
  absentUnits: number;
  cancelledUnits: number;
  bunkedUnits: number;
  percentage: number;
  targetPercentage: number;
  safeBunks: number;
  requiredUnitsToTarget: number;
  statusMessage: string;
}

export interface SubjectWithSummary {
  subject: Subject;
  summary: AttendanceSummary;
}

export interface ParsedTimetableItem {
  id: string;
  subjectName: string;
  subjectCode: string;
  teacherName: string;
  startTime: string;
  endTime: string;
  roomLocation: string;
  dayOfWeek: number;
  isPractical: boolean;
  attendanceUnitCount: number;
}

export interface LecturaBackup {
  version: number;
  exportedAt: number;
  subjects: Subject[];
  timetableEntries: TimetableEntry[];
  sessions: AttendanceSession[];
  units: AttendanceUnit[];
  holidays: Holiday[];
}

export interface TimetableSharePackage {
  format: string;
  exportedAt: number;
  subjects: Subject[];
  timetableEntries: TimetableEntry[];
}
