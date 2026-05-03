/**
 * Local Notification fallback for killed-app alarm scenario.
 *
 * When the app is force-quit on iOS < 26 (where AlarmKit is unavailable),
 * the JS watcher stops. This schedules a daily local notification at each
 * alarm time so the user still gets a sound + banner even if the app is dead.
 *
 * On iOS 26+ / Android, the native AlarmService takes priority — these
 * notifications fire too but the native alarm gets there first.
 */

import * as Notifications from 'expo-notifications';
import { Alarm } from '../context/AppContext';

const ALARM_NOTIFICATION_PREFIX = 'alarm_notif_';

// Called once at app startup from _layout.tsx, not at import time
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return status === 'granted';
}

export async function hasNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

async function scheduleAlarmNotification(alarm: Alarm): Promise<void> {
  const [h, m] = alarm.time.split(':').map(Number);
  await Notifications.scheduleNotificationAsync({
    identifier: `${ALARM_NOTIFICATION_PREFIX}${alarm.id}`,
    content: {
      title: 'Discipline100 — Wake Up!',
      body: 'Your alarm is ringing. Open the app to dismiss.',
      sound: true,
      data: { alarmId: alarm.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      repeats: true,
      hour: h,
      minute: m,
      second: 0,
    },
  });
}

/**
 * Cancel all existing alarm notifications and re-schedule for currently
 * enabled alarms. Mirrors the pattern in syncAlarmsToNative.
 */
export async function syncLocalNotifications(alarms: Alarm[]): Promise<void> {
  try {
    const granted = await hasNotificationPermission();
    if (!granted) return;

    // Cancel all previously scheduled alarm notifications
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter(n => n.identifier.startsWith(ALARM_NOTIFICATION_PREFIX))
        .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );

    // Re-schedule enabled alarms
    await Promise.all(
      alarms.filter(a => a.enabled).map(a => scheduleAlarmNotification(a))
    );
  } catch (e) {
    console.warn('localNotifications: sync failed', e);
  }
}
