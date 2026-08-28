import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserPreferences } from '../types/models';

const PREFS_STORAGE_KEY = '@lectura_user_preferences';

export const DEFAULT_PREFERENCES: UserPreferences = {
  notificationsEnabled: true,
  defaultTargetAttendance: 75.0,
  defaultReminderMinutes: 10,
  trackBySemester: false,
  semesterStartDate: '',
  semesterEndDate: '',
  firstDayOfWeek: 1,
  timeFormat24Hr: false,
  themeMode: 'SYSTEM',
  dynamicColors: true,
  themeColorStyle: 'DEFAULT',
  customThemeColor: '#6750A4',
  onboardingCompleted: false,
  confirmMarkingAbsent: false,
  notificationSound: true,
  notificationVibrate: true,
  geminiApiKey: '',
};

export class PreferencesRepository {
  static async getPreferences(): Promise<UserPreferences> {
    try {
      const json = await AsyncStorage.getItem(PREFS_STORAGE_KEY);
      if (json) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(json) };
      }
    } catch {
      // Return default if error
    }
    return DEFAULT_PREFERENCES;
  }

  static async updatePreferences(partial: Partial<UserPreferences>): Promise<UserPreferences> {
    const current = await this.getPreferences();
    const updated = { ...current, ...partial };
    await AsyncStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }

  static async resetPreferences(): Promise<UserPreferences> {
    await AsyncStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(DEFAULT_PREFERENCES));
    return DEFAULT_PREFERENCES;
  }
}
