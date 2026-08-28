import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { Surface, Text, TextInput, Button, IconButton, Chip } from 'react-native-paper';
import { useLecturaTheme } from '../theme/themeContext';
import { Subject, SubjectType } from '../types/models';
import { PRESET_THEME_COLORS } from '../theme/monet';

interface Props {
  visible: boolean;
  subjectToEdit: Subject | null;
  onDismiss: () => void;
  onSave: (subjectData: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>, id?: number) => void;
}

export const AddEditSubjectModal: React.FC<Props> = ({
  visible,
  subjectToEdit,
  onDismiss,
  onSave,
}) => {
  const { theme } = useLecturaTheme();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<string>(SubjectType.LECTURE);
  const [teacherName, setTeacherName] = useState('');
  const [room, setRoom] = useState('');
  const [colorValue, setColorValue] = useState(PRESET_THEME_COLORS[0].hex);
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [unitMinutes, setUnitMinutes] = useState('60');
  const [targetPercentage, setTargetPercentage] = useState('75');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (subjectToEdit) {
      setName(subjectToEdit.name);
      setCode(subjectToEdit.code);
      setType(subjectToEdit.type);
      setTeacherName(subjectToEdit.teacherName);
      setRoom(subjectToEdit.room);
      setColorValue(subjectToEdit.colorValue);
      setDurationMinutes(String(subjectToEdit.defaultSessionDurationMinutes));
      setUnitMinutes(String(subjectToEdit.attendanceUnitMinutes));
      setTargetPercentage(String(subjectToEdit.targetPercentage));
      setNotes(subjectToEdit.notes);
    } else {
      setName('');
      setCode('');
      setType(SubjectType.LECTURE);
      setTeacherName('');
      setRoom('');
      setColorValue(PRESET_THEME_COLORS[0].hex);
      setDurationMinutes('60');
      setUnitMinutes('60');
      setTargetPercentage('75');
      setNotes('');
    }
  }, [subjectToEdit, visible]);

  const handleSave = () => {
    if (!name.trim()) return;
    const dur = parseInt(durationMinutes, 10) || 60;
    const rule = parseInt(unitMinutes, 10) || 60;
    const units = Math.max(1, Math.round(dur / rule));
    const target = parseFloat(targetPercentage) || 75.0;

    onSave(
      {
        name: name.trim(),
        code: code.trim(),
        type,
        teacherName: teacherName.trim(),
        room: room.trim(),
        colorValue,
        iconName: 'Book',
        defaultSessionDurationMinutes: dur,
        attendanceUnitMinutes: rule,
        defaultAttendanceUnits: units,
        targetPercentage: target,
        defaultReminderMinutes: 10,
        notes: notes.trim(),
        isArchived: subjectToEdit ? subjectToEdit.isArchived : false,
      },
      subjectToEdit?.id
    );
    onDismiss();
  };

  const subjectTypes = Object.values(SubjectType);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Surface style={[styles.modalCard, { backgroundColor: theme.colors.elevation.level3 }]}>
          <View style={styles.header}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
              {subjectToEdit ? 'Edit Subject' : 'Add New Subject'}
            </Text>
            <IconButton icon="close" size={20} onPress={onDismiss} />
          </View>

          <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
            <TextInput
              label="Subject Name *"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Subject Code (Optional, e.g. CS301)"
              value={code}
              onChangeText={setCode}
              mode="outlined"
              style={styles.input}
            />

            {/* Subject Type Chips */}
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              Subject Type:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {subjectTypes.map((t) => (
                <Chip
                  key={t}
                  selected={type === t}
                  onPress={() => setType(t)}
                  style={{ marginRight: 6 }}
                >
                  {t}
                </Chip>
              ))}
            </ScrollView>

            <View style={styles.row}>
              <TextInput
                label="Teacher Name"
                value={teacherName}
                onChangeText={setTeacherName}
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
              />
              <TextInput
                label="Room / Hall"
                value={room}
                onChangeText={setRoom}
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
              />
            </View>

            {/* Color Swatches */}
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              Subject Color Accent:
            </Text>
            <View style={styles.colorPalette}>
              {PRESET_THEME_COLORS.map((c) => (
                <TouchableOpacity
                  key={c.hex}
                  onPress={() => setColorValue(c.hex)}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c.hex },
                    colorValue === c.hex && styles.selectedCircle,
                  ]}
                />
              ))}
            </View>

            <View style={styles.row}>
              <TextInput
                label="Duration (Minutes)"
                value={durationMinutes}
                onChangeText={setDurationMinutes}
                keyboardType="number-pad"
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
              />
              <TextInput
                label="Target Attendance %"
                value={targetPercentage}
                onChangeText={setTargetPercentage}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
              />
            </View>

            <TextInput
              label="Notes (Optional)"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              style={styles.input}
            />
          </ScrollView>

          <View style={styles.footer}>
            <Button mode="text" onPress={onDismiss}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleSave}>
              Save Subject
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
  colorPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  selectedCircle: {
    borderWidth: 3,
    borderColor: '#FFF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
});
