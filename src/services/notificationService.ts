import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { TimetableWithSubject } from '../types/models';
import { DateUtils } from '../utils/dateUtils';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  static async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  }

  static async setupChannels(): Promise<void> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('lectura_classes', {
        name: 'Class Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6750A4',
        sound: 'default',
      });
    }
  }

  static async scheduleClassReminders(
    timetableWithSubjects: TimetableWithSubject[],
    leadMinutes: number = 10,
    sound: boolean = true,
    vibrate: boolean = true
  ): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();

      for (const item of timetableWithSubjects) {
        const { entry, subject } = item;
        const [hStr, mStr] = entry.startTime.split(':');
        const startHour = parseInt(hStr, 10);
        const startMin = parseInt(mStr, 10);

        let triggerHour = startHour;
        let triggerMin = startMin - (entry.reminderMinutes || leadMinutes);
        if (triggerMin < 0) {
          triggerMin += 60;
          triggerHour -= 1;
        }
        if (triggerHour < 0) {
          triggerHour += 24;
        }

        // expo-notifications weekly trigger: 1 = Sunday, 2 = Monday, ..., 7 = Saturday
        // entry.dayOfWeek: 1 = Monday, ..., 7 = Sunday
        const weekdayMapping: { [key: number]: number } = {
          1: 2, // Monday -> 2
          2: 3, // Tuesday -> 3
          3: 4, // Wednesday -> 4
          4: 5, // Thursday -> 5
          5: 6, // Friday -> 6
          6: 7, // Saturday -> 7
          7: 1, // Sunday -> 1
        };

        const expoWeekday = weekdayMapping[entry.dayOfWeek] || 2;

        const location = entry.roomOverride || subject.room;
        const teacher = entry.teacherOverride || subject.teacherName;
        const subInfo = [location, teacher].filter(Boolean).join(' • ');

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Upcoming: ${subject.name}`,
            body: `Starts at ${DateUtils.formatTime(entry.startTime)}${subInfo ? ` (${subInfo})` : ''}. Don't forget to mark attendance!`,
            data: {
              subjectId: subject.id,
              timetableEntryId: entry.id,
            },
            sound: sound ? 'default' : undefined,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: expoWeekday,
            hour: triggerHour,
            minute: triggerMin,
            channelId: 'lectura_classes',
          },
        });
      }
    } catch {
      // Ignore scheduling errors on unsupported platforms/emulators
    }
  }

  static async cancelAllReminders(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {
      // Ignore
    }
  }
}
