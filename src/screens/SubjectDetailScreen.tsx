import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Surface, Text, Card, Button, IconButton, Divider, Chip } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLecturaTheme } from '../theme/themeContext';
import { SubjectRepository } from '../database/subjectRepository';
import { AttendanceRepository } from '../database/attendanceRepository';
import { PreferencesRepository } from '../database/preferencesRepository';
import { AttendanceCalculator } from '../domain/calculator';
import { AttendanceProgressCard } from '../components/AttendanceProgressCard';
import { EditUnitBottomSheet } from '../components/EditUnitBottomSheet';
import { MarkPastAttendanceModal } from '../components/MarkPastAttendanceModal';
import {
  Subject,
  AttendanceSession,
  AttendanceUnit,
  AttendanceStatus,
  AttendanceSummary,
  SessionWithUnits,
} from '../types/models';
import { DateUtils } from '../utils/dateUtils';

export const SubjectDetailScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { theme } = useLecturaTheme();
  const insets = useSafeAreaInsets();
  const { subjectId } = route.params;

  const [subject, setSubject] = useState<Subject | null>(null);
  const [sessionsWithUnits, setSessionsWithUnits] = useState<SessionWithUnits[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>(AttendanceCalculator.calculate([]));
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [activeUnit, setActiveUnit] = useState<AttendanceUnit | null>(null);
  const [showMarkPastModal, setShowMarkPastModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const sub = await SubjectRepository.getSubjectById(subjectId);
      setSubject(sub);
      if (!sub) return;

      const sessions = await AttendanceRepository.getSessionsForSubject(subjectId);
      const units = await AttendanceRepository.getAllUnits();

      const swuList: SessionWithUnits[] = sessions.map((ses) => {
        const sesUnits = units.filter((u) => u.sessionId === ses.id);
        return { session: ses, units: sesUnits };
      });

      setSessionsWithUnits(swuList);

      const allSubUnits = units.filter((u) => sessions.some((s) => s.id === u.sessionId));
      const statuses = allSubUnits.map((u) => u.status as AttendanceStatus);
      setSummary(AttendanceCalculator.calculate(statuses, sub.targetPercentage));
    } catch {
      // Ignore
    }
  }, [subjectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const handleMarkAllSession = async (sessionId: number, status: AttendanceStatus) => {
    await AttendanceRepository.markCompleteSessionStatus(sessionId, status);
    loadData();
  };

  const handleDeleteSession = async (sessionId: number) => {
    await AttendanceRepository.deleteSession(sessionId);
    loadData();
  };

  const handleConfirmMarkPast = async (subId: number, count: number) => {
    await AttendanceRepository.markPastAttendanceForSubject(subId, count);
    loadData();
  };

  if (!subject) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text variant="titleMedium">Loading course details...</Text>
      </View>
    );
  }

  const details = [subject.code, subject.type, subject.teacherName, subject.room].filter(Boolean).join(' • ');

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header Bar */}
      <Surface
        style={[
          styles.headerSurface,
          {
            backgroundColor: theme.colors.surface,
            paddingTop: insets.top + 4,
          },
        ]}
        elevation={1}
      >
        <View style={styles.headerRow}>
          <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} />
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }} numberOfLines={1}>
              {subject.name}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
              {details}
            </Text>
          </View>
        </View>
      </Surface>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* Attendance Progress Bento Gauge */}
        <AttendanceProgressCard summary={summary} targetPercentage={subject.targetPercentage} />

        {/* 4-Metric Grid */}
        <View style={styles.gridRow}>
          <Surface style={[styles.gridTile, { backgroundColor: theme.colors.elevation.level1 }]}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Conducted Units
            </Text>
            <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
              {summary.totalConductedUnits}
            </Text>
          </Surface>

          <Surface style={[styles.gridTile, { backgroundColor: theme.customColors.statusPresentContainer }]}>
            <Text variant="labelSmall" style={{ color: theme.customColors.statusPresent }}>
              Present Units
            </Text>
            <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.customColors.statusPresent }}>
              {summary.presentUnits}
            </Text>
          </Surface>

          <Surface style={[styles.gridTile, { backgroundColor: theme.customColors.statusAbsentContainer }]}>
            <Text variant="labelSmall" style={{ color: theme.customColors.statusAbsent }}>
              Absent Units
            </Text>
            <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.customColors.statusAbsent }}>
              {summary.absentUnits}
            </Text>
          </Surface>

          <Surface style={[styles.gridTile, { backgroundColor: theme.customColors.statusCancelledContainer }]}>
            <Text variant="labelSmall" style={{ color: theme.customColors.statusCancelled }}>
              Cancelled Units
            </Text>
            <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.customColors.statusCancelled }}>
              {summary.cancelledUnits}
            </Text>
          </Surface>
        </View>

        {/* Quick Past Attendance Button */}
        <View style={styles.actionRow}>
          <Button
            mode="contained-tonal"
            icon="history"
            onPress={() => setShowMarkPastModal(true)}
            style={{ flex: 1 }}
          >
            Mark Past Attendance
          </Button>
        </View>

        {/* Session History Feed */}
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
            Attendance History ({sessionsWithUnits.length} sessions)
          </Text>
        </View>

        {sessionsWithUnits.length === 0 ? (
          <Surface style={[styles.emptyCard, { backgroundColor: theme.colors.elevation.level1 }]}>
            <MaterialIcons name="history" size={48} color={theme.colors.onSurfaceVariant} />
            <Text variant="titleMedium" style={{ fontWeight: 'bold', marginTop: 12, color: theme.colors.onSurface }}>
              No recorded sessions yet
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 }}>
              Mark classes from the Home dashboard or use "Mark Past Attendance" above.
            </Text>
          </Surface>
        ) : (
          sessionsWithUnits.map(({ session, units }) => (
            <Card
              key={session.id}
              style={[
                styles.sessionCard,
                {
                  backgroundColor: theme.colors.elevation.level1,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
              mode="outlined"
            >
              <Card.Content style={styles.sessionCardContent}>
                <View style={styles.sessionHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleSmall" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                      {DateUtils.formatDateHuman(session.sessionDate)}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {DateUtils.formatTimeRange(session.startTime, session.endTime)}
                      {session.notes ? ` • ${session.notes}` : ''}
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
                <View style={styles.unitChipsRow}>
                  {units.map((unit) => {
                    const isPresent = unit.status === AttendanceStatus.PRESENT;
                    const isAbsent = unit.status === AttendanceStatus.ABSENT;
                    return (
                      <Chip
                        key={unit.id}
                        onPress={() => setActiveUnit(unit)}
                        style={{
                          backgroundColor: isPresent
                            ? theme.customColors.statusPresentContainer
                            : isAbsent
                            ? theme.customColors.statusAbsentContainer
                            : theme.colors.surfaceVariant,
                        }}
                        textStyle={{
                          fontWeight: 'bold',
                          color: isPresent
                            ? theme.customColors.statusPresent
                            : isAbsent
                            ? theme.customColors.statusAbsent
                            : theme.colors.onSurfaceVariant,
                        }}
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

      {/* Modals */}
      <EditUnitBottomSheet
        visible={activeUnit !== null}
        unit={activeUnit}
        onDismiss={() => setActiveUnit(null)}
        onSelectStatus={handleUpdateUnit}
      />

      <MarkPastAttendanceModal
        visible={showMarkPastModal}
        subject={subject}
        onDismiss={() => setShowMarkPastModal(false)}
        onConfirm={handleConfirmMarkPast}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSurface: {
    paddingVertical: 6,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginHorizontal: 16,
    marginVertical: 6,
  },
  gridTile: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: 14,
    borderRadius: 16,
  },
  actionRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 6,
  },
  sessionCard: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  sessionCardContent: {
    padding: 12,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unitChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  emptyCard: {
    margin: 20,
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
