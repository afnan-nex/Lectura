import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Surface, Text, Searchbar, SegmentedButtons, Card, FAB, IconButton, Menu } from 'react-native-paper';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLecturaTheme } from '../theme/themeContext';
import { SubjectRepository } from '../database/subjectRepository';
import { AttendanceRepository } from '../database/attendanceRepository';
import { PreferencesRepository } from '../database/preferencesRepository';
import { AttendanceCalculator } from '../domain/calculator';
import { AddEditSubjectModal } from '../components/AddEditSubjectModal';
import { Subject, SubjectWithSummary, AttendanceStatus, UserPreferences } from '../types/models';
import { DateUtils } from '../utils/dateUtils';

export const SubjectsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useLecturaTheme();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [subjectsWithSummary, setSubjectsWithSummary] = useState<SubjectWithSummary[]>([]);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null);
  const [menuVisibleSubjectId, setMenuVisibleSubjectId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const userPrefs = await PreferencesRepository.getPreferences();
      setPrefs(userPrefs);

      const allSubjects = await SubjectRepository.getAllSubjects();
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

      const filtered = allSubjects.filter((s) =>
        tab === 'ACTIVE' ? !s.isArchived : s.isArchived
      );

      const summaries: SubjectWithSummary[] = filtered.map((sub) => {
        const subUnits = allUnits.filter((u) => sessionDateMap.get(u.sessionId) === sub.id);
        const statuses = subUnits.map((u) => u.status as AttendanceStatus);
        const summary = AttendanceCalculator.calculate(statuses, sub.targetPercentage);
        return { subject: sub, summary };
      });

      setSubjectsWithSummary(summaries);
    } catch {
      // Ignore
    }
  }, [tab]);

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

  const handleSaveSubject = async (
    subjectData: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>,
    id?: number
  ) => {
    if (id) {
      await SubjectRepository.updateSubject({
        ...subjectData,
        id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      await SubjectRepository.insertSubject(subjectData);
    }
    loadData();
  };

  const handleToggleArchive = async (subject: Subject) => {
    await SubjectRepository.setSubjectArchived(subject.id, !subject.isArchived);
    setMenuVisibleSubjectId(null);
    loadData();
  };

  const handleDeleteSubject = async (subject: Subject) => {
    await SubjectRepository.deleteSubject(subject.id);
    setMenuVisibleSubjectId(null);
    loadData();
  };

  const displayedSubjects = subjectsWithSummary.filter(({ subject }) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      subject.name.toLowerCase().includes(q) ||
      subject.code.toLowerCase().includes(q) ||
      subject.teacherName.toLowerCase().includes(q)
    );
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
          Courses & Subjects
        </Text>

        {/* Search Bar */}
        <Searchbar
          placeholder="Search courses, codes, faculty..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor: theme.colors.surfaceVariant }]}
          elevation={0}
        />

        {/* Tabs */}
        <SegmentedButtons
          value={tab}
          onValueChange={(val) => setTab(val as 'ACTIVE' | 'ARCHIVED')}
          buttons={[
            { value: 'ACTIVE', label: 'Active Courses' },
            { value: 'ARCHIVED', label: 'Archived' },
          ]}
          style={styles.segmentedButtons}
        />
      </Surface>

      {/* Subjects List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
      >
        {displayedSubjects.length === 0 ? (
          <Surface style={[styles.emptyCard, { backgroundColor: theme.colors.elevation.level1 }]}>
            <MaterialIcons name="school" size={48} color={theme.colors.onSurfaceVariant} />
            <Text variant="titleMedium" style={{ fontWeight: 'bold', marginTop: 12, color: theme.colors.onSurface }}>
              {searchQuery ? 'No matching subjects found' : tab === 'ACTIVE' ? 'No active subjects yet' : 'No archived subjects'}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 }}>
              {tab === 'ACTIVE' ? 'Tap the + button below to add your courses.' : ''}
            </Text>
          </Surface>
        ) : (
          displayedSubjects.map(({ subject, summary }) => {
            const isAbove = summary.percentage >= subject.targetPercentage;
            const details = [subject.code, subject.type, subject.teacherName].filter(Boolean).join(' • ');

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
                    {/* Subject Color Accent */}
                    <View style={[styles.colorBar, { backgroundColor: subject.colorValue || theme.colors.primary }]} />

                    <View style={{ flex: 1 }}>
                      <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                        {subject.name}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {details}
                      </Text>
                    </View>

                    {/* Attendance Percentage Badge */}
                    <Surface
                      style={[
                        styles.percentBadge,
                        {
                          backgroundColor:
                            summary.totalConductedUnits === 0
                              ? theme.colors.surfaceVariant
                              : isAbove
                              ? theme.customColors.statusPresentContainer
                              : theme.customColors.statusAbsentContainer,
                        },
                      ]}
                    >
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
                    </Surface>

                    {/* 3-dots Menu */}
                    <Menu
                      visible={menuVisibleSubjectId === subject.id}
                      onDismiss={() => setMenuVisibleSubjectId(null)}
                      anchor={
                        <IconButton
                          icon="dots-vertical"
                          size={20}
                          onPress={() => setMenuVisibleSubjectId(subject.id)}
                        />
                      }
                    >
                      <Menu.Item
                        onPress={() => {
                          setMenuVisibleSubjectId(null);
                          setSubjectToEdit(subject);
                          setShowAddEditModal(true);
                        }}
                        title="Edit Subject"
                        leadingIcon="pencil"
                      />
                      <Menu.Item
                        onPress={() => handleToggleArchive(subject)}
                        title={subject.isArchived ? 'Unarchive' : 'Archive'}
                        leadingIcon={subject.isArchived ? 'archive-arrow-up' : 'archive'}
                      />
                      <Menu.Item
                        onPress={() => handleDeleteSubject(subject)}
                        title="Delete"
                        leadingIcon="delete"
                      />
                    </Menu>
                  </View>

                  {/* Summary Metric Footer */}
                  <View style={styles.metricsFooter}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {summary.presentUnits}/{summary.totalConductedUnits} units attended
                    </Text>
                    <Text
                      variant="labelMedium"
                      style={{
                        fontWeight: 'bold',
                        color: isAbove
                          ? theme.customColors.statusPresent
                          : theme.customColors.statusAbsent,
                      }}
                    >
                      {summary.totalConductedUnits === 0
                        ? `Goal: ${subject.targetPercentage}%`
                        : isAbove
                        ? `${summary.safeBunks} Safe Bunks`
                        : `Need ${summary.requiredUnitsToTarget} to Recover`}
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Floating Add Subject FAB */}
      <FAB
        icon="plus"
        label="New Subject"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        visible={isFocused}
        onPress={() => {
          setSubjectToEdit(null);
          setShowAddEditModal(true);
        }}
      />

      {/* Modal */}
      <AddEditSubjectModal
        visible={showAddEditModal}
        subjectToEdit={subjectToEdit}
        onDismiss={() => setShowAddEditModal(false)}
        onSave={handleSaveSubject}
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
  searchBar: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    height: 46,
  },
  segmentedButtons: {
    marginHorizontal: 16,
    marginTop: 10,
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
    height: 44,
    borderRadius: 3,
  },
  percentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  metricsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(150,150,150,0.2)',
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
