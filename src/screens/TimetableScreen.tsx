import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Surface, Text, Button, IconButton, Card, FAB, Chip } from 'react-native-paper';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLecturaTheme } from '../theme/themeContext';
import { TimetableRepository } from '../database/timetableRepository';
import { SubjectRepository } from '../database/subjectRepository';
import { PreferencesRepository } from '../database/preferencesRepository';
import { TimetableOcrModal } from '../components/TimetableOcrModal';
import { AddEditTimetableModal } from '../components/AddEditTimetableModal';
import { CopyDayScheduleModal } from '../components/CopyDayScheduleModal';
import {
  Subject,
  TimetableEntry,
  TimetableWithSubject,
  ParsedTimetableItem,
  UserPreferences,
} from '../types/models';
import { DateUtils } from '../utils/dateUtils';

export const TimetableScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useLecturaTheme();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [selectedDay, setSelectedDay] = useState<number>(DateUtils.getDayOfWeek(new Date()));
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [entriesForDay, setEntriesForDay] = useState<TimetableWithSubject[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<TimetableEntry | null>(null);

  const loadData = useCallback(async () => {
    try {
      const userPrefs = await PreferencesRepository.getPreferences();
      setPrefs(userPrefs);

      const allSubjects = await SubjectRepository.getActiveSubjects();
      setSubjects(allSubjects);
      const subjectMap = new Map<number, Subject>();
      allSubjects.forEach((s) => subjectMap.set(s.id, s));

      const dayEntries = await TimetableRepository.getTimetableEntriesForDay(selectedDay);
      const withSubjects: TimetableWithSubject[] = [];

      for (const entry of dayEntries) {
        const subject = subjectMap.get(entry.subjectId);
        if (subject) {
          withSubjects.push({ entry, subject });
        }
      }

      withSubjects.sort((a, b) => a.entry.startTime.localeCompare(b.entry.startTime));
      setEntriesForDay(withSubjects);
    } catch {
      // Ignore
    }
  }, [selectedDay]);

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

  const handleSaveEntry = async (
    entryData: Omit<TimetableEntry, 'id' | 'createdAt' | 'updatedAt'>,
    id?: number,
    updateFutureOnly?: boolean
  ) => {
    if (id) {
      if (updateFutureOnly) {
        await TimetableRepository.updateTimetableEntryFromDate(id, {
          ...entryData,
          id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      } else {
        await TimetableRepository.updateTimetableEntry({
          ...entryData,
          id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    } else {
      await TimetableRepository.insertTimetableEntry(entryData);
    }
    loadData();
  };

  const handleDeleteEntry = async (id: number) => {
    await TimetableRepository.deleteTimetableEntry(id);
    loadData();
  };

  const handleConfirmCopy = async (targetDays: number[]) => {
    await TimetableRepository.copyDayEntriesToOtherDays(selectedDay, targetDays);
    loadData();
  };

  const handleConfirmOcrImport = async (
    items: ParsedTimetableItem[],
    replaceExisting: boolean
  ) => {
    if (replaceExisting) {
      const allEntries = await TimetableRepository.getAllActiveTimetableEntries();
      for (const e of allEntries) {
        await TimetableRepository.deleteTimetableEntry(e.id);
      }
    }

    const currentSubjects = await SubjectRepository.getAllSubjects();
    const subNameMap = new Map<string, number>();
    currentSubjects.forEach((s) => subNameMap.set(s.name.toLowerCase().trim(), s.id));

    for (const item of items) {
      const cleanName = item.subjectName.trim();
      let subjectId = subNameMap.get(cleanName.toLowerCase());

      if (!subjectId) {
        subjectId = await SubjectRepository.insertSubject({
          name: cleanName,
          code: item.subjectCode,
          type: item.isPractical ? 'Practical Lab' : 'Lecture',
          teacherName: item.teacherName,
          room: item.roomLocation,
          colorValue: '#6750A4',
          iconName: 'Book',
          defaultSessionDurationMinutes: item.isPractical ? 120 : 60,
          attendanceUnitMinutes: item.isPractical ? 120 : 60,
          defaultAttendanceUnits: item.attendanceUnitCount,
          targetPercentage: 75.0,
          defaultReminderMinutes: 10,
          notes: 'Auto-extracted from Timetable OCR',
          isArchived: false,
        });
        subNameMap.set(cleanName.toLowerCase(), subjectId);
      }

      await TimetableRepository.insertTimetableEntry({
        subjectId,
        dayOfWeek: item.dayOfWeek,
        startTime: item.startTime,
        endTime: item.endTime,
        roomOverride: item.roomLocation,
        teacherOverride: item.teacherName,
        attendanceUnitCount: item.attendanceUnitCount,
        reminderMinutes: 10,
        startDate: '',
        endDate: '',
        repeatType: 'WEEKLY',
        notes: '',
        isActive: true,
      });
    }

    loadData();
  };

  const weekdays = [
    { day: 1, name: 'Monday', short: 'Mon' },
    { day: 2, name: 'Tuesday', short: 'Tue' },
    { day: 3, name: 'Wednesday', short: 'Wed' },
    { day: 4, name: 'Thursday', short: 'Thu' },
    { day: 5, name: 'Friday', short: 'Fri' },
    { day: 6, name: 'Saturday', short: 'Sat' },
    { day: 7, name: 'Sunday', short: 'Sun' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Bar Actions */}
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
          <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
            Weekly Timetable
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Button
              mode="contained-tonal"
              icon="camera"
              onPress={() => setShowOcrModal(true)}
              compact
              style={{ height: 34, borderRadius: 17, justifyContent: 'center' }}
              contentStyle={{ height: 34, paddingHorizontal: 6 }}
              labelStyle={{ fontSize: 12, marginHorizontal: 4 }}
            >
              Scan OCR
            </Button>
            <IconButton
              icon="content-copy"
              size={20}
              style={{ margin: 0 }}
              onPress={() => setShowCopyModal(true)}
            />
          </View>
        </View>

        {/* Day Selector Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daysScroll}
        >
          {weekdays.map((w) => {
            const isSelected = selectedDay === w.day;
            return (
              <Chip
                key={w.day}
                selected={isSelected}
                showSelectedCheck={false}
                onPress={() => setSelectedDay(w.day)}
                style={[
                  styles.dayChip,
                  {
                    backgroundColor: isSelected
                      ? theme.colors.primary
                      : theme.colors.surfaceVariant,
                  },
                ]}
                textStyle={{
                  color: isSelected ? theme.colors.onPrimary : theme.colors.onSurface,
                  fontWeight: 'bold',
                }}
              >
                {w.short}
              </Chip>
            );
          })}
        </ScrollView>
      </Surface>

      {/* Slots List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
      >
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
            {DateUtils.getDayName(selectedDay)}'s Classes ({entriesForDay.length})
          </Text>
          <Button
            mode="text"
            icon="plus"
            compact
            onPress={() => {
              setEntryToEdit(null);
              setShowAddEditModal(true);
            }}
          >
            Add Class
          </Button>
        </View>

        {entriesForDay.length === 0 ? (
          <Surface style={[styles.emptyCard, { backgroundColor: theme.colors.elevation.level1 }]}>
            <MaterialIcons name="event-busy" size={48} color={theme.colors.onSurfaceVariant} />
            <Text variant="titleMedium" style={{ fontWeight: 'bold', marginTop: 12, color: theme.colors.onSurface }}>
              No classes on {DateUtils.getDayName(selectedDay)}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 }}>
              Tap "Add Class" or "Scan OCR" above to build your schedule.
            </Text>
          </Surface>
        ) : (
          entriesForDay.map((item) => {
            const { entry, subject } = item;
            const location = entry.roomOverride || subject.room;
            const teacher = entry.teacherOverride || subject.teacherName;
            const details = [location, teacher].filter(Boolean).join(' • ');

            return (
              <Card
                key={entry.id}
                style={[
                  styles.slotCard,
                  {
                    backgroundColor: theme.colors.elevation.level1,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
                mode="outlined"
              >
                <Card.Content style={styles.cardContent}>
                  <View style={styles.cardMain}>
                    <View
                      style={[
                        styles.colorAccent,
                        { backgroundColor: subject.colorValue || theme.colors.primary },
                      ]}
                    />

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                          {subject.name}
                        </Text>
                        <Surface style={[styles.typeBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
                          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {subject.type}
                          </Text>
                        </Surface>
                      </View>

                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                        {DateUtils.formatTimeRange(entry.startTime, entry.endTime)}
                        {details ? ` • ${details}` : ''}
                      </Text>
                    </View>

                    <Surface style={[styles.unitsBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                      <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer, fontWeight: 'bold' }}>
                        {entry.attendanceUnitCount} Unit{entry.attendanceUnitCount > 1 ? 's' : ''}
                      </Text>
                    </Surface>
                  </View>

                  <View style={styles.cardActions}>
                    <IconButton
                      icon="pencil-outline"
                      size={20}
                      onPress={() => {
                        setEntryToEdit(entry);
                        setShowAddEditModal(true);
                      }}
                    />
                    <IconButton
                      icon="delete-outline"
                      size={20}
                      iconColor={theme.colors.error}
                      onPress={() => handleDeleteEntry(entry.id)}
                    />
                  </View>
                </Card.Content>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        visible={isFocused}
        onPress={() => {
          setEntryToEdit(null);
          setShowAddEditModal(true);
        }}
      />

      {/* Modals */}
      <TimetableOcrModal
        visible={showOcrModal}
        geminiApiKey={prefs?.geminiApiKey}
        onDismiss={() => setShowOcrModal(false)}
        onConfirmImport={handleConfirmOcrImport}
      />

      <AddEditTimetableModal
        visible={showAddEditModal}
        subjects={subjects}
        initialDay={selectedDay}
        entryToEdit={entryToEdit}
        onDismiss={() => setShowAddEditModal(false)}
        onSave={handleSaveEntry}
      />

      <CopyDayScheduleModal
        visible={showCopyModal}
        sourceDay={selectedDay}
        onDismiss={() => setShowCopyModal(false)}
        onConfirmCopy={handleConfirmCopy}
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
  daysScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 4,
  },
  dayChip: {
    height: 36,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 6,
  },
  slotCard: {
    borderRadius: 18,
    marginHorizontal: 16,
    marginVertical: 6,
  },
  cardContent: {
    padding: 12,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorAccent: {
    width: 6,
    height: 44,
    borderRadius: 3,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unitsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  emptyCard: {
    margin: 20,
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
  },
});
