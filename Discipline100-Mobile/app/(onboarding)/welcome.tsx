import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, withRepeat, withTiming, useSharedValue, withSequence } from 'react-native-reanimated';
import { useEffect } from 'react';

export default function Welcome() {
  const router = useRouter();
  const floatY = useSharedValue(0);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(withTiming(-10, { duration: 1500 }), withTiming(0, { duration: 1500 })),
      -1, false
    );
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={[styles.icon, iconStyle]}>
          <Ionicons name="flash" size={48} color={Colors.yellow} />
        </Animated.View>

        <Text style={styles.title}>Stop snoozing.{'\n'}Start winning.</Text>
        <Text style={styles.sub}>Every snooze costs you points. Stay disciplined, keep your score.</Text>

        <Pressable style={styles.btn} onPress={() => router.push('/(onboarding)/how-it-works')}>
          <Text style={styles.btnText}>GET STARTED</Text>
        </Pressable>

        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.yellow,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  icon: {
    width: 100,
    height: 100,
    backgroundColor: Colors.white,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  iconText: { fontSize: 52 },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.black,
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 12,
  },
  sub: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(26,26,26,0.6)',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 24,
    marginBottom: 48,
  },
  btn: {
    width: '100%',
    maxWidth: 300,
    paddingVertical: 18,
    backgroundColor: Colors.black,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.yellow,
    letterSpacing: 1,
  },
  dots: { flexDirection: 'row', gap: 8, marginTop: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(26,26,26,0.2)' },
  dotActive: { width: 24, backgroundColor: Colors.black },
});
