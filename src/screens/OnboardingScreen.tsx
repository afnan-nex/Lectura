import React, { useState, useRef } from 'react';
import { View, StyleSheet, FlatList, useWindowDimensions } from 'react-native';
import { Surface, Text, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLecturaTheme } from '../theme/themeContext';

interface OnboardingSlide {
  id: string;
  title: string;
  desc: string;
  icon: any;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Track Attendance Easily',
    desc: 'Mark multi-hour lectures and lab sessions directly from your home screen with granular attendance units.',
    icon: 'check-circle-outline',
  },
  {
    id: '2',
    title: 'Build Your Timetable',
    desc: 'Organize recurring classes, rooms, and faculty with automatic smart reminder alerts before every class.',
    icon: 'calendar-today',
  },
  {
    id: '3',
    title: 'Reach Your Target & Safe Bunks',
    desc: 'Know exactly how many upcoming classes you can safely miss or how many consecutive classes you must attend.',
    icon: 'shield',
  },
];

export const OnboardingScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const { theme } = useLecturaTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      onFinish();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 16,
        },
      ]}
    >
      {/* Top Skip Button */}
      <View style={styles.topBar}>
        <Button mode="text" onPress={onFinish} textColor={theme.colors.primary}>
          Skip
        </Button>
      </View>

      {/* Slides FlatList */}
      <FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(ev) => {
          const idx = Math.round(ev.nativeEvent.contentOffset.x / width);
          setCurrentIndex(idx);
        }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Surface style={[styles.iconCircle, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialIcons name={item.icon} size={64} color={theme.colors.primary} />
            </Surface>
            <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
              {item.title}
            </Text>
            <Text variant="bodyLarge" style={[styles.desc, { color: theme.colors.onSurfaceVariant }]}>
              {item.desc}
            </Text>
          </View>
        )}
      />

      {/* Indicators and Action Buttons */}
      <View style={styles.bottomBar}>
        <View style={styles.dotsRow}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === currentIndex ? theme.colors.primary : theme.colors.surfaceVariant,
                  width: i === currentIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.buttonsRow}>
          {currentIndex > 0 ? (
            <Button
              mode="text"
              onPress={() => {
                flatListRef.current?.scrollToIndex({ index: currentIndex - 1 });
                setCurrentIndex(currentIndex - 1);
              }}
            >
              Back
            </Button>
          ) : (
            <View style={{ width: 60 }} />
          )}

          <Button
            mode="contained"
            onPress={handleNext}
            style={{ borderRadius: 14 }}
            contentStyle={{ paddingHorizontal: 8, height: 44 }}
          >
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Continue'}
          </Button>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  desc: {
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomBar: {
    paddingHorizontal: 24,
    gap: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
