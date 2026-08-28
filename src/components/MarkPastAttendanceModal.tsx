import React, { useState } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Surface, Text, TextInput, Button, IconButton } from 'react-native-paper';
import { useLecturaTheme } from '../theme/themeContext';
import { Subject } from '../types/models';

interface Props {
  visible: boolean;
  subject: Subject | null;
  onDismiss: () => void;
  onConfirm: (subjectId: number, count: number) => void;
}

export const MarkPastAttendanceModal: React.FC<Props> = ({
  visible,
  subject,
  onDismiss,
  onConfirm,
}) => {
  const { theme } = useLecturaTheme();
  const [countText, setCountText] = useState('10');

  if (!subject) return null;

  const handleConfirm = () => {
    const count = parseInt(countText, 10);
    if (!count || count <= 0) return;
    onConfirm(subject.id, count);
    onDismiss();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Surface style={[styles.modalCard, { backgroundColor: theme.colors.elevation.level3 }]}>
          <View style={styles.header}>
            <View>
              <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                Mark Past Attendance
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {subject.name}
              </Text>
            </View>
            <IconButton icon="close" size={20} onPress={onDismiss} />
          </View>

          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginVertical: 8 }}>
            Enter how many past class units you have attended. Lectura will distribute these marks backwards onto scheduled timetable days (excluding holidays).
          </Text>

          <TextInput
            label="Total Attended Units Count"
            value={countText}
            onChangeText={setCountText}
            keyboardType="number-pad"
            mode="outlined"
            style={{ marginVertical: 12 }}
          />

          <View style={styles.footer}>
            <Button mode="text" onPress={onDismiss}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleConfirm}>
              Mark Attended
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
});
