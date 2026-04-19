import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useApp } from '../src/context/AppContext';
import { Colors } from '../src/constants/colors';

export default function Index() {
  const { state, loaded } = useApp();

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.yellow }}>
        <ActivityIndicator size="large" color={Colors.black} />
      </View>
    );
  }

  if (state.onboarded) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(onboarding)/welcome" />;
}
