import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Surface, Text, SegmentedButtons, Card, ProgressBar } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLecturaTheme } from '../theme/themeContext';
import { SubjectRepository } from '../database/subjectRepository';
import { AttendanceRepository } from '../database/attendanceRepository';
import { PreferencesRepository } from '../database/preferencesRepository';
import { AttendanceCalculator } from '../domain/calculator';
import { AttendanceDonutChart } from '../components/AttendanceDonutChart';
import {
  Subject,
  SubjectWithSummary,
  AttendanceStatus,
  AttendanceSummary,
  UserPreferences,
} from '../types/models';
import { DateUtils } from '../utils/dateUtils';

export const AnalyticsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useLecturaTheme();
  const insets = useSafeAreaInsets();

  const [filterTab, setFilterTab] = useState<'ALL' | 'BELOW' | 'NEAR'>('ALL');
  const [overallSummary, setOverallSummary] = useState<AttendanceSummary>(
    AttendanceCalculator.calculate([])
  );
  const [subjectsWithSummary, setSubjectsWithSummary] = useState<SubjectWithSummary[]>([]);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const userPrefs = await PreferencesRepository.getPreferences();
      setPrefs(userPrefs);

      const allSubjects = await SubjectRepository.getActiveSubjects();
      const allSessions = await AttendanceRepository.getAllSessions();
      const allUnits = await AttendanceRepository.getAllUnits();

      let validSessions = allSessions;
      if (userPrefs.trackBySemester && (userPrefs.semesterStartDate || userPrefs.semesterEndDate)) {
        validSessions = allSessions.filter((s) =>
          DateUtils.isDateInRange(s.sessionDate, userPrefs.semesterStartDate, userPrefs.semesterEndDate)
        );
      }
      const sessionDateMap = new Map<number, number>();
      validSessions.forEach((s) => sessionDateMap.set(s.id, s.subjectId));

      const validSessionIds = new Set(validSessions.map((s) => s.id));
      const validUnits = allUnits.filter((u) => validSessionIds.has(u.sessionId));
      const allStatuses = validUnits.map((u) => u.status as AttendanceStatus);

      setOverallSummary(
        AttendanceCalculator.calculate(allStatuses, userPrefs.defaultTargetAttendance)
      );

      const subSummaries: SubjectWithSummary[] = allSubjects.map((sub) => {
        const subUnits = allUnits.filter((u) => sessionDateMap.get(u.sessionId) === sub.id);
        const statuses = subUnits.map((u) => u.status as AttendanceStatus);
        const summary = AttendanceCalculator.calculate(statuses, sub.targetPercentage);
        return { subject: sub, summary };
      });

      setSubjectsWithSummary(subSummaries);
    } catch {
      // Ignore
    }
  }, []);

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

  const totalSafeBunks = subjectsWithSummary.reduce((sum, s) => sum + s.summary.safeBunks, 0);
  const subjectsWithClasses = subjectsWithSummary.filter((s) => s.summary.totalConductedUnits > 0);
  const sortedByPct = [...subjectsWithClasses].sort((a, b) => b.summary.percentage - a.summary.percentage);
  const bestSubject = sortedByPct[0] || null;
  const lowestSubject = sortedByPct[sortedByPct.length - 1] || null;

  const filteredSubjects = subjectsWithSummary.filter(({ subject, summary }) => {
    if (filterTab === 'BELOW') {
      return summary.percentage < subject.targetPercentage && summary.totalConductedUnits > 0;
    }
    if (filterTab === 'NEAR') {
      const diff = summary.percentage - subject.targetPercentage;
      return diff >= 0 && diff <= 5.0 && summary.totalConductedUnits > 0;
    }
    return true;
  });

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
          Attendance Analytics
        </Text>
      </Surface>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
      >
        {/* Donut Chart Card */}
        <Card
          style={[
            styles.chartCard,
            {
              backgroundColor: theme.colors.elevation.level1,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          mode="outlined"
        >
          <Card.Content>
            <AttendanceDonutChart summary={overallSummary} />
          </Card.Content>
        </Card>

        {/* Bento Key Metric Tiles */}
        <View style={styles.metricsRow}>
          <Surface style={[styles.metricTile, { backgroundColor: theme.customColors.statusPresentContainer }]}>
            <Text variant="labelSmall" style={{ color: theme.customColors.statusPresent }}>
              Total Safe Bunks
            </Text>
            <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.customColors.statusPresent }}>
              {totalSafeBunks}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Across all active courses
            </Text>
          </Surface>

          {bestSubject && (
            <Surface style={[styles.metricTile, { backgroundColor: theme.colors.elevation.level2 }]}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Top Performing Course
              </Text>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }} numberOfLines={1}>
                {bestSubject.subject.name}
              </Text>
              <Text variant="labelMedium" style={{ color: theme.customColors.statusPresent, fontWeight: 'bold' }}>
                {bestSubject.summary.percentage.toFixed(1)}% Attended
              </Text>
            </Surface>
          )}

          {lowestSubject && lowestSubject.subject.id !== bestSubject?.subject.id && (
            <Surface style={[styles.metricTile, { backgroundColor: theme.colors.elevation.level2 }]}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Needs Attention
              </Text>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }} numberOfLines={1}>
                {lowestSubject.subject.name}
              </Text>
              <Text variant="labelMedium" style={{ color: theme.customColors.statusAbsent, fontWeight: 'bold' }}>
                {lowestSubject.summary.percentage.toFixed(1)}% (Goal: {lowestSubject.subject.targetPercentage}%)
              </Text>
            </Surface>
          )}
        </View>

        {/* Filter Tabs for Subject Breakdown */}
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
            Subject Breakdown
          </Text>
        </View>

        <SegmentedButtons
          value={filterTab}
          onValueChange={(val) => setFilterTab(val as 'ALL' | 'BELOW' | 'NEAR')}
          buttons={[
            { value: 'ALL', label: 'All Courses' },
            { value: 'BELOW', label: 'Below Goal' },
            { value: 'NEAR', label: 'Near Margin' },
          ]}
          style={styles.segmentedButtons}
        />

        {/* Subject Breakdown Cards */}
        {filteredSubjects.length === 0 ? (
          <Surface style={[styles.emptyCard, { backgroundColor: theme.colors.elevation.level1 }]}>
            <MaterialIcons name="insights" size={48} color={theme.colors.onSurfaceVariant} />
            <Text variant="titleMedium" style={{ fontWeight: 'bold', marginTop: 12, color: theme.colors.onSurface }}>
              No subjects matching this filter
            </Text>
          </Surface>
        ) : (
          filteredSubjects.map(({ subject, summary }) => {
            const isAbove = summary.percentage >= subject.targetPercentage;
            const progress = summary.totalConductedUnits > 0 ? summary.percentage / 100 : 0;

            return (
              <Card
                key={subject.id}
                style={[
                  styles.subjectCard,
                  {
                    backgroundColor: theme.colors.elevation.level1,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
                mode="outlined"
                onPress={() => navigation.navigate('SubjectDetail', { subjectId: subject.id })}
              >
                <Card.Content style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.colorBar, { backgroundColor: subject.colorValue || theme.colors.primary }]} />
                    <View style={{ flex: 1 }}>
                      <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                        {subject.name}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {summary.presentUnits}/{summary.totalConductedUnits} units • Goal: {subject.targetPercentage}%
                      </Text>
                    </View>
                    <Text
                      variant="titleMedium"
                      style={{
                        fontWeight: 'bold',
                        color:
                          summary.totalConductedUnits === 0
                            ? theme.colors.onSurfaceVariant
                            : isAbove
                            ? theme.customColors.statusPresent
                            : theme.customColors.statusAbsent,
                      }}
                    >
                      {summary.totalConductedUnits > 0 ? `${summary.percentage.toFixed(0)}%` : '--'}
                    </Text>
                  </View>

                  <ProgressBar
                    progress={progress}
                    color={isAbove ? theme.customColors.statusPresent : theme.customColors.statusAbsent}
                    style={styles.progressBar}
                  />

                  <View style={styles.cardFooter}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {summary.statusMessage}
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            );
          })
        )}
      </ScrollView>
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
  chartCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
  },
  metricsRow: {
    gap: 10,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  metricTile: {
    padding: 16,
    borderRadius: 18,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 6,
  },
  segmentedButtons: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  subjectCard: {
    borderRadius: 18,
    marginHorizontal: 16,
    marginVertical: 6,
  },
  cardContent: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorBar: {
    width: 6,
    height: 40,
    borderRadius: 3,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginTop: 12,
  },
  cardFooter: {
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
