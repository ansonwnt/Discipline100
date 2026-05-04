import { View } from 'react-native';
import { Stack, useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StripeProvider } from '@stripe/stripe-react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { AppProvider, useApp } from '../src/context/AppContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { AnimatedSplash } from '../src/components/AnimatedSplash';
import { STRIPE_PUBLISHABLE_KEY } from '../src/constants/stripe';
import { startAlarmWatcher, stopAlarmWatcher, stopAlarmAudio, isAlarmSoundPlaying } from '../src/utils/backgroundAlarm';
import * as Notifications from 'expo-notifications';
import { configureNotificationHandler, cancelSnoozeNotification } from '../src/utils/localNotifications';

// Configure notification appearance before any component mounts
configureNotificationHandler();

// Keep the native splash visible while we load
SplashScreen.preventAutoHideAsync();

// Watches alarm state and manages background audio keepalive + alarm firing
function AlarmWatcher() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const prevActiveAlarmId = useRef<number | null>(null);

  // Restart watcher when alarms change. No cleanup here — startAlarmWatcher clears its
  // own interval internally, avoiding the brief silent-loop gap caused by stopAlarmWatcher().
  useEffect(() => {
    startAlarmWatcher(state.alarms, (id) => {
      cancelSnoozeNotification(id);
      dispatch({ type: 'TRIGGER_ALARM', id });
      router.push(`/alarm-ring?alarmId=${id}`);
    });
  }, [state.alarms]);

  // Stop everything only on unmount (sign-out / app teardown).
  useEffect(() => {
    return () => { stopAlarmWatcher(); };
  }, []);

  // Handle notification tap (killed-app fallback: user taps banner to open alarm-ring)
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as { alarmId?: number };
      if (data?.alarmId && !pathname.includes('alarm-ring')) {
        dispatch({ type: 'TRIGGER_ALARM', id: data.alarmId });
        router.push(`/alarm-ring?alarmId=${data.alarmId}`);
      }
    });
    return () => sub.remove();
  }, [pathname]);

  // Stop audio when alarm is toggled off or deleted while actively ringing
  useEffect(() => {
    const prev = prevActiveAlarmId.current;
    prevActiveAlarmId.current = state.activeAlarmId;

    if (prev === null) return;

    if (state.activeAlarmId === null) {
      // activeAlarmId was cleared externally (e.g. DELETE_ALARM).
      // Only act if audio is still playing — normal DISMISS already handled it.
      const wasPlaying = isAlarmSoundPlaying();
      stopAlarmAudio();
      if (wasPlaying && pathname.includes('alarm-ring') && router.canGoBack()) {
        router.back();
      }
      return;
    }

    // activeAlarmId still set but alarm was disabled (TOGGLE_ALARM)
    const active = state.alarms.find(a => a.id === state.activeAlarmId);
    if (!active || !active.enabled) {
      stopAlarmAudio();
      dispatch({ type: 'DISMISS' });
      if (pathname.includes('alarm-ring') && router.canGoBack()) {
        router.back();
      }
    }
  }, [state.alarms, state.activeAlarmId]);

  return null;
}


function AppContent() {
  const { user } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <AppProvider uid={user?.uid}>
      <ThemeProvider>
        <AlarmWatcher />
        <StatusBar style="dark" />
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="sign-in" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="set-alarm" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="alarm-ring" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
            <Stack.Screen name="tier-selection" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
          </Stack>
          {showSplash && <AnimatedSplash onFinish={() => setShowSplash(false)} />}
        </View>
      </ThemeProvider>
    </AppProvider>
  );
}

export default function RootLayout() {
  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </StripeProvider>
  );
}
