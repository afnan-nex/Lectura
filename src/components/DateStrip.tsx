import React, { useRef, useEffect, useMemo } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, Surface, TouchableRipple } from 'react-native-paper';
import { useLecturaTheme } from '../theme/themeContext';
import { DateUtils } from '../utils/dateUtils';

interface DateStripProps {
  selectedDate: string; // ISO date string (YYYY-MM-DD)
  onSelectDate: (dateIso: string) => void;
}

interface DayChipData {
  dateIso: string;
  dayOfMonth: number;
  dayOfWeekShort: string;
  isToday: boolean;
}

const CHIP_WIDTH = 54;
const CHIP_GAP = 6;
const ITEM_TOTAL_WIDTH = CHIP_WIDTH + CHIP_GAP;

function generateDateStripData(): { chips: DayChipData[]; todayIndex: number } {
  const chips: DayChipData[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = DateUtils.todayIso();

  const totalDaysPast = 180;
  const totalDaysFuture = 180;
  let todayIndex = totalDaysPast;

  for (let i = -totalDaysPast; i <= totalDaysFuture; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = DateUtils.formatIso(d);
    const isToday = iso === todayIso;

    if (isToday) {
      todayIndex = chips.length;
    }

    chips.push({
      dateIso: iso,
      dayOfMonth: d.getDate(),
      dayOfWeekShort: DateUtils.getDayName(d.getDay() === 0 ? 7 : d.getDay(), true),
      isToday,
    });
  }

  return { chips, todayIndex };
}

export const DateStrip: React.FC<DateStripProps> = ({
  selectedDate,
  onSelectDate,
}) => {
  const { theme } = useLecturaTheme();
  const flatListRef = useRef<FlatList>(null);
  const isInitialMount = useRef(true);
  const isInternalSelectionRef = useRef(false);

  const { chips, todayIndex } = useMemo(() => generateDateStripData(), []);

  const selectedIndex = useMemo(() => {
    const idx = chips.findIndex((c) => c.dateIso === selectedDate);
    return idx >= 0 ? idx : todayIndex;
  }, [chips, selectedDate, todayIndex]);

  // Only scroll on initial mount or external programmatic changes (e.g. tapping "Today" button)
  // Pure tap on any chip in the strip updates selection ONLY without shifting/scrolling the list.
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      const targetIndex = Math.max(0, selectedIndex - 2);
      flatListRef.current?.scrollToOffset({
        offset: targetIndex * ITEM_TOTAL_WIDTH,
        animated: false,
      });
      return;
    }

    if (isInternalSelectionRef.current) {
      isInternalSelectionRef.current = false;
      return;
    }

    // External change (e.g. Today jump)
    if (selectedIndex >= 0) {
      const targetIndex = Math.max(0, selectedIndex - 2);
      flatListRef.current?.scrollToOffset({
        offset: targetIndex * ITEM_TOTAL_WIDTH,
        animated: true,
      });
    }
  }, [selectedIndex]);

  const handleChipPress = (dateIso: string) => {
    isInternalSelectionRef.current = true;
    onSelectDate(dateIso);
  };

  const getItemLayout = (_: any, index: number) => ({
    length: ITEM_TOTAL_WIDTH,
    offset: ITEM_TOTAL_WIDTH * index,
    index,
  });

  const renderChip = ({ item }: { item: DayChipData }) => {
    const isSelected = item.dateIso === selectedDate;

    const backgroundColor = isSelected
      ? theme.colors.primaryContainer
      : theme.colors.surfaceVariant;

    const weekdayColor = isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant;
    const numberColor = isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurface;

    return (
      <Surface
        elevation={isSelected ? 2 : 0}
        style={[
          styles.chipSurface,
          {
            backgroundColor,
            borderColor: isSelected ? theme.colors.primary : 'transparent',
            borderWidth: isSelected ? 1.5 : 0,
          },
        ]}
      >
        <TouchableRipple
          borderless
          onPress={() => handleChipPress(item.dateIso)}
          style={styles.chipRipple}
        >
          <View style={styles.chipInner}>
            <Text
              variant="labelSmall"
              style={[
                styles.weekdayText,
                { color: weekdayColor, fontWeight: isSelected ? 'bold' : '500' },
              ]}
              numberOfLines={1}
            >
              {item.dayOfWeekShort}
            </Text>

            <Text
              variant="titleMedium"
              style={[
                styles.numberText,
                {
                  color: numberColor,
                  fontWeight: isSelected ? 'bold' : '600',
                },
              ]}
            >
              {item.dayOfMonth}
            </Text>

            {/* Reserved slot under number containing round dot on today's date */}
            <View style={styles.dotSlot}>
              {item.isToday && (
                <View
                  style={[
                    styles.todayDot,
                    { backgroundColor: isSelected ? theme.colors.primary : theme.colors.primary },
                  ]}
                />
              )}
            </View>
          </View>
        </TouchableRipple>
      </Surface>
    );
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.surface }]} elevation={0}>
      <FlatList
        ref={flatListRef}
        horizontal
        data={chips}
        keyExtractor={(item) => item.dateIso}
        renderItem={renderChip}
        getItemLayout={getItemLayout}
        initialScrollIndex={Math.max(0, todayIndex - 2)}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
          }, 50);
        }}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        ItemSeparatorComponent={() => <View style={{ width: CHIP_GAP }} />}
        initialNumToRender={15}
        maxToRenderPerBatch={20}
        windowSize={5}
      />
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
  },
  chipSurface: {
    width: CHIP_WIDTH,
    height: 68,
    borderRadius: 16,
    overflow: 'hidden',
  },
  chipRipple: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 11,
    marginBottom: 2,
  },
  numberText: {
    fontSize: 16,
    lineHeight: 20,
  },
  dotSlot: {
    height: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
