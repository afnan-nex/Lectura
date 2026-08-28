import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider, useLecturaTheme } from './src/theme/themeContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { getDatabase } from './src/database/db';
import { PreferencesRepository } from './src/database/preferencesRepository';
import { NotificationService } from './src/services/notificationService';
import { UserPreferences } from './src/types/models';

function AppContent({ initialRoute }: { initialRoute: string }) {
  const { theme } = useLecturaTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <NavigationContainer>
        <RootNavigator initialRoute={initialRoute} />
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('MainTabs');
  const [initialPrefs, setInitialPrefs] = useState<UserPreferences | null>(null);

  useEffect(() => {
    async function initApp() {
      try {
        await getDatabase();
        await NotificationService.setupChannels();
        const prefs = await PreferencesRepository.getPreferences();
        setInitialPrefs(prefs);

        if (!prefs.onboardingCompleted) {
          setInitialRoute('Onboarding');
        } else {
          setInitialRoute('MainTabs');
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }

    initApp();
  }, []);

  if (loading || !initialPrefs) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#6750A4' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider
        initialMode={initialPrefs.themeMode}
        initialStyle={initialPrefs.themeColorStyle}
        initialCustomColor={initialPrefs.customThemeColor}
        onThemeChanged={async (mode, style, color) => {
          await PreferencesRepository.updatePreferences({
            themeMode: mode,
            themeColorStyle: style,
            customThemeColor: color,
          });
        }}
      >
        <AppContent initialRoute={initialRoute} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
