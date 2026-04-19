import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Colors } from '../../src/constants/colors';
import { useApp } from '../../src/context/AppContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function Name() {
  const router = useRouter();
  const { dispatch } = useApp();
  const [name, setName] = useState('');

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dispatch({ type: 'SET_NAME', name: name.trim() });
    router.push('/(onboarding)/wallet-reveal');
  };

  const handleSkip = () => {
    dispatch({ type: 'SET_NAME', name: '' });
    router.push('/(onboarding)/wallet-reveal');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        <Ionicons name="hand-left" size={56} color={Colors.yellow} />
        <Text style={styles.title}>What should we call you?</Text>
        <Text style={styles.sub}>We'll personalize your wake-up experience</Text>

        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor={Colors.grayDark}
          value={name}
          onChangeText={setName}
          maxLength={20}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleContinue}
        />

        <Pressable style={styles.btn} onPress={handleContinue}>
          <Text style={styles.btnText}>CONTINUE</Text>
        </Pressable>

        <Pressable onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>

        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  emoji: { fontSize: 56, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '900', color: Colors.black, marginBottom: 8 },
  sub: { fontSize: 15, fontWeight: '600', color: Colors.grayDark, marginBottom: 32 },
  input: {
    width: '100%', padding: 18, fontSize: 20, fontWeight: '700',
    textAlign: 'center', backgroundColor: Colors.gray,
    borderRadius: 16, borderWidth: 2, borderColor: Colors.grayMid,
    color: Colors.black, marginBottom: 20,
  },
  btn: {
    width: '100%', paddingVertical: 18, backgroundColor: Colors.yellow,
    borderRadius: 16, alignItems: 'center',
    shadowColor: Colors.yellow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  btnText: { fontSize: 16, fontWeight: '800', color: Colors.black, letterSpacing: 0.5 },
  skipBtn: { marginTop: 12, padding: 8 },
  skipText: { fontSize: 14, fontWeight: '700', color: Colors.grayDark },
  dots: { flexDirection: 'row', gap: 8, marginTop: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.grayMid },
  dotActive: { width: 24, backgroundColor: Colors.yellow },
});
