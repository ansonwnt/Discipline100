import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { useApp } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const { state, loaded: appLoaded } = useApp();

  // Wait for auth first
  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.yellow }}>
        <ActivityIndicator size="large" color="#1A1A1A" />
      </View>
    );
  }

  // Not signed in — go straight to sign-in, don't wait for app state
  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  // Signed in but app state still loading
  if (!appLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.yellow }}>
        <ActivityIndicator size="large" color="#1A1A1A" />
      </View>
    );
  }

  // Signed in but not onboarded
  if (!state.onboarded) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  // Signed in + onboarded
  return <Redirect href="/(tabs)" />;
}
