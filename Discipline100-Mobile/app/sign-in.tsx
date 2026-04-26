import { View, Text, Pressable, StyleSheet, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../src/constants/colors';
import { useAuth } from '../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function SignInScreen() {
  const router = useRouter();
  const { signInWithApple, signInWithGoogle } = useAuth();

  const handleApple = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await signInWithApple();
      // Auth state change will trigger navigation via index.tsx
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message || 'Something went wrong');
    }
  };

  const handleGoogle = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await signInWithGoogle();
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message || 'Something went wrong');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoIcon}>
            <Ionicons name="flash" size={32} color={Colors.white} />
          </View>
          <Text style={styles.title}>Discipline100</Text>
          <Text style={styles.subtitle}>Wake Up or Pay Up</Text>
        </View>

        <View style={styles.buttons}>
          {Platform.OS === 'ios' && (
            <Pressable style={styles.appleBtn} onPress={handleApple}>
              <Ionicons name="logo-apple" size={22} color="#FFFFFF" />
              <Text style={styles.appleBtnText}>Continue with Apple</Text>
            </Pressable>
          )}

          <Pressable style={styles.googleBtn} onPress={handleGoogle}>
            <Ionicons name="logo-google" size={20} color="#1A1A1A" />
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </Pressable>
        </View>

        <Text style={styles.terms}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.yellow },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  header: { alignItems: 'center', marginBottom: 60 },
  logoIcon: {
    width: 80, height: 80, backgroundColor: '#1A1A1A', borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 10,
  },
  title: { fontSize: 32, fontWeight: '900', color: '#1A1A1A', marginBottom: 6 },
  subtitle: { fontSize: 16, fontWeight: '600', color: 'rgba(26,26,26,0.5)' },
  buttons: { width: '100%', gap: 14 },
  appleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: 18, backgroundColor: '#1A1A1A', borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  appleBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: 18, backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 2, borderColor: 'rgba(26,26,26,0.1)',
  },
  googleBtnText: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  terms: {
    fontSize: 12, fontWeight: '600', color: 'rgba(26,26,26,0.4)',
    textAlign: 'center', marginTop: 24, lineHeight: 18, maxWidth: 280,
  },
});
