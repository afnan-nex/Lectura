import React, { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView } from 'react-native';
import { Surface, Text, TextInput, Button, IconButton } from 'react-native-paper';
import { useLecturaTheme } from '../theme/themeContext';
import { ClassScheduleItem } from '../types/models';
import { DateUtils } from '../utils/dateUtils';

interface Props {
  visible: boolean;
  item: ClassScheduleItem | null;
  onDismiss: () => void;
  onConfirmReschedule: (
    sessionId: number,
    newDate: string,
    newStartTime: string,
    newEndTime: string,
    reason: string
  ) => void;
}

export const RescheduleClassModal: React.FC<Props> = ({
  visible,
  item,
  onDismiss,
  onConfirmReschedule,
}) => {
  const { theme } = useLecturaTheme();
  if (!item) return null;

  const defaultNextDay = DateUtils.addDays(DateUtils.todayIso(), 1);
  const [newDateText, setNewDateText] = useState(defaultNextDay);
  const [startTimeText, setStartTimeText] = useState(item.timetableEntry.startTime);
  const [endTimeText, setEndTimeText] = useState(item.timetableEntry.endTime);
  const [reasonText, setReasonText] = useState('');

  const handleConfirm = () => {
    if (!item.session?.id || !newDateText.trim() || !startTimeText.trim() || !endTimeText.trim()) return;
    onConfirmReschedule(
      item.session.id,
      newDateText.trim(),
      startTimeText.trim(),
      endTimeText.trim(),
      reasonText.trim()
    );
    onDismiss();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Surface style={[styles.modalCard, { backgroundColor: theme.colors.elevation.level3 }]}>
          <View style={styles.header}>
            <View>
              <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                Reschedule Class
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {item.subject.name} ({DateUtils.formatTimeRange(item.timetableEntry.startTime, item.timetableEntry.endTime)})
              </Text>
            </View>
            <IconButton icon="close" size={20} onPress={onDismiss} />
          </View>

          <ScrollView style={{ maxHeight: 380 }}>
            <TextInput
              label="New Date (YYYY-MM-DD)"
              value={newDateText}
              onChangeText={setNewDateText}
              mode="outlined"
              style={styles.input}
            />

            <View style={styles.row}>
              <TextInput
                label="New Start Time (HH:mm)"
                value={startTimeText}
                onChangeText={setStartTimeText}
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
              />
              <TextInput
                label="New End Time (HH:mm)"
                value={endTimeText}
                onChangeText={setEndTimeText}
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
              />
            </View>

            <TextInput
              label="Reason (Optional, e.g. Teacher on leave)"
              value={reasonText}
              onChangeText={setReasonText}
              mode="outlined"
              style={styles.input}
            />

            <Surface style={[styles.infoBanner, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                💡 Rescheduling marks today's class as Cancelled and schedules a new unmarked session on the target date. You can revert anytime.
              </Text>
            </Surface>
          </ScrollView>

          <View style={styles.footer}>
            <Button mode="text" onPress={onDismiss}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleConfirm}>
              Confirm Reschedule
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
    marginVertical: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  infoBanner: {
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
});
