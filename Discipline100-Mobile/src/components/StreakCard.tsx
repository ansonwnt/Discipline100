import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { calcStreak } from '../utils/streak';
import { useApp } from '../context/AppContext';
import Animated, { useAnimatedStyle, withRepeat, withTiming, useSharedValue, withSequence } from 'react-native-reanimated';
import { useEffect } from 'react';

export function StreakCard() {
  const { state } = useApp();
  const { theme } = useTheme();
  const { current, best } = calcStreak(state.history);
  const onFire = current >= 2;
  const scale = useSharedValue(1);

  useEffect(() => {
    if (onFire) {
      scale.value = withRepeat(
        withSequence(withTiming(1.15, { duration: 750 }), withTiming(1, { duration: 750 })),
        -1, true
      );
    }
  }, [onFire]);

  const fireStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const label = current === 0
    ? 'No streak yet — start today!'
    : current >= 5 ? 'Unstoppable!'
    : current >= 2 ? 'Keep it going!'
    : 'Streak started!';

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }, onFire && { borderColor: Colors.yellow }]}>
      <Animated.View style={[styles.fire, fireStyle]}>
        <Ionicons name={current === 0 ? 'moon' : 'flame'} size={32} color={current === 0 ? theme.textSecondary : '#FF6B00'} />
      </Animated.View>
      <View style={styles.info}>
        <View style={styles.countRow}>
          <Text style={[styles.count, { color: theme.text }]}>{current}</Text>
          <Text style={[styles.countUnit, { color: theme.textSecondary }]}> day{current !== 1 ? 's' : ''}</Text>
        </View>
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      </View>
      <View style={styles.best}>
        <Text style={styles.bestValue}>{best}</Text>
        <Text style={styles.bestLabel}>BEST</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.gray,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  cardFire: {
    borderColor: Colors.yellow,
    backgroundColor: Colors.yellowPale,
    shadowColor: Colors.yellow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  fire: { width: 36, height: 36, justifyContent: 'center' as const, alignItems: 'center' as const },
  info: { flex: 1 },
  countRow: { flexDirection: 'row', alignItems: 'baseline' },
  count: { fontSize: 28, fontWeight: '700', color: Colors.black },
  countUnit: { fontSize: 14, fontWeight: '800', color: Colors.grayDark },
  label: { fontSize: 12, fontWeight: '700', color: Colors.grayDark, marginTop: 2 },
  best: { alignItems: 'flex-end' },
  bestValue: { fontSize: 18, fontWeight: '700', color: Colors.brown },
  bestLabel: { fontSize: 10, fontWeight: '700', color: Colors.grayDark, letterSpacing: 1 },
});
