import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Surface } from 'react-native-paper';
import Svg, { Circle } from 'react-native-svg';
import { useLecturaTheme } from '../theme/themeContext';
import { AttendanceSummary } from '../types/models';

interface Props {
  summary: AttendanceSummary;
  targetPercentage?: number;
}

export const AttendanceProgressCard: React.FC<Props> = ({ summary, targetPercentage = 75.0 }) => {
  const { theme } = useLecturaTheme();

  const percentage = summary.percentage;
  const isAbove = percentage >= targetPercentage;

  // SVG Circular Gauge parameters
  const size = 96;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressClamped = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (progressClamped / 100) * circumference;

  const gaugeColor = summary.totalConductedUnits === 0
    ? theme.colors.outlineVariant
    : isAbove
    ? theme.customColors.statusPresent
    : theme.customColors.statusAbsent;

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
      <Card.Content style={styles.content}>
        <View style={styles.mainRow}>
          {/* Circular Progress Gauge */}
          <View style={styles.gaugeContainer}>
            <Svg width={size} height={size}>
              {/* Background Track */}
              <Circle
                stroke={theme.colors.surfaceVariant}
                fill="none"
                cx={size / 2}
                cy={size / 2}
                r={radius}
                strokeWidth={strokeWidth}
              />
              {/* Progress Ring */}
              <Circle
                stroke={gaugeColor}
                fill="none"
                cx={size / 2}
                cy={size / 2}
                r={radius}
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            </Svg>
            <View style={styles.gaugeCenterText}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                {summary.totalConductedUnits > 0 ? `${percentage.toFixed(0)}%` : '--'}
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}>
                Goal: {targetPercentage}%
              </Text>
            </View>
          </View>

          {/* Metrics & Message */}
          <View style={styles.infoCol}>
            <Text variant="titleSmall" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
              Overall Attendance
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
              {summary.presentUnits} of {summary.totalConductedUnits} conducted units attended
            </Text>

            <View style={styles.bentoTiles}>
              {/* Safe Bunks Tile */}
              <Surface
                style={[
                  styles.tile,
                  {
                    backgroundColor: isAbove
                      ? theme.customColors.statusPresentContainer
                      : theme.customColors.statusAbsentContainer,
                  },
                ]}
                elevation={0}
              >
                <Text
                  variant="labelMedium"
                  style={{
                    fontWeight: 'bold',
                    color: isAbove
                      ? theme.customColors.statusPresent
                      : theme.customColors.statusAbsent,
                  }}
                >
                  {isAbove ? `${summary.safeBunks} Safe Bunks` : `${summary.requiredUnitsToTarget} to Recover`}
                </Text>
              </Surface>
            </View>
          </View>
        </View>

        {/* Status Message */}
        <Text
          variant="bodySmall"
          style={{
            color: theme.colors.onSurfaceVariant,
            marginTop: 8,
            fontStyle: 'italic',
          }}
        >
          {summary.statusMessage}
        </Text>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  content: {
    padding: 16,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  gaugeContainer: {
    position: 'relative',
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeCenterText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
  },
  bentoTiles: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  tile: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
});
