import React, { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView } from 'react-native';
import { Surface, Text, TextInput, Button, IconButton, Chip } from 'react-native-paper';
import { useLecturaTheme } from '../theme/themeContext';
import { Subject } from '../types/models';
import { DateUtils } from '../utils/dateUtils';

interface Props {
  visible: boolean;
  subjects: Subject[];
  initialDate?: string;
  onDismiss: () => void;
  onSave: (subjectId: number, date: string, startTime: string, endTime: string, unitCount: number, notes: string) => void;
}

export const AddExtraClassModal: React.FC<Props> = ({
  visible,
  subjects,
  initialDate = DateUtils.todayIso(),
  onDismiss,
  onSave,
}) => {
  const { theme } = useLecturaTheme();

  const [selectedSubjectId, setSelectedSubjectId] = useState<number>(subjects[0]?.id || 0);
  const [dateText, setDateText] = useState(initialDate);
  const [startTimeText, setStartTimeText] = useState('14:00');
  const [endTimeText, setEndTimeText] = useState('15:00');
  const [unitCountText, setUnitCountText] = useState('1');
  const [notesText, setNotesText] = useState('');

  const handleSave = () => {
    if (!selectedSubjectId || !dateText.trim() || !startTimeText.trim() || !endTimeText.trim()) return;
    const units = parseInt(unitCountText, 10) || 1;
    onSave(selectedSubjectId, dateText.trim(), startTimeText.trim(), endTimeText.trim(), units, notesText.trim());
    onDismiss();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Surface style={[styles.modalCard, { backgroundColor: theme.colors.elevation.level3 }]}>
          <View style={styles.header}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
              Schedule Extra Class
            </Text>
            <IconButton icon="close" size={20} onPress={onDismiss} />
          </View>

          <ScrollView style={{ maxHeight: 400 }}>
            {/* Subject Selector */}
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              Select Subject:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {subjects.map((sub) => {
                const isSelected = selectedSubjectId === sub.id;
                return (
                  <Chip
                    key={sub.id}
                    selected={isSelected}
                    onPress={() => setSelectedSubjectId(sub.id)}
                    style={{ marginRight: 6, backgroundColor: isSelected ? theme.colors.primaryContainer : undefined }}
                  >
                    {sub.name}
                  </Chip>
                );
              })}
            </ScrollView>

            <TextInput
              label="Session Date (YYYY-MM-DD)"
              value={dateText}
              onChangeText={setDateText}
              mode="outlined"
              style={styles.input}
            />

            <View style={styles.row}>
              <TextInput
                label="Start Time (HH:mm)"
                value={startTimeText}
                onChangeText={setStartTimeText}
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
              />
              <TextInput
                label="End Time (HH:mm)"
                value={endTimeText}
                onChangeText={setEndTimeText}
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
              />
            </View>

            <TextInput
              label="Attendance Units Count"
              value={unitCountText}
              onChangeText={setUnitCountText}
              keyboardType="number-pad"
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Notes / Topic (Optional)"
              value={notesText}
              onChangeText={setNotesText}
              mode="outlined"
              style={styles.input}
            />
          </ScrollView>

          <View style={styles.footer}>
            <Button mode="text" onPress={onDismiss}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleSave}>
              Add Extra Class
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
  chipRow: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  input: {
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
