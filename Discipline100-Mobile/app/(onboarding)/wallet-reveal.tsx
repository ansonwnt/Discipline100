import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Colors } from '../../src/constants/colors';
import { useApp } from '../../src/context/AppContext';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function WalletReveal() {
  const router = useRouter();
  const { state, dispatch } = useApp();
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    const timer = setTimeout(() => {
      interval = setInterval(() => {
        setCounter(prev => {
          const next = prev + Math.ceil((100 - prev) / 8) || 1;
          if (next >= 100) {
            if (interval) clearInterval(interval);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return 100;
          }
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          return next;
        });
      }, 40);
    }, 600);
    return () => {
      clearTimeout(timer);
      if (interval) clearInterval(interval);
    };
  }, []);

  const handleGo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    dispatch({ type: 'FINISH_ONBOARDING' });
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.greeting}>
          {state.name ? `Hey ${state.name}!` : 'Hey there!'}
        </Text>
        <Text style={styles.title}>Here's your starting score</Text>

        <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.wallet}>
          <View style={styles.walletShine} />
          <Text style={styles.walletLabel}>YOUR SCORE</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.score}>{counter}</Text>
            <Text style={styles.unit}>pts</Text>
          </View>
        </Animated.View>

        <Text style={styles.note}>
          Use them wisely. Every snooze after the first costs a point.
        </Text>

        <Pressable style={styles.btn} onPress={handleGo}>
          <Text style={styles.btnText}>LET'S GO!</Text>
        </Pressable>

        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  greeting: { fontSize: 18, fontWeight: '700', color: Colors.grayDark, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '900', color: Colors.black, marginBottom: 32 },
  wallet: {
    width: '100%', borderRadius: 24, padding: 32,
    backgroundColor: Colors.yellow, overflow: 'hidden',
    shadowColor: Colors.yellow, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 15, elevation: 10,
    marginBottom: 16,
  },
  walletShine: {
    position: 'absolute', top: -40, right: -40,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  walletLabel: {
    fontSize: 12, fontWeight: '800', color: 'rgba(139,69,19,0.7)',
    letterSpacing: 2, marginBottom: 8,
  },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  score: { fontSize: 64, fontWeight: '700', color: Colors.black },
  unit: { fontSize: 20, fontWeight: '800', color: 'rgba(26,26,26,0.5)' },
  note: { fontSize: 14, fontWeight: '600', color: Colors.grayDark, textAlign: 'center', marginBottom: 40, lineHeight: 21 },
  btn: {
    width: '100%', paddingVertical: 18, backgroundColor: Colors.yellow,
    borderRadius: 16, alignItems: 'center',
    shadowColor: Colors.yellow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  btnText: { fontSize: 16, fontWeight: '800', color: Colors.black, letterSpacing: 0.5 },
  dots: { flexDirection: 'row', gap: 8, marginTop: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.grayMid },
  dotActive: { width: 24, backgroundColor: Colors.yellow },
});
