/**
 * Background Alarm Manager
 *
 * Uses a silent audio loop (volume = 0) to keep the app alive in the background.
 * While the audio session is active, iOS won't suspend the app, so our JS timer
 * can check the current time and fire the alarm when it matches.
 *
 * Works on all iOS versions. Sound respects device volume; vibrates on silent.
 */

import { Audio } from 'expo-av';

export interface AlarmEntry {
  id: number;
  time: string; // "HH:MM" 24-hour
  enabled: boolean;
}

let silentSound: Audio.Sound | null = null;
let alarmSound: Audio.Sound | null = null;
let checkInterval: ReturnType<typeof setInterval> | null = null;
let onFireCallback: ((id: number) => void) | null = null;

// Track which alarms already fired today to avoid double-firing
const firedToday: Map<string, Set<number>> = new Map(); // "YYYY-MM-DD" -> Set<alarmId>

// JS-side snooze tracking (used on iOS < 26 where AlarmKit is unavailable)
let pendingSnooze: { id: number; at: number } | null = null;

export function scheduleJsSnooze(alarmId: number, minutes: number): void {
  pendingSnooze = { id: alarmId, at: Date.now() + minutes * 60 * 1000 };
}

// ─── Audio session ────────────────────────────────────────────────────────────

async function setAudioMode(playing: boolean) {
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: playing,  // true only during alarm so it can ring
    staysActiveInBackground: true,
    shouldDuckAndroid: false,
  });
}

// ─── Silent keepalive ─────────────────────────────────────────────────────────

export async function startSilentLoop(): Promise<void> {
  if (silentSound) return;
  try {
    await Audio.setAudioModeAsync({ staysActiveInBackground: true, playsInSilentModeIOS: false });
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/silent.wav'),
      { isLooping: true, volume: 0, shouldPlay: true }
    );
    silentSound = sound;
  } catch (e) {
    console.warn('backgroundAlarm: silent loop failed', e);
  }
}

export async function stopSilentLoop(): Promise<void> {
  if (!silentSound) return;
  try {
    await silentSound.stopAsync();
    await silentSound.unloadAsync();
  } catch {}
  silentSound = null;
}

// ─── Alarm sound ──────────────────────────────────────────────────────────────

export async function playAlarmAudio(): Promise<void> {
  await stopAlarmAudio();
  try {
    // Switch to playback mode so alarm rings even on silent switch
    await setAudioMode(true);
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/alarm.wav'),
      { isLooping: true, volume: 1.0, shouldPlay: true }
    );
    alarmSound = sound;
  } catch (e) {
    console.warn('backgroundAlarm: alarm sound failed', e);
  }
}

export async function stopAlarmAudio(): Promise<void> {
  if (!alarmSound) return;
  try {
    await alarmSound.stopAsync();
    await alarmSound.unloadAsync();
  } catch {}
  alarmSound = null;
  // Revert to ambient mode after alarm stops
  try {
    await setAudioMode(false);
  } catch {}
}

// ─── Watcher ──────────────────────────────────────────────────────────────────

export function startAlarmWatcher(
  alarms: AlarmEntry[],
  onFire: (id: number) => void
): void {
  onFireCallback = onFire;

  const hasEnabled = alarms.some(a => a.enabled);

  if (!hasEnabled) {
    stopAlarmWatcher();
    return;
  }

  startSilentLoop();

  // Restart interval with updated alarms
  if (checkInterval) clearInterval(checkInterval);
  checkAlarms(alarms); // check immediately
  checkInterval = setInterval(() => checkAlarms(alarms), 30_000);
}

export function stopAlarmWatcher(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  stopSilentLoop();
  onFireCallback = null;
}

function checkAlarms(alarms: AlarmEntry[]): void {
  // Check JS-side snooze first (fires on current iOS where AlarmKit is unavailable)
  if (pendingSnooze && Date.now() >= pendingSnooze.at) {
    const { id } = pendingSnooze;
    pendingSnooze = null;
    onFireCallback?.(id);
    return;
  }

  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const today = now.toISOString().slice(0, 10);

  // Clean up old dates
  if (!firedToday.has(today)) {
    firedToday.clear();
    firedToday.set(today, new Set());
  }
  const fired = firedToday.get(today)!;

  for (const alarm of alarms) {
    if (!alarm.enabled) continue;
    if (fired.has(alarm.id)) continue;

    const [ah, am] = alarm.time.split(':').map(Number);
    if (ah === h && am === m) {
      fired.add(alarm.id);
      onFireCallback?.(alarm.id);
      break;
    }
  }
}
