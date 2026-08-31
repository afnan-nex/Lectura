import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Surface, Text, FAB, Portal, Modal, IconButton, Button, Dialog } from 'react-native-paper';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLecturaTheme } from '../theme/themeContext';
import { AttendanceProgressCard } from '../components/AttendanceProgressCard';
import { DateStrip } from '../components/DateStrip';
import { CalendarModal } from '../components/CalendarModal';
import { ClassCard } from '../components/ClassCard';
import { EditUnitBottomSheet } from '../components/EditUnitBottomSheet';
import { AddExtraClassModal } from '../components/AddExtraClassModal';
import { RescheduleClassModal } from '../components/RescheduleClassModal';
import { AddEditSubjectModal } from '../components/AddEditSubjectModal';
import { AddEditTimetableModal } from '../components/AddEditTimetableModal';
import { SubjectRepository } from '../database/subjectRepository';
import { TimetableRepository } from '../database/timetableRepository';
import { AttendanceRepository } from '../database/attendanceRepository';
import { HolidayRepository } from '../database/holidayRepository';
import { PreferencesRepository } from '../database/preferencesRepository';
import { AttendanceCalculator } from '../domain/calculator';
import {
  Subject,
  TimetableEntry,
  AttendanceSession,
  AttendanceUnit,
  AttendanceStatus,
  ClassScheduleItem,
  AttendanceSummary,
  UserPreferences,
} from '../types/models';
import { DateUtils } from '../utils/dateUtils';

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useLecturaTheme();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [selectedDate, setSelectedDate] = useState<string>(DateUtils.todayIso());
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ClassScheduleItem[]>([]);
  const [overallSummary, setOverallSummary] = useState<AttendanceSummary>(
    AttendanceCalculator.calculate([])
  );
  const [refreshing, setRefreshing] = useState(false);

  // Speed Dial FAB state
  const [fabOpen, setFabOpen] = useState(false);

  // Modals state
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [activeUnit, setActiveUnit] = useState<AttendanceUnit | null>(null);
  const [showAddExtraModal, setShowAddExtraModal] = useState(false);
  const [rescheduleTargetItem, setRescheduleTargetItem] = useState<ClassScheduleItem | null>(null);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [showAddTimetableModal, setShowAddTimetableModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const userPrefs = await PreferencesRepository.getPreferences();
      setPrefs(userPrefs);

      const allSubjects = await SubjectRepository.getActiveSubjects();
      setSubjects(allSubjects);

      const subjectMap = new Map<number, Subject>();
      allSubjects.forEach((s) => subjectMap.set(s.id, s));

      // Calculate overall summary across all units
      const allSessions = await AttendanceRepository.getAllSessions();
      const allUnits = await AttendanceRepository.getAllUnits();

      let validSessions = allSessions;
      if (userPrefs.trackBySemester && (userPrefs.semesterStartDate || userPrefs.semesterEndDate)) {
        validSessions = allSessions.filter((s) =>
          DateUtils.isDateInRange(s.sessionDate, userPrefs.semesterStartDate, userPrefs.semesterEndDate)
        );
      }
      const validSessionIds = new Set(validSessions.map((s) => s.id));
      const validUnits = allUnits.filter((u) => validSessionIds.has(u.sessionId));
      const allStatuses = validUnits.map((u) => u.status as AttendanceStatus);

      setOverallSummary(
        AttendanceCalculator.calculate(allStatuses, userPrefs.defaultTargetAttendance)
      );

      // Load schedule for selectedDate
      const dayOfWeek = DateUtils.getDayOfWeekFromIso(selectedDate);
      const timetableForDay = await TimetableRepository.getTimetableEntriesForDay(dayOfWeek);
      const existingSessions = await AttendanceRepository.getSessionsForDate(selectedDate);
      const sessionMap = new Map<number, { session: AttendanceSession; units: AttendanceUnit[] }>();
      existingSessions.forEach((swu) => {
        if (swu.session.timetableEntryId) {
          sessionMap.set(swu.session.timetableEntryId, swu);
        }
      });

      const holiday = await HolidayRepository.getHolidayByDate(selectedDate);
      const items: ClassScheduleItem[] = [];

      for (const entry of timetableForDay) {
        const subject = subjectMap.get(entry.subjectId);
        if (!subject) continue;

        let sessionWithUnits = sessionMap.get(entry.id);
        if (!sessionWithUnits) {
          sessionWithUnits = await AttendanceRepository.getOrCreateSession(
            subject.id,
            entry.id,
            selectedDate,
            entry.startTime,
            entry.endTime,
            entry.attendanceUnitCount
          );
        }

        const isRescheduledAway = Boolean(sessionWithUnits.session.rescheduledToDate);

        items.push({
          session: sessionWithUnits.session,
          timetableEntry: entry,
          subject,
          units: sessionWithUnits.units,
          isHoliday: Boolean(holiday),
          holidayTitle: holiday?.title || null,
          isRescheduledAway,
          rescheduledToDate: sessionWithUnits.session.rescheduledToDate,
          rescheduledToTime: sessionWithUnits.session.rescheduledToTime,
          isRescheduledIncoming: sessionWithUnits.session.isRescheduled,
          originalDate: sessionWithUnits.session.originalDate,
          originalTime: sessionWithUnits.session.originalTime,
          rescheduledReason: sessionWithUnits.session.rescheduledReason,
        });
      }

      // Also include standalone extra classes or incoming rescheduled sessions for this date
      for (const swu of existingSessions) {
        if (!swu.session.timetableEntryId) {
          const subject = subjectMap.get(swu.session.subjectId);
          if (!subject) continue;

          items.push({
            session: swu.session,
            timetableEntry: {
              id: 0,
              subjectId: subject.id,
              dayOfWeek,
              startTime: swu.session.startTime,
              endTime: swu.session.endTime,
              roomOverride: '',
              teacherOverride: '',
              attendanceUnitCount: swu.session.expectedUnitCount,
              reminderMinutes: 10,
              startDate: '',
              endDate: '',
              repeatType: 'ONCE',
              notes: swu.session.notes,
              isActive: true,
              createdAt: swu.session.createdAt,
              updatedAt: swu.session.updatedAt,
            },
            subject,
            units: swu.units,
            isHoliday: Boolean(holiday),
            holidayTitle: holiday?.title || null,
            isRescheduledIncoming: swu.session.isRescheduled,
            originalDate: swu.session.originalDate,
            originalTime: swu.session.originalTime,
            rescheduledReason: swu.session.rescheduledReason,
          });
        }
      }

      items.sort((a, b) => a.timetableEntry.startTime.localeCompare(b.timetableEntry.startTime));
      setScheduleItems(items);
    } catch {
      // Handle error
    }
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleMarkSession = async (item: ClassScheduleItem, status: AttendanceStatus) => {
    if (!item.session?.id) return;
    await AttendanceRepository.markCompleteSessionStatus(item.session.id, status);
    loadData();
  };

  const handleResetSession = async (item: ClassScheduleItem) => {
    if (!item.session?.id) return;
    await AttendanceRepository.resetSessionAttendance(item.session.id);
    loadData();
  };

  const handleUpdateUnit = async (status: AttendanceStatus) => {
    if (!activeUnit) return;
    await AttendanceRepository.updateUnitStatus(activeUnit.id, status);
    setActiveUnit(null);
    loadData();
  };

  const handleConfirmReschedule = async (
    sessionId: number,
    newDate: string,
    newStartTime: string,
    newEndTime: string,
    reason: string
  ) => {
    await AttendanceRepository.rescheduleSession(sessionId, newDate, newStartTime, newEndTime, reason);
    loadData();
  };

  const handleRevertReschedule = async (item: ClassScheduleItem) => {
    if (!item.session?.id) return;
    await AttendanceRepository.revertRescheduledSession(item.session.id);
    loadData();
  };

  const handleAddExtraClass = async (
    subjectId: number,
    date: string,
    startTime: string,
    endTime: string,
    unitCount: number,
    notes: string
  ) => {
    await AttendanceRepository.addExtraClass(subjectId, date, startTime, endTime, unitCount, notes);
    loadData();
  };

  const handleSaveSubject = async (
    subjectData: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    await SubjectRepository.insertSubject(subjectData);
    loadData();
  };

  const handleSaveTimetable = async (
    entryData: Omit<TimetableEntry, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    await TimetableRepository.insertTimetableEntry(entryData);
    loadData();
  };

  const isSemesterActive = prefs?.trackBySemester
    ? DateUtils.isDateInRange(selectedDate, prefs.semesterStartDate, prefs.semesterEndDate)
    : true;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Header Greeting */}
      <Surface
        style={[
          styles.headerSurface,
          {
            backgroundColor: theme.colors.surface,
            paddingTop: insets.top + 8,
          },
        ]}
        elevation={1}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
              {DateUtils.getGreeting()}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {DateUtils.formatDateHuman(selectedDate)}
            </Text>
          </View>

          <IconButton
            icon="calendar-month-outline"
            size={26}
            iconColor={theme.colors.primary}
            onPress={() => setShowCalendarModal(true)}
          />
        </View>

        {/* Non-shifting, Free-scrolling Date Strip */}
        <DateStrip
          selectedDate={selectedDate}
          onSelectDate={(dIso) => setSelectedDate(dIso)}
        />
      </Surface>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Semester Notice */}
        {!isSemesterActive && (
          <Surface style={[styles.noticeBanner, { backgroundColor: theme.colors.errorContainer }]}>
            <MaterialIcons name="info" size={18} color={theme.colors.onErrorContainer} />
            <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer, flex: 1, fontWeight: 'bold' }}>
              Selected date is outside semester limits ({prefs?.semesterStartDate} to {prefs?.semesterEndDate}).
            </Text>
          </Surface>
        )}

        {/* Overall Attendance Bento Gauge */}
        <AttendanceProgressCard summary={overallSummary} targetPercentage={prefs?.defaultTargetAttendance} />

        {/* Schedule List */}
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
            Classes on {DateUtils.getDayName(DateUtils.getDayOfWeekFromIso(selectedDate))}
          </Text>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {scheduleItems.length} class{scheduleItems.length !== 1 ? 'es' : ''}
          </Text>
        </View>

        {scheduleItems.length === 0 ? (
          <Surface style={[styles.emptyCard, { backgroundColor: theme.colors.elevation.level1 }]}>
            <MaterialIcons name="event-available" size={48} color={theme.colors.onSurfaceVariant} />
            <Text variant="titleMedium" style={{ fontWeight: 'bold', marginTop: 12, color: theme.colors.onSurface }}>
              No classes scheduled for today
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 }}>
              Enjoy your free time or use the + button below to add an extra class.
            </Text>
          </Surface>
        ) : (
          scheduleItems.map((item, idx) => (
            <ClassCard
              key={`${item.timetableEntry.id}_${item.session?.id || idx}`}
              item={item}
              onMarkSession={(status) => handleMarkSession(item, status)}
              onResetSession={() => handleResetSession(item)}
              onEditUnit={(unit) => setActiveUnit(unit)}
              onReschedule={() => setRescheduleTargetItem(item)}
              onRevertReschedule={() => handleRevertReschedule(item)}
            />
          ))
        )}
      </ScrollView>

      {/* Speed Dial Floating Action Button */}
      <Portal>
        <FAB.Group
          open={fabOpen}
          visible={isFocused}
          icon={fabOpen ? 'close' : 'plus'}
          style={{ paddingBottom: 70 + insets.bottom, paddingRight: 6 }}
          actions={[
            {
              icon: 'school',
              label: 'Add Subject',
              onPress: () => setShowAddSubjectModal(true),
            },
            {
              icon: 'calendar-month',
              label: 'Add Timetable Slot',
              onPress: () => setShowAddTimetableModal(true),
            },
            {
              icon: 'plus-circle-outline',
              label: 'Add Extra Class',
              onPress: () => setShowAddExtraModal(true),
            },
          ]}
          onStateChange={({ open }) => setFabOpen(open)}
        />
      </Portal>

      {/* Modals */}
      <EditUnitBottomSheet
        visible={activeUnit !== null}
        unit={activeUnit}
        onDismiss={() => setActiveUnit(null)}
        onSelectStatus={handleUpdateUnit}
      />

      <AddExtraClassModal
        visible={showAddExtraModal}
        subjects={subjects}
        initialDate={selectedDate}
        onDismiss={() => setShowAddExtraModal(false)}
        onSave={handleAddExtraClass}
      />

      <RescheduleClassModal
        visible={rescheduleTargetItem !== null}
        item={rescheduleTargetItem}
        onDismiss={() => setRescheduleTargetItem(null)}
        onConfirmReschedule={handleConfirmReschedule}
      />

      <AddEditSubjectModal
        visible={showAddSubjectModal}
        subjectToEdit={null}
        onDismiss={() => setShowAddSubjectModal(false)}
        onSave={handleSaveSubject}
      />

      <AddEditTimetableModal
        visible={showAddTimetableModal}
        subjects={subjects}
        initialDay={DateUtils.getDayOfWeekFromIso(selectedDate)}
        entryToEdit={null}
        onDismiss={() => setShowAddTimetableModal(false)}
        onSave={handleSaveTimetable}
      />

      {/* Calendar Date Picker Modal */}
      <CalendarModal
        visible={showCalendarModal}
        selectedDate={selectedDate}
        onApply={(dIso) => {
          setSelectedDate(dIso);
          setShowCalendarModal(false);
        }}
        onCancel={() => setShowCalendarModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSurface: {
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  ribbonScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 4,
  },
  datePill: {
    width: 50,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyCard: {
    margin: 20,
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
