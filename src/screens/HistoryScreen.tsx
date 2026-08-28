import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Surface, Text, Chip, Card, IconButton } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLecturaTheme } from '../theme/themeContext';
import { SubjectRepository } from '../database/subjectRepository';
import { AttendanceRepository } from '../database/attendanceRepository';
import { EditUnitBottomSheet } from '../components/EditUnitBottomSheet';
import {
  Subject,
  AttendanceSession,
  AttendanceUnit,
  AttendanceStatus,
} from '../types/models';
import { DateUtils } from '../utils/dateUtils';

interface HistoryRecord {
  session: AttendanceSession;
  subject: Subject;
  units: AttendanceUnit[];
}

export const HistoryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useLecturaTheme();
  const insets = useSafeAreaInsets();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [activeUnit, setActiveUnit] = useState<AttendanceUnit | null>(null);

  const loadData = useCallback(async () => {
    try {
      const allSubjects = await SubjectRepository.getAllSubjects();
      setSubjects(allSubjects);
      const subjectMap = new Map<number, Subject>();
      allSubjects.forEach((s) => subjectMap.set(s.id, s));

      const allSessions = await AttendanceRepository.getAllSessions();
      const allUnits = await AttendanceRepository.getAllUnits();

      const records: HistoryRecord[] = [];
      for (const session of allSessions) {
        if (selectedSubjectId && session.subjectId !== selectedSubjectId) continue;
        const subject = subjectMap.get(session.subjectId);
        if (!subject) continue;

        const sessionUnits = allUnits.filter((u) => u.sessionId === session.id);
        if (statusFilter && !sessionUnits.some((u) => u.status === statusFilter)) {
          continue;
        }

        records.push({ session, subject, units: sessionUnits });
      }

      records.sort((a, b) => b.session.sessionDate.localeCompare(a.session.sessionDate));
      setHistoryRecords(records);
    } catch {
      // Ignore
    }
  }, [selectedSubjectId, statusFilter]);

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

  const handleUpdateUnit = async (status: AttendanceStatus) => {
    if (!activeUnit) return;
    await AttendanceRepository.updateUnitStatus(activeUnit.id, status);
    setActiveUnit(null);
    loadData();
  };

  const handleDeleteSession = async (sessionId: number) => {
    await AttendanceRepository.deleteSession(sessionId);
    loadData();
  };

  const statuses = [
    { label: 'All Statuses', value: null },
    { label: 'Present', value: AttendanceStatus.PRESENT },
    { label: 'Absent', value: AttendanceStatus.ABSENT },
    { label: 'Bunked', value: AttendanceStatus.BUNKED },
    { label: 'Cancelled', value: AttendanceStatus.CANCELLED },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Header */}
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
        <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.onSurface, paddingHorizontal: 20 }}>
          Attendance Logs
        </Text>

        {/* Subject Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <Chip
            selected={selectedSubjectId === null}
            onPress={() => setSelectedSubjectId(null)}
            style={styles.chip}
          >
            All Courses
          </Chip>
          {subjects.map((sub) => (
            <Chip
              key={sub.id}
              selected={selectedSubjectId === sub.id}
              onPress={() => setSelectedSubjectId(sub.id)}
              style={styles.chip}
            >
              {sub.name}
            </Chip>
          ))}
        </ScrollView>

        {/* Status Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {statuses.map((s) => (
            <Chip
              key={s.label}
              selected={statusFilter === s.value}
              onPress={() => setStatusFilter(s.value)}
              style={styles.chip}
            >
              {s.label}
            </Chip>
          ))}
        </ScrollView>
      </Surface>

      {/* History Records List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
      >
        {historyRecords.length === 0 ? (
          <Surface style={[styles.emptyCard, { backgroundColor: theme.colors.elevation.level1 }]}>
            <MaterialIcons name="history" size={48} color={theme.colors.onSurfaceVariant} />
            <Text variant="titleMedium" style={{ fontWeight: 'bold', marginTop: 12, color: theme.colors.onSurface }}>
              No attendance logs found
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 }}>
              Try clearing filters or marking classes from the Home dashboard.
            </Text>
          </Surface>
        ) : (
          historyRecords.map(({ session, subject, units }) => (
            <Card
              key={session.id}
              style={[
                styles.recordCard,
                {
                  backgroundColor: theme.colors.elevation.level1,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
              mode="outlined"
            >
              <Card.Content style={styles.cardContent}>
                <View style={styles.recordHeader}>
                  <View style={[styles.colorBar, { backgroundColor: subject.colorValue || theme.colors.primary }]} />
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                      {subject.name}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {DateUtils.formatDateHuman(session.sessionDate)} • {DateUtils.formatTimeRange(session.startTime, session.endTime)}
                    </Text>
                  </View>
                  <IconButton
                    icon="delete-outline"
                    size={20}
                    iconColor={theme.colors.error}
                    onPress={() => handleDeleteSession(session.id)}
                  />
                </View>

                {/* Unit Chips */}
                <View style={styles.unitsRow}>
                  {units.map((unit) => {
                    const isPresent = unit.status === AttendanceStatus.PRESENT;
                    const isAbsent = unit.status === AttendanceStatus.ABSENT;
                    const isBunked = unit.status === AttendanceStatus.BUNKED;
                    const isCancelled = unit.status === AttendanceStatus.CANCELLED;

                    let bg = theme.colors.surfaceVariant;
                    let textCol = theme.colors.onSurfaceVariant;
                    if (isPresent) {
                      bg = theme.customColors.statusPresentContainer;
                      textCol = theme.customColors.statusPresent;
                    } else if (isAbsent) {
                      bg = theme.customColors.statusAbsentContainer;
                      textCol = theme.customColors.statusAbsent;
                    } else if (isBunked) {
                      bg = theme.customColors.statusBunkedContainer;
                      textCol = theme.customColors.statusBunked;
                    } else if (isCancelled) {
                      bg = theme.customColors.statusCancelledContainer;
                      textCol = theme.customColors.statusCancelled;
                    }

                    return (
                      <Chip
                        key={unit.id}
                        onPress={() => setActiveUnit(unit)}
                        style={{ backgroundColor: bg }}
                        textStyle={{ fontWeight: 'bold', color: textCol }}
                      >
                        Unit {unit.unitIndex + 1}: {unit.status}
                      </Chip>
                    );
                  })}
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Edit Unit Modal */}
      <EditUnitBottomSheet
        visible={activeUnit !== null}
        unit={activeUnit}
        onDismiss={() => setActiveUnit(null)}
        onSelectStatus={handleUpdateUnit}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSurface: {
    paddingBottom: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 8,
  },
  chip: {
    height: 36,
  },
  recordCard: {
    borderRadius: 18,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  cardContent: {
    padding: 12,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorBar: {
    width: 6,
    height: 40,
    borderRadius: 3,
  },
  unitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  emptyCard: {
    margin: 20,
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
