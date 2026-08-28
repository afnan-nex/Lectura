import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { useMaterial3Theme, isDynamicThemeSupported } from '@pchmn/expo-material3-theme';
import { LecturaTheme, generateMonetTheme, getSemanticCustomColors } from './monet';

interface ThemeContextType {
  theme: LecturaTheme;
  themeMode: 'SYSTEM' | 'LIGHT' | 'DARK';
  themeColorStyle: 'DYNAMIC' | 'DEFAULT' | 'CUSTOM';
  customThemeColor: string;
  isDynamicSupported: boolean;
  setThemeMode: (mode: 'SYSTEM' | 'LIGHT' | 'DARK') => void;
  setThemeColorStyle: (style: 'DYNAMIC' | 'DEFAULT' | 'CUSTOM') => void;
  setCustomThemeColor: (hex: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  initialMode?: 'SYSTEM' | 'LIGHT' | 'DARK';
  initialStyle?: 'DYNAMIC' | 'DEFAULT' | 'CUSTOM';
  initialCustomColor?: string;
  onThemeChanged?: (mode: 'SYSTEM' | 'LIGHT' | 'DARK', style: 'DYNAMIC' | 'DEFAULT' | 'CUSTOM', color: string) => void;
}> = ({
  children,
  initialMode = 'SYSTEM',
  initialStyle = 'DYNAMIC',
  initialCustomColor = '#6750A4',
  onThemeChanged,
}) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<'SYSTEM' | 'LIGHT' | 'DARK'>(initialMode);
  const [themeColorStyle, setThemeColorStyleState] = useState<'DYNAMIC' | 'DEFAULT' | 'CUSTOM'>(initialStyle);
  const [customThemeColor, setCustomThemeColorState] = useState<string>(initialCustomColor);

  const { theme: dynamicSystemTheme } = useMaterial3Theme({
    fallbackSourceColor: '#00639B',
  });

  const isDark = useMemo(() => {
    if (themeMode === 'DARK') return true;
    if (themeMode === 'LIGHT') return false;
    return systemColorScheme === 'dark';
  }, [themeMode, systemColorScheme]);

  const theme: LecturaTheme = useMemo(() => {
    if (themeColorStyle === 'DYNAMIC' && dynamicSystemTheme) {
      const baseTheme = isDark ? MD3DarkTheme : MD3LightTheme;
      const m3Scheme = isDark ? dynamicSystemTheme.dark : dynamicSystemTheme.light;

      return {
        ...baseTheme,
        isDark,
        colors: {
          ...baseTheme.colors,
          ...m3Scheme,
        },
        customColors: getSemanticCustomColors(isDark),
      };
    }

    const activeSeedColor = themeColorStyle === 'CUSTOM' ? customThemeColor : '#6750A4';
    return generateMonetTheme(activeSeedColor, isDark);
  }, [themeColorStyle, dynamicSystemTheme, isDark, customThemeColor]);

  const setThemeMode = (mode: 'SYSTEM' | 'LIGHT' | 'DARK') => {
    setThemeModeState(mode);
    onThemeChanged?.(mode, themeColorStyle, customThemeColor);
  };

  const setThemeColorStyle = (style: 'DYNAMIC' | 'DEFAULT' | 'CUSTOM') => {
    setThemeColorStyleState(style);
    onThemeChanged?.(themeMode, style, customThemeColor);
  };

  const setCustomThemeColor = (hex: string) => {
    setCustomThemeColorState(hex);
    onThemeChanged?.(themeMode, themeColorStyle, hex);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeMode,
        themeColorStyle,
        customThemeColor,
        isDynamicSupported: isDynamicThemeSupported,
        setThemeMode,
        setThemeColorStyle,
        setCustomThemeColor,
      }}
    >
      <PaperProvider theme={theme}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
};

export const useLecturaTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useLecturaTheme must be used within a ThemeProvider');
  }
  return context;
};
