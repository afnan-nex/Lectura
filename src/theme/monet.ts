import {
  argbFromHex,
  hexFromArgb,
  themeFromSourceColor,
  Scheme,
} from '@material/material-color-utilities';
import { MD3LightTheme, MD3DarkTheme, MD3Theme } from 'react-native-paper';

export interface PresetColor {
  name: string;
  hex: string;
  color: string;
}

export const PRESET_THEME_COLORS: PresetColor[] = [
  { name: 'Purple', hex: '#6750A4', color: '#6750A4' },
  { name: 'Ocean Blue', hex: '#00639B', color: '#00639B' },
  { name: 'Emerald', hex: '#006C51', color: '#006C51' },
  { name: 'Crimson', hex: '#984061', color: '#984061' },
  { name: 'Sunset Amber', hex: '#825500', color: '#825500' },
  { name: 'Royal Indigo', hex: '#3F51B5', color: '#3F51B5' },
  { name: 'Teal', hex: '#006972', color: '#006972' },
  { name: 'Vivid Rose', hex: '#B81B6C', color: '#B81B6C' },
  { name: 'Cyan', hex: '#00838F', color: '#00838F' },
  { name: 'Flame', hex: '#D84315', color: '#D84315' },
  { name: 'Forest', hex: '#2E7D32', color: '#2E7D32' },
  { name: 'Slate', hex: '#455A64', color: '#455A64' },
];

export interface MonetCustomColors {
  statusPresent: string;
  statusPresentContainer: string;
  onStatusPresent: string;
  statusAbsent: string;
  statusAbsentContainer: string;
  onStatusAbsent: string;
  statusBunked: string;
  statusBunkedContainer: string;
  onStatusBunked: string;
  statusCancelled: string;
  statusCancelledContainer: string;
  onStatusCancelled: string;
  statusUnmarked: string;
  statusUnmarkedContainer: string;
  onStatusUnmarked: string;
}

export type LecturaTheme = MD3Theme & {
  customColors: MonetCustomColors;
  isDark: boolean;
};

export function getSemanticCustomColors(isDark: boolean): MonetCustomColors {
  return isDark
    ? {
        statusPresent: '#81C784',
        statusPresentContainer: '#1B5E20',
        onStatusPresent: '#003300',
        statusAbsent: '#E57373',
        statusAbsentContainer: '#B71C1C',
        onStatusAbsent: '#330000',
        statusBunked: '#FFB74D',
        statusBunkedContainer: '#E65100',
        onStatusBunked: '#3E2723',
        statusCancelled: '#90A4AE',
        statusCancelledContainer: '#263238',
        onStatusCancelled: '#ECEFF1',
        statusUnmarked: '#9E9E9E',
        statusUnmarkedContainer: '#424242',
        onStatusUnmarked: '#E0E0E0',
      }
    : {
        statusPresent: '#2E7D32',
        statusPresentContainer: '#E8F5E9',
        onStatusPresent: '#FFFFFF',
        statusAbsent: '#C62828',
        statusAbsentContainer: '#FFEBEE',
        onStatusAbsent: '#FFFFFF',
        statusBunked: '#EF6C00',
        statusBunkedContainer: '#FFF3E0',
        onStatusBunked: '#FFFFFF',
        statusCancelled: '#455A64',
        statusCancelledContainer: '#ECEFF1',
        onStatusCancelled: '#FFFFFF',
        statusUnmarked: '#757575',
        statusUnmarkedContainer: '#EEEEEE',
        onStatusUnmarked: '#212121',
      };
}

export function generateMonetTheme(seedHex: string, isDark: boolean): LecturaTheme {
  const safeSeed = seedHex.startsWith('#') ? seedHex : `#${seedHex}`;
  let argb: number;
  try {
    argb = argbFromHex(safeSeed);
  } catch {
    argb = argbFromHex('#6750A4');
  }

  const generated = themeFromSourceColor(argb);
  const scheme: Scheme = isDark ? generated.schemes.dark : generated.schemes.light;
  const basePaperTheme = isDark ? MD3DarkTheme : MD3LightTheme;

  const customColors = getSemanticCustomColors(isDark);

  return {
    ...basePaperTheme,
    isDark,
    colors: {
      ...basePaperTheme.colors,
      primary: hexFromArgb(scheme.primary),
      onPrimary: hexFromArgb(scheme.onPrimary),
      primaryContainer: hexFromArgb(scheme.primaryContainer),
      onPrimaryContainer: hexFromArgb(scheme.onPrimaryContainer),
      secondary: hexFromArgb(scheme.secondary),
      onSecondary: hexFromArgb(scheme.onSecondary),
      secondaryContainer: hexFromArgb(scheme.secondaryContainer),
      onSecondaryContainer: hexFromArgb(scheme.onSecondaryContainer),
      tertiary: hexFromArgb(scheme.tertiary),
      onTertiary: hexFromArgb(scheme.onTertiary),
      tertiaryContainer: hexFromArgb(scheme.tertiaryContainer),
      onTertiaryContainer: hexFromArgb(scheme.onTertiaryContainer),
      error: hexFromArgb(scheme.error),
      onError: hexFromArgb(scheme.onError),
      errorContainer: hexFromArgb(scheme.errorContainer),
      onErrorContainer: hexFromArgb(scheme.onErrorContainer),
      background: hexFromArgb(scheme.background),
      onBackground: hexFromArgb(scheme.onBackground),
      surface: hexFromArgb(scheme.surface),
      onSurface: hexFromArgb(scheme.onSurface),
      surfaceVariant: hexFromArgb(scheme.surfaceVariant),
      onSurfaceVariant: hexFromArgb(scheme.onSurfaceVariant),
      outline: hexFromArgb(scheme.outline),
      outlineVariant: hexFromArgb(scheme.outlineVariant),
      inverseSurface: hexFromArgb(scheme.inverseSurface),
      inverseOnSurface: hexFromArgb(scheme.inverseOnSurface),
      inversePrimary: hexFromArgb(scheme.inversePrimary),
      shadow: hexFromArgb(scheme.shadow),
      scrim: hexFromArgb(scheme.scrim),
      backdrop: 'rgba(0, 0, 0, 0.4)',
      elevation: {
        level0: 'transparent',
        level1: isDark ? '#23202A' : '#F5F2FA',
        level2: isDark ? '#2A2633' : '#EFEBF6',
        level3: isDark ? '#312C3D' : '#E9E4F2',
        level4: isDark ? '#342E40' : '#E7E2F0',
        level5: isDark ? '#393247' : '#E3DEEC',
      },
    },
    customColors,
  };
}
