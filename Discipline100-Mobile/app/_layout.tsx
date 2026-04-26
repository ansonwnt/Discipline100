import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StripeProvider } from '@stripe/stripe-react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { AppProvider } from '../src/context/AppContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { AnimatedSplash } from '../src/components/AnimatedSplash';
import { STRIPE_PUBLISHABLE_KEY } from '../src/constants/stripe';

// Keep the native splash visible while we load
SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { user } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <AppProvider uid={user?.uid}>
      <ThemeProvider>
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
