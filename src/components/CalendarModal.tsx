import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Button, IconButton, Text, Portal, Modal, Surface, TouchableRipple } from 'react-native-paper';
import { useLecturaTheme } from '../theme/themeContext';
import { DateUtils } from '../utils/dateUtils';

interface CalendarModalProps {
  visible: boolean;
  selectedDate: string; // ISO format (YYYY-MM-DD)
  onApply: (dateIso: string) => void;
  onCancel: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const CalendarModal: React.FC<CalendarModalProps> = ({
  visible,
  selectedDate,
  onApply,
  onCancel,
}) => {
  const { theme } = useLecturaTheme();

  const [internalDate, setInternalDate] = useState<Date>(() => DateUtils.parseIso(selectedDate || DateUtils.todayIso()));
  const [viewYear, setViewYear] = useState<number>(() => internalDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => internalDate.getMonth());

  useEffect(() => {
    if (visible) {
      const d = DateUtils.parseIso(selectedDate || DateUtils.todayIso());
      setInternalDate(d);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [visible, selectedDate]);

  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonth + 1, 0).getDate();
  }, [viewYear, viewMonth]);

  const firstDayWeekday = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sun
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const selectedIso = DateUtils.formatIso(internalDate);
  const todayIso = DateUtils.todayIso();

  const calendarCells = useMemo(() => {
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDayWeekday; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(viewYear, viewMonth, d));
    }
    return cells;
  }, [firstDayWeekday, daysInMonth, viewYear, viewMonth]);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onCancel}
        dismissable={true}
        contentContainerStyle={styles.modalContainer}
      >
        <TouchableWithoutFeedback onPress={onCancel}>
          <View style={styles.backdropArea}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <Surface
                elevation={3}
                style={[
                  styles.dialog,
                  { backgroundColor: theme.colors.elevation.level3 },
                ]}
              >
                {/* Header Banner */}
                <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
                  <Text
                    variant="labelMedium"
                    style={{
                      color: theme.colors.onPrimary,
                      opacity: 0.85,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  >
                    Select Date
                  </Text>
                  <Text
                    variant="headlineSmall"
                    style={{ color: theme.colors.onPrimary, marginTop: 4, fontWeight: 'bold' }}
                  >
                    {DateUtils.formatDateHuman(selectedIso)}
                  </Text>
                </View>

                {/* Month/Year selector row */}
                <View style={styles.monthNavRow}>
                  <IconButton
                    icon="chevron-left"
                    size={24}
                    iconColor={theme.colors.onSurface}
                    onPress={prevMonth}
                  />

                  <Text
                    variant="titleMedium"
                    style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}
                  >
                    {`${MONTH_NAMES[viewMonth]} ${viewYear}`}
                  </Text>

                  <IconButton
                    icon="chevron-right"
                    size={24}
                    iconColor={theme.colors.onSurface}
                    onPress={nextMonth}
                  />
                </View>

                {/* Weekday headers */}
                <View style={styles.weekdayRow}>
                  {WEEKDAY_SHORT.map((wd) => (
                    <Text
                      key={wd}
                      variant="labelSmall"
                      style={[
                        styles.weekdayHeaderCell,
                        { color: theme.colors.onSurfaceVariant, fontWeight: 'bold' },
                      ]}
                    >
                      {wd}
                    </Text>
                  ))}
                </View>

                {/* Days Grid */}
                <View style={styles.gridContainer}>
                  {calendarCells.map((dateObj, idx) => {
                    if (!dateObj) {
                      return <View key={`empty_${idx}`} style={styles.dayCellWrapper} />;
                    }

                    const cellIso = DateUtils.formatIso(dateObj);
                    const isSelected = cellIso === selectedIso;
                    const isToday = cellIso === todayIso;

                    const textColor = isSelected
                      ? theme.colors.onPrimary
                      : isToday
                      ? theme.colors.primary
                      : theme.colors.onSurface;

                    return (
                      <View key={cellIso} style={styles.dayCellWrapper}>
                        <TouchableRipple
                          borderless
                          onPress={() => setInternalDate(dateObj)}
                          style={styles.dayCellRipple}
                        >
                          <View
                            style={[
                              styles.dayCircle,
                              isSelected && {
                                backgroundColor: theme.colors.primary,
                              },
                              !isSelected && isToday && {
                                borderWidth: 1.5,
                                borderColor: theme.colors.primary,
                                backgroundColor: 'transparent',
                              },
                            ]}
                          >
                            <Text
                              variant="bodyMedium"
                              style={[
                                styles.dayText,
                                {
                                  color: textColor,
                                  fontWeight: isSelected || isToday ? 'bold' : 'normal',
                                },
                              ]}
                            >
                              {dateObj.getDate()}
                            </Text>
                          </View>
                        </TouchableRipple>
                      </View>
                    );
                  })}
                </View>

                {/* Footer Buttons */}
                <View style={[styles.footerRow, { borderTopColor: theme.colors.outlineVariant }]}>
                  <Button mode="text" onPress={onCancel} textColor={theme.colors.primary}>
                    Cancel
                  </Button>

                  <Button
                    mode="contained"
                    onPress={() => onApply(selectedIso)}
                    buttonColor={theme.colors.primary}
                    textColor={theme.colors.onPrimary}
                    style={{ marginLeft: 8 }}
                  >
                    OK
                  </Button>
                </View>
              </Surface>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdropArea: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 28,
    overflow: 'hidden',
  },
  header: {
    padding: 20,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  weekdayHeaderCell: {
    width: 36,
    textAlign: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  dayCellWrapper: {
    width: '14.28%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 1,
  },
  dayCellRipple: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    textAlign: 'center',
    includeFontPadding: false,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
