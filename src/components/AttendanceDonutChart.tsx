import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import Svg, { Circle, G } from 'react-native-svg';
import { useLecturaTheme } from '../theme/themeContext';
import { AttendanceSummary } from '../types/models';

interface Props {
  summary: AttendanceSummary;
  size?: number;
}

export const AttendanceDonutChart: React.FC<Props> = ({ summary, size = 180 }) => {
  const { theme } = useLecturaTheme();

  const total = summary.presentUnits + summary.absentUnits + summary.bunkedUnits + summary.cancelledUnits;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const presentPct = total > 0 ? summary.presentUnits / total : 0;
  const absentPct = total > 0 ? summary.absentUnits / total : 0;
  const bunkedPct = total > 0 ? summary.bunkedUnits / total : 0;
  const cancelledPct = total > 0 ? summary.cancelledUnits / total : 0;

  const presentDash = presentPct * circumference;
  const absentDash = absentPct * circumference;
  const bunkedDash = bunkedPct * circumference;
  const cancelledDash = cancelledPct * circumference;

  let offset = 0;
  const presentOffset = circumference - presentDash;
  offset += presentDash;
  const absentOffset = circumference - absentDash;
  const absentRotation = (presentPct * 360) - 90;
  offset += absentDash;
  const bunkedOffset = circumference - bunkedDash;
  const bunkedRotation = ((presentPct + absentPct) * 360) - 90;
  offset += bunkedDash;
  const cancelledOffset = circumference - cancelledDash;
  const cancelledRotation = ((presentPct + absentPct + bunkedPct) * 360) - 90;

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            {/* Background ring if 0 */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={theme.colors.surfaceVariant}
              strokeWidth={strokeWidth}
              fill="none"
            />

            {/* Present Segment */}
            {presentPct > 0 && (
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={theme.customColors.statusPresent}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${presentDash} ${circumference}`}
                strokeDashoffset={0}
              />
            )}

            {/* Absent Segment */}
            {absentPct > 0 && (
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={theme.customColors.statusAbsent}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${absentDash} ${circumference}`}
                strokeDashoffset={-presentDash}
              />
            )}

            {/* Bunked Segment */}
            {bunkedPct > 0 && (
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={theme.customColors.statusBunked}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${bunkedDash} ${circumference}`}
                strokeDashoffset={-(presentDash + absentDash)}
              />
            )}

            {/* Cancelled Segment */}
            {cancelledPct > 0 && (
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={theme.customColors.statusCancelled}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${cancelledDash} ${circumference}`}
                strokeDashoffset={-(presentDash + absentDash + bunkedDash)}
              />
            )}
          </G>
        </Svg>

        <View style={styles.centerText}>
          <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
            {summary.totalConductedUnits > 0 ? `${summary.percentage.toFixed(0)}%` : '--'}
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Overall
          </Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.customColors.statusPresent }]} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
            Present ({summary.presentUnits})
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.customColors.statusAbsent }]} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
            Absent ({summary.absentUnits})
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.customColors.statusBunked }]} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
            Bunked ({summary.bunkedUnits})
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.customColors.statusCancelled }]} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
            Cancelled ({summary.cancelledUnits})
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  centerText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
