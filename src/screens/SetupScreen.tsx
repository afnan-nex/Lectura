import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Surface, Text, TextInput, Button, Card, RadioButton, Divider } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLecturaTheme } from '../theme/themeContext';
import { PreferencesRepository } from '../database/preferencesRepository';
import { SubjectRepository } from '../database/subjectRepository';
import { ExportImportService } from '../services/exportImportService';
import { DateUtils } from '../utils/dateUtils';

type SetupMethod = 'OCR' | 'DEMO' | 'MANUAL';

export const SetupScreen: React.FC<{ onComplete: () => void }> = ({
  onComplete,
}) => {
  const { theme } = useLecturaTheme();
  const insets = useSafeAreaInsets();

  const [targetText, setTargetText] = useState('75');
  const [startDateText, setStartDateText] = useState(DateUtils.todayIso());
  const [endDateText, setEndDateText] = useState(DateUtils.addMonths(DateUtils.todayIso(), 4));
  const [apiKeyText, setApiKeyText] = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  const [method, setMethod] = useState<SetupMethod>('MANUAL');

  // Manual first subject
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [teacherName, setTeacherName] = useState('');

  const handleLaunch = async () => {
    const target = parseFloat(targetText) || 75.0;

    await PreferencesRepository.updatePreferences({
      defaultTargetAttendance: target,
      semesterStartDate: startDateText.trim(),
      semesterEndDate: endDateText.trim(),
      trackBySemester: Boolean(startDateText && endDateText),
      geminiApiKey: apiKeyText.trim(),
      onboardingCompleted: true,
    });

    if (method === 'DEMO') {
      await ExportImportService.loadDemoData();
    } else if (method === 'MANUAL') {
      if (subjectName.trim()) {
        await SubjectRepository.insertSubject({
          name: subjectName.trim(),
          code: subjectCode.trim(),
          type: 'Lecture',
          teacherName: teacherName.trim(),
          room: '',
          colorValue: '#6750A4',
          iconName: 'Book',
          defaultSessionDurationMinutes: 60,
          attendanceUnitMinutes: 60,
          defaultAttendanceUnits: 1,
          targetPercentage: target,
          defaultReminderMinutes: 10,
          notes: '',
          isArchived: false,
        });
      }
    }

    onComplete();
  };

  return (
    <ScrollView
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top + 8,
        },
      ]}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
    >
      <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
        Initial Setup
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
        Configure your academic goals, dates, and schedule
      </Text>

      {/* Rules & Semester Card */}
      <Card style={[styles.card, { backgroundColor: theme.colors.elevation.level1 }]} mode="outlined">
        <Card.Content>
          <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
            Attendance Rules & Semester
          </Text>

          <TextInput
            label="Default Target Attendance (%)"
            value={targetText}
            onChangeText={setTargetText}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
          />

          <View style={styles.row}>
            <TextInput
              label="Semester Start"
              value={startDateText}
              onChangeText={setStartDateText}
              mode="outlined"
              style={[styles.input, { flex: 1 }]}
            />
            <TextInput
              label="Semester End"
              value={endDateText}
              onChangeText={setEndDateText}
              mode="outlined"
              style={[styles.input, { flex: 1 }]}
            />
          </View>
        </Card.Content>
      </Card>

      {/* Gemini API Key */}
      <Card style={[styles.card, { backgroundColor: theme.colors.elevation.level1 }]} mode="outlined">
        <Card.Content>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcons name="auto-awesome" size={20} color={theme.colors.primary} />
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
              Gemini API Key (Optional for OCR)
            </Text>
          </View>

          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginVertical: 6 }}>
            Add your key to upload timetable photos and parse schedules with AI.
          </Text>

          <TextInput
            label="Gemini API Key"
            value={apiKeyText}
            onChangeText={setApiKeyText}
            secureTextEntry={!apiKeyVisible}
            right={
              <TextInput.Icon
                icon={apiKeyVisible ? 'eye-off' : 'eye'}
                onPress={() => setApiKeyVisible(!apiKeyVisible)}
              />
            }
            mode="outlined"
            style={styles.input}
          />
        </Card.Content>
      </Card>

      {/* Method Selection */}
      <Card style={[styles.card, { backgroundColor: theme.colors.elevation.level1 }]} mode="outlined">
        <Card.Content>
          <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 8 }}>
            How would you like to set up your classes?
          </Text>

          <RadioButton.Group onValueChange={(v) => setMethod(v as SetupMethod)} value={method}>
            <View style={styles.radioOption}>
              <RadioButton value="OCR" />
              <View style={{ flex: 1 }}>
                <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
                  Upload Timetable Photo (Smart AI OCR)
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Scan timetable photo in Timetable tab to auto-extract all classes
                </Text>
              </View>
            </View>

            <Divider style={{ marginVertical: 8 }} />

            <View style={styles.radioOption}>
              <RadioButton value="DEMO" />
              <View style={{ flex: 1 }}>
                <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
                  Load Sample College Demo Data
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Instantly prefill sample subjects (DBMS, OS, DSA, Lab) & weekly timetable
                </Text>
              </View>
            </View>

            <Divider style={{ marginVertical: 8 }} />

            <View style={styles.radioOption}>
              <RadioButton value="MANUAL" />
              <View style={{ flex: 1 }}>
                <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
                  Add First Subject Manually
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Enter your first course now and build your timetable later
                </Text>
              </View>
            </View>
          </RadioButton.Group>

          {method === 'MANUAL' && (
            <View style={{ marginTop: 12 }}>
              <TextInput
                label="First Subject Name (e.g. DBMS)"
                value={subjectName}
                onChangeText={setSubjectName}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Course Code (Optional)"
                value={subjectCode}
                onChangeText={setSubjectCode}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Faculty Name (Optional)"
                value={teacherName}
                onChangeText={setTeacherName}
                mode="outlined"
                style={styles.input}
              />
            </View>
          )}
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        icon="rocket-launch"
        onPress={handleLaunch}
        style={styles.launchBtn}
      >
        Complete Setup & Launch
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    borderRadius: 20,
    marginVertical: 6,
  },
  input: {
    marginVertical: 5,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  launchBtn: {
    marginTop: 16,
    borderRadius: 14,
    paddingVertical: 4,
  },
});
