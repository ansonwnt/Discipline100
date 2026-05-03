import { View, Text, Pressable, StyleSheet, Platform, Alert, TextInput, KeyboardAvoidingView, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../src/constants/colors';
import { useAuth } from '../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';

const PRIVACY_POLICY_URL = 'https://ansonwnt.github.io/Discipline100/privacy-policy.html';

export default function SignInScreen() {
  const router = useRouter();
  const { signInWithApple, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleApple = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await signInWithApple();
      router.replace('/');
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message || 'Something went wrong');
    }
  };

  const handleGoogle = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await signInWithGoogle();
      router.replace('/');
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message || 'Something went wrong');
    }
  };

  const handleEmail = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (isSignUp) {
        await signUpWithEmail(email.trim(), password);
      } else {
        await signInWithEmail(email.trim(), password);
      }
      router.replace('/');
    } catch (error: any) {
      Alert.alert(isSignUp ? 'Sign Up Failed' : 'Sign In Failed', error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="rgba(26,26,26,0.4)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="rgba(26,26,26,0.4)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Pressable style={styles.emailBtn} onPress={handleEmail} disabled={loading}>
              <Text style={styles.emailBtnText}>{loading ? 'Please wait…' : isSignUp ? 'Create Account' : 'Sign In with Email'}</Text>
            </Pressable>

            <Pressable onPress={() => setIsSignUp(v => !v)}>
              <Text style={styles.toggleText}>
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.terms}>
            By continuing, you agree to our Terms of Service and{' '}
            <Text style={styles.termsLink} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
              Privacy Policy
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.yellow },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  header: { alignItems: 'center', marginBottom: 48 },
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
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(26,26,26,0.15)' },
  dividerText: { fontSize: 13, fontWeight: '600', color: 'rgba(26,26,26,0.4)' },
  input: {
    width: '100%', padding: 16, backgroundColor: '#FFFFFF', borderRadius: 14,
    fontSize: 15, fontWeight: '600', color: '#1A1A1A',
    borderWidth: 2, borderColor: 'rgba(26,26,26,0.1)',
  },
  emailBtn: {
    padding: 18, backgroundColor: '#1A1A1A', borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  emailBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  toggleText: {
    textAlign: 'center', fontSize: 13, fontWeight: '600',
    color: 'rgba(26,26,26,0.55)', textDecorationLine: 'underline',
  },
  terms: {
    fontSize: 12, fontWeight: '600', color: 'rgba(26,26,26,0.4)',
    textAlign: 'center', marginTop: 24, lineHeight: 18, maxWidth: 280,
  },
  termsLink: {
    color: '#1A1A1A',
    textDecorationLine: 'underline',
  },
});
