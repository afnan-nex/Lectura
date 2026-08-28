import React from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Surface, Text, Button, IconButton, Divider } from 'react-native-paper';
import { useLecturaTheme } from '../theme/themeContext';
import { AttendanceUnit, AttendanceStatus } from '../types/models';

interface Props {
  visible: boolean;
  unit: AttendanceUnit | null;
  onDismiss: () => void;
  onSelectStatus: (status: AttendanceStatus) => void;
}

export const EditUnitBottomSheet: React.FC<Props> = ({
  visible,
  unit,
  onDismiss,
  onSelectStatus,
}) => {
  const { theme } = useLecturaTheme();
  if (!unit) return null;

  const statuses: { label: string; value: AttendanceStatus; color: string; desc: string }[] = [
    {
      label: 'Present',
      value: AttendanceStatus.PRESENT,
      color: theme.customColors.statusPresent,
      desc: 'Attended this class unit',
    },
    {
      label: 'Absent',
      value: AttendanceStatus.ABSENT,
      color: theme.customColors.statusAbsent,
      desc: 'Missed this class unit',
    },
    {
      label: 'Bunked',
      value: AttendanceStatus.BUNKED,
      color: theme.customColors.statusBunked,
      desc: 'Intentionally skipped class',
    },
    {
      label: 'Cancelled',
      value: AttendanceStatus.CANCELLED,
      color: theme.customColors.statusCancelled,
      desc: 'Class was not conducted (excluded from %)',
    },
    {
      label: 'Unmarked',
      value: AttendanceStatus.UNMARKED,
      color: theme.customColors.statusUnmarked,
      desc: 'Reset back to unrecorded state',
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Surface style={[styles.sheet, { backgroundColor: theme.colors.elevation.level2 }]}>
          <View style={styles.header}>
            <View>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                Edit Unit {unit.unitIndex + 1} Status
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Current Status: {unit.status}
              </Text>
            </View>
            <IconButton icon="close" size={20} onPress={onDismiss} />
          </View>

          <Divider style={{ marginVertical: 8 }} />

          <View style={styles.optionsList}>
            {statuses.map((s) => {
              const isSelected = unit.status === s.value;
              return (
                <Button
                  key={s.value}
                  mode={isSelected ? 'contained' : 'outlined'}
                  buttonColor={isSelected ? s.color : undefined}
                  textColor={isSelected ? '#FFF' : s.color}
                  style={[styles.statusBtn, { borderColor: s.color }]}
                  onPress={() => {
                    onSelectStatus(s.value);
                    onDismiss();
                  }}
                >
                  {s.label} — {s.desc}
                </Button>
              );
            })}
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
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionsList: {
    gap: 8,
    marginTop: 8,
  },
  statusBtn: {
    borderRadius: 12,
    justifyContent: 'flex-start',
  },
});
