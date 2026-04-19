import { Alarm } from '../context/AppContext';

/**
 * Sync all enabled alarms to native alarm system.
 * Called on app load (to recover after reboot) and after alarm changes.
 * Wrapped in try/catch so it works gracefully in Expo Go (no native module).
 */
export async function syncAlarmsToNative(alarms: Alarm[]): Promise<void> {
  try {
    const { AlarmService } = require('../../modules/alarm-service/src');

    // First, request permission if needed
    const hasPerms = await AlarmService.hasPermission();
    if (!hasPerms) {
      const granted = await AlarmService.requestPermission();
      if (!granted) {
        console.warn('Alarm permission not granted');
        return;
      }
    }

    // Cancel all existing alarms, then re-schedule enabled ones
    await AlarmService.cancelAll();

    for (const alarm of alarms) {
      if (alarm.enabled) {
        const [h, m] = alarm.time.split(':').map(Number);
        await AlarmService.schedule({
          id: alarm.id.toString(),
          hour: h,
          minute: m,
        });
      }
    }
  } catch (e) {
    // Native module not available (Expo Go) — silent fail
    console.log('AlarmService not available, skipping native sync');
  }
}

/**
 * Cancel a single native alarm by ID.
 */
export async function cancelNativeAlarm(id: number): Promise<void> {
  try {
    const { AlarmService } = require('../../modules/alarm-service/src');
    await AlarmService.cancel(id.toString());
  } catch {}
}

/**
 * Schedule a snooze alarm (fires in X minutes from now).
 */
export async function scheduleSnoozeAlarm(alarmId: number, minutes: number): Promise<void> {
  try {
    const { AlarmService } = require('../../modules/alarm-service/src');
    const snoozeTime = new Date(Date.now() + minutes * 60 * 1000);
    await AlarmService.schedule({
      id: `snooze_${alarmId}`,
      hour: snoozeTime.getHours(),
      minute: snoozeTime.getMinutes(),
      title: 'Discipline100 — Snooze Over!',
    });
  } catch (e) {
    console.warn('Failed to schedule snooze:', e);
  }
}

/**
 * Stop the native alarm sound.
 */
export async function stopNativeSound(): Promise<void> {
  try {
    const { AlarmService } = require('../../modules/alarm-service/src');
    await AlarmService.stopSound();
  } catch {}
}
