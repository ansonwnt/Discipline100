import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, useCallback, useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { AppProvider } from '../src/context/AppContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { AnimatedSplash } from '../src/components/AnimatedSplash';

// Keep the native splash visible while we load
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Hide the native static splash once JS has loaded
    SplashScreen.hideAsync();
  }, []);

  return (
    <AppProvider>
      <ThemeProvider>
        <StatusBar style="dark" />
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="set-alarm" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="alarm-ring" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
          </Stack>
          {showSplash && <AnimatedSplash onFinish={() => setShowSplash(false)} />}
        </View>
      </ThemeProvider>
    </AppProvider>
  );
}
