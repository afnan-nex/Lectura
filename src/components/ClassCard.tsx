import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Button, Surface, IconButton } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useLecturaTheme } from '../theme/themeContext';
import { ClassScheduleItem, AttendanceStatus, AttendanceUnit } from '../types/models';
import { DateUtils } from '../utils/dateUtils';

interface Props {
  item: ClassScheduleItem;
  onMarkSession: (status: AttendanceStatus) => void;
  onResetSession: () => void;
  onEditUnit: (unit: AttendanceUnit) => void;
  onReschedule: () => void;
  onRevertReschedule: () => void;
}

export const ClassCard: React.FC<Props> = ({
  item,
  onMarkSession,
  onResetSession,
  onEditUnit,
  onReschedule,
  onRevertReschedule,
}) => {
  const { theme } = useLecturaTheme();
  const { subject, timetableEntry, session, units } = item;

  const isRescheduledAway = item.isRescheduledAway;
  const isRescheduledIncoming = item.isRescheduledIncoming;
  const isHoliday = item.isHoliday;

  const room = timetableEntry.roomOverride || subject.room;
  const teacher = timetableEntry.teacherOverride || subject.teacherName;
  const details = [room, teacher].filter(Boolean).join(' • ');

  const hasMarkedUnits = units.some((u) => u.status !== AttendanceStatus.UNMARKED);
  const allPresent = units.length > 0 && units.every((u) => u.status === AttendanceStatus.PRESENT);
  const allAbsent = units.length > 0 && units.every((u) => u.status === AttendanceStatus.ABSENT);

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return theme.customColors.statusPresent;
      case AttendanceStatus.ABSENT:
        return theme.customColors.statusAbsent;
      case AttendanceStatus.BUNKED:
        return theme.customColors.statusBunked;
      case AttendanceStatus.CANCELLED:
        return theme.customColors.statusCancelled;
      default:
        return theme.customColors.statusUnmarked;
    }
  };

  const getStatusContainerColor = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return theme.customColors.statusPresentContainer;
      case AttendanceStatus.ABSENT:
        return theme.customColors.statusAbsentContainer;
      case AttendanceStatus.BUNKED:
        return theme.customColors.statusBunkedContainer;
      case AttendanceStatus.CANCELLED:
        return theme.customColors.statusCancelledContainer;
      default:
        return theme.colors.surfaceVariant;
    }
  };

  return (
    <Card
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.elevation.level1,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
      mode="outlined"
    >
      {/* Reschedule / Holiday Notice Banner */}
      {isRescheduledAway && (
        <Surface style={[styles.banner, { backgroundColor: theme.customColors.statusCancelledContainer }]}>
          <MaterialIcons name="schedule" size={16} color={theme.customColors.statusCancelled} />
          <Text variant="labelSmall" style={{ color: theme.customColors.statusCancelled, flex: 1, fontWeight: 'bold' }}>
            Rescheduled to {item.rescheduledToDate} at {DateUtils.formatTime(item.rescheduledToTime || '')}
          </Text>
          <Button mode="text" compact onPress={onRevertReschedule} textColor={theme.customColors.statusCancelled}>
            Revert
          </Button>
        </Surface>
      )}

      {isRescheduledIncoming && (
        <Surface style={[styles.banner, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialIcons name="event" size={16} color={theme.colors.primary} />
          <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer, flex: 1, fontWeight: 'bold' }}>
            Rescheduled from {item.originalDate} at {DateUtils.formatTime(item.originalTime || '')}
          </Text>
          <Button mode="text" compact onPress={onRevertReschedule} textColor={theme.colors.primary}>
            Revert
          </Button>
        </Surface>
      )}

      {isHoliday && (
        <Surface style={[styles.banner, { backgroundColor: theme.colors.surfaceVariant }]}>
          <MaterialIcons name="beach-access" size={16} color={theme.colors.onSurfaceVariant} />
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1, fontWeight: 'bold' }}>
            Holiday: {item.holidayTitle || 'College Closed'}
          </Text>
        </Surface>
      )}

      <Card.Content style={styles.cardContent}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          {/* Subject Color Badge */}
          <View style={[styles.colorBar, { backgroundColor: subject.colorValue || theme.colors.primary }]} />

          <View style={styles.titleCol}>
            <View style={styles.subjectNameRow}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                {subject.name}
              </Text>
              <Surface style={[styles.typeBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontWeight: '600' }}>
                  {subject.type}
                </Text>
              </Surface>
            </View>

            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {DateUtils.formatTimeRange(timetableEntry.startTime, timetableEntry.endTime)}
              {details ? ` • ${details}` : ''}
            </Text>
          </View>

          {!isRescheduledAway && (
            <IconButton
              icon="schedule"
              size={20}
              iconColor={theme.colors.onSurfaceVariant}
              onPress={onReschedule}
            />
          )}
        </View>

        {/* Segmented Unit Pills Bar */}
        <View style={styles.unitPillsRow}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginRight: 6 }}>
            Units ({units.filter((u) => u.status !== AttendanceStatus.UNMARKED).length}/{units.length}):
          </Text>
          {units.map((unit, idx) => {
            const statusColor = getStatusColor(unit.status);
            const containerColor = getStatusContainerColor(unit.status);
            return (
              <TouchableOpacity
                key={unit.id || idx}
                onPress={() => onEditUnit(unit)}
                style={[styles.unitPill, { backgroundColor: containerColor, borderColor: statusColor }]}
              >
                <Text variant="labelSmall" style={{ color: statusColor, fontWeight: 'bold' }}>
                  U{idx + 1}: {unit.status.charAt(0)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Quick Action Buttons */}
        {!isRescheduledAway && (
          <View style={styles.actionButtonsRow}>
            <Button
              mode={allPresent ? 'contained' : 'outlined'}
              onPress={() => onMarkSession(AttendanceStatus.PRESENT)}
              buttonColor={allPresent ? theme.customColors.statusPresent : undefined}
              textColor={allPresent ? '#FFF' : theme.customColors.statusPresent}
              style={[styles.actionBtn, { borderColor: theme.customColors.statusPresent }]}
              compact
            >
              Present
            </Button>

            <Button
              mode={allAbsent ? 'contained' : 'outlined'}
              onPress={() => onMarkSession(AttendanceStatus.ABSENT)}
              buttonColor={allAbsent ? theme.customColors.statusAbsent : undefined}
              textColor={allAbsent ? '#FFF' : theme.customColors.statusAbsent}
              style={[styles.actionBtn, { borderColor: theme.customColors.statusAbsent }]}
              compact
            >
              Absent
            </Button>

            <Button
              mode="outlined"
              onPress={() => onMarkSession(AttendanceStatus.BUNKED)}
              textColor={theme.customColors.statusBunked}
              style={[styles.actionBtn, { borderColor: theme.customColors.statusBunked }]}
              compact
            >
              Bunk
            </Button>

            <Button
              mode="outlined"
              onPress={() => onMarkSession(AttendanceStatus.CANCELLED)}
              textColor={theme.customColors.statusCancelled}
              style={[styles.actionBtn, { borderColor: theme.customColors.statusCancelled }]}
              compact
            >
              Cancel
            </Button>

            {hasMarkedUnits && (
              <IconButton
                icon="refresh"
                size={18}
                iconColor={theme.colors.onSurfaceVariant}
                onPress={onResetSession}
                style={styles.resetBtn}
              />
            )}
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: 'hidden',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 8,
  },
  cardContent: {
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorBar: {
    width: 6,
    height: 40,
    borderRadius: 3,
  },
  titleCol: {
    flex: 1,
  },
  subjectNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unitPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    flexWrap: 'wrap',
    gap: 6,
  },
  unitPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
    flexWrap: 'wrap',
  },
  actionBtn: {
    borderRadius: 10,
  },
  resetBtn: {
    margin: 0,
  },
});
