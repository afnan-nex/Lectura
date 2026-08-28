import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, ScrollView } from 'react-native';
import { Surface, Text, TextInput, Button, IconButton, Chip } from 'react-native-paper';
import { useLecturaTheme } from '../theme/themeContext';
import { Subject, TimetableEntry } from '../types/models';
import { DateUtils } from '../utils/dateUtils';

interface Props {
  visible: boolean;
  subjects: Subject[];
  initialDay?: number;
  entryToEdit: TimetableEntry | null;
  onDismiss: () => void;
  onSave: (
    entryData: Omit<TimetableEntry, 'id' | 'createdAt' | 'updatedAt'>,
    id?: number,
    updateFutureOnly?: boolean
  ) => void;
}

export const AddEditTimetableModal: React.FC<Props> = ({
  visible,
  subjects,
  initialDay = 1,
  entryToEdit,
  onDismiss,
  onSave,
}) => {
  const { theme } = useLecturaTheme();

  const [subjectId, setSubjectId] = useState<number>(subjects[0]?.id || 0);
  const [dayOfWeek, setDayOfWeek] = useState<number>(initialDay);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [roomOverride, setRoomOverride] = useState('');
  const [teacherOverride, setTeacherOverride] = useState('');
  const [unitCount, setUnitCount] = useState('1');
  const [reminderMinutes, setReminderMinutes] = useState('10');
  const [updateFutureOnly, setUpdateFutureOnly] = useState(true);

  useEffect(() => {
    if (entryToEdit) {
      setSubjectId(entryToEdit.subjectId);
      setDayOfWeek(entryToEdit.dayOfWeek);
      setStartTime(entryToEdit.startTime);
      setEndTime(entryToEdit.endTime);
      setRoomOverride(entryToEdit.roomOverride);
      setTeacherOverride(entryToEdit.teacherOverride);
      setUnitCount(String(entryToEdit.attendanceUnitCount));
      setReminderMinutes(String(entryToEdit.reminderMinutes));
    } else {
      setSubjectId(subjects[0]?.id || 0);
      setDayOfWeek(initialDay);
      setStartTime('09:00');
      setEndTime('10:00');
      setRoomOverride('');
      setTeacherOverride('');
      setUnitCount('1');
      setReminderMinutes('10');
    }
  }, [entryToEdit, initialDay, subjects, visible]);

  const handleSave = () => {
    if (!subjectId || !startTime.trim() || !endTime.trim()) return;
    const units = parseInt(unitCount, 10) || 1;
    const reminder = parseInt(reminderMinutes, 10) || 10;

    onSave(
      {
        subjectId,
        dayOfWeek,
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        roomOverride: roomOverride.trim(),
        teacherOverride: teacherOverride.trim(),
        attendanceUnitCount: units,
        reminderMinutes: reminder,
        startDate: '',
        endDate: '',
        repeatType: 'WEEKLY',
        notes: '',
        isActive: true,
      },
      entryToEdit?.id,
      entryToEdit ? updateFutureOnly : false
    );
    onDismiss();
  };

  const weekdays = [
    { day: 1, name: 'Mon' },
    { day: 2, name: 'Tue' },
    { day: 3, name: 'Wed' },
    { day: 4, name: 'Thu' },
    { day: 5, name: 'Fri' },
    { day: 6, name: 'Sat' },
    { day: 7, name: 'Sun' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Surface style={[styles.modalCard, { backgroundColor: theme.colors.elevation.level3 }]}>
          <View style={styles.header}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
              {entryToEdit ? 'Edit Timetable Slot' : 'Add Timetable Slot'}
            </Text>
            <IconButton icon="close" size={20} onPress={onDismiss} />
          </View>

          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            {/* Day Selector */}
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
              Day of Week:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {weekdays.map((w) => (
                <Chip
                  key={w.day}
                  selected={dayOfWeek === w.day}
                  onPress={() => setDayOfWeek(w.day)}
                  style={{ marginRight: 6 }}
                >
                  {w.name}
                </Chip>
              ))}
            </ScrollView>

            {/* Subject Selector */}
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              Select Subject:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {subjects.map((s) => (
                <Chip
                  key={s.id}
                  selected={subjectId === s.id}
                  onPress={() => setSubjectId(s.id)}
                  style={{ marginRight: 6 }}
                >
                  {s.name}
                </Chip>
              ))}
            </ScrollView>

            <View style={styles.row}>
              <TextInput
                label="Start Time (HH:mm)"
                value={startTime}
                onChangeText={setStartTime}
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
              />
              <TextInput
                label="End Time (HH:mm)"
                value={endTime}
                onChangeText={setEndTime}
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
              />
            </View>

            <View style={styles.row}>
              <TextInput
                label="Units Count"
                value={unitCount}
                onChangeText={setUnitCount}
                keyboardType="number-pad"
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
              />
              <TextInput
                label="Reminder (Min before)"
                value={reminderMinutes}
                onChangeText={setReminderMinutes}
                keyboardType="number-pad"
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
              />
            </View>

            <TextInput
              label="Room / Hall Override"
              value={roomOverride}
              onChangeText={setRoomOverride}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Teacher Override"
              value={teacherOverride}
              onChangeText={setTeacherOverride}
              mode="outlined"
              style={styles.input}
            />
          </ScrollView>

          <View style={styles.footer}>
            <Button mode="text" onPress={onDismiss}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleSave}>
              Save Slot
            </Button>
          </View>
        </Surface>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 24,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    marginVertical: 5,
  },
  chipRow: {
    flexDirection: 'row',
    marginVertical: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
});
