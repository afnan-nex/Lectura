import React, { useState } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Surface, Text, Button, IconButton, Checkbox } from 'react-native-paper';
import { useLecturaTheme } from '../theme/themeContext';
import { DateUtils } from '../utils/dateUtils';

interface Props {
  visible: boolean;
  sourceDay: number;
  onDismiss: () => void;
  onConfirmCopy: (targetDays: number[]) => void;
}

export const CopyDayScheduleModal: React.FC<Props> = ({
  visible,
  sourceDay,
  onDismiss,
  onConfirmCopy,
}) => {
  const { theme } = useLecturaTheme();
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const allDays = [1, 2, 3, 4, 5, 6, 7];

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleCopy = () => {
    if (selectedDays.length === 0) return;
    onConfirmCopy(selectedDays);
    onDismiss();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Surface style={[styles.modalCard, { backgroundColor: theme.colors.elevation.level3 }]}>
          <View style={styles.header}>
            <View>
              <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                Copy {DateUtils.getDayName(sourceDay)}'s Schedule
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Select target days to duplicate all classes
              </Text>
            </View>
            <IconButton icon="close" size={20} onPress={onDismiss} />
          </View>

          <View style={styles.daysList}>
            {allDays.map((day) => {
              if (day === sourceDay) return null;
              const isChecked = selectedDays.includes(day);
              return (
                <Checkbox.Item
                  key={day}
                  label={DateUtils.getDayName(day)}
                  status={isChecked ? 'checked' : 'unchecked'}
                  onPress={() => toggleDay(day)}
                />
              );
            })}
          </View>

          <View style={styles.footer}>
            <Button mode="text" onPress={onDismiss}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleCopy} disabled={selectedDays.length === 0}>
              Copy Classes
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
  daysList: {
    marginVertical: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
});
