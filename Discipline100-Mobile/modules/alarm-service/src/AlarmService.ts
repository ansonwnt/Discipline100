import { NativeModule, requireNativeModule } from 'expo';

export interface AlarmConfig {
  id: string;
  hour: number;    // 0-23
  minute: number;  // 0-59
  title?: string;
  snoozeMinutes?: number;
}

interface AlarmServiceModule extends NativeModule {
  scheduleAlarm(config: AlarmConfig): Promise<boolean>;
  cancelAlarm(id: string): Promise<void>;
  cancelAllAlarms(): Promise<void>;
  requestPermission(): Promise<boolean>;
  hasPermission(): Promise<boolean>;
  stopAlarmSound(): Promise<void>;
}

let _module: AlarmServiceModule | null = null;

function getModule(): AlarmServiceModule {
  if (!_module) {
    _module = requireNativeModule<AlarmServiceModule>('AlarmService');
  }
  return _module;
}

export const AlarmService = {
  /**
   * Schedule an alarm. Returns true if successful.
   * iOS: Uses AlarmKit (iOS 26+)
   * Android: Uses AlarmManager with SCHEDULE_EXACT_ALARM
   */
  async schedule(config: AlarmConfig): Promise<boolean> {
    return getModule().scheduleAlarm({
      snoozeMinutes: 5,
      title: 'Discipline100 — Wake Up!',
      ...config,
    });
  },

  /**
   * Cancel a scheduled alarm by ID.
   */
  async cancel(id: string): Promise<void> {
    return getModule().cancelAlarm(id);
  },

  /**
   * Cancel all scheduled alarms.
   */
  async cancelAll(): Promise<void> {
    return getModule().cancelAllAlarms();
  },

  /**
   * Request alarm permission from the user.
   * iOS: AlarmKit authorization prompt
   * Android: SCHEDULE_EXACT_ALARM permission check
   */
  async requestPermission(): Promise<boolean> {
    return getModule().requestPermission();
  },

  /**
   * Check if alarm permission is granted.
   */
  async hasPermission(): Promise<boolean> {
    return getModule().hasPermission();
  },

  /**
   * Stop any currently playing alarm sound.
   */
  async stopSound(): Promise<void> {
    return getModule().stopAlarmSound();
  },
};
