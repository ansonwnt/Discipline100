import { View, Text, StyleSheet, Image } from 'react-native';
import { useEffect, useState } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  withRepeat,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  onFinish: () => void;
}

export function AnimatedSplash({ onFinish }: Props) {
  // Animation values
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const bellRotate = useSharedValue(0);
  const taglineY = useSharedValue(30);
  const taglineOpacity = useSharedValue(0);
  const flashScale = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const bgScale = useSharedValue(1);
  const wholeOpacity = useSharedValue(1);

  useEffect(() => {
    // Step 1: Logo bounces in (0-600ms)
    logoOpacity.value = withTiming(1, { duration: 300 });
    logoScale.value = withSpring(1, { damping: 8, stiffness: 120 });

    // Step 2: Bell wiggles (500-1200ms)
    bellRotate.value = withDelay(
      500,
      withSequence(
        withTiming(15, { duration: 80 }),
        withTiming(-15, { duration: 80 }),
        withTiming(12, { duration: 70 }),
        withTiming(-12, { duration: 70 }),
        withTiming(8, { duration: 60 }),
        withTiming(-8, { duration: 60 }),
        withTiming(0, { duration: 60 }),
      )
    );

    // Step 3: Flash/sparkle burst (800ms)
    flashScale.value = withDelay(800, withSequence(
      withTiming(1.5, { duration: 200 }),
      withTiming(0, { duration: 300 }),
    ));
    flashOpacity.value = withDelay(800, withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 400 }),
    ));

    // Step 4: Tagline fades in (1000ms)
    taglineOpacity.value = withDelay(1000, withTiming(1, { duration: 400 }));
    taglineY.value = withDelay(1000, withSpring(0, { damping: 12 }));

    // Step 5: Subtle background pulse (1200ms)
    bgScale.value = withDelay(1200, withSequence(
      withTiming(1.02, { duration: 300 }),
      withTiming(1, { duration: 300 }),
    ));

    // Step 6: Fade out everything and finish (2200ms)
    wholeOpacity.value = withDelay(2200, withTiming(0, { duration: 400 }, () => {
      runOnJS(onFinish)();
    }));
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const bellStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${bellRotate.value}deg` }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: taglineY.value }],
    opacity: taglineOpacity.value,
  }));

  const flashStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flashScale.value }],
    opacity: flashOpacity.value,
  }));

  const bgStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: wholeOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Animated.View style={[styles.bg, bgStyle]}>
        {/* Flash burst */}
        <Animated.View style={[styles.flash, flashStyle]}>
          <View style={styles.flashInner} />
        </Animated.View>

        {/* Logo */}
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          {/* "1" */}
          <Text style={styles.digit1}>1</Text>

          {/* "0" with bell */}
          <View style={styles.zeroWrap}>
            <Text style={styles.digit0}>0</Text>
            <Animated.View style={[styles.bellWrap, bellStyle]}>
              <Ionicons name="notifications" size={28} color="#1A1A1A" />
            </Animated.View>
          </View>

          {/* Second "0" with signal waves */}
          <View style={styles.zeroWrap2}>
            <Text style={styles.digit0}>0</Text>
            <View style={styles.signalWrap}>
              <Ionicons name="wifi" size={16} color="#E53935" style={{ transform: [{ rotate: '45deg' }] }} />
            </View>
            <View style={styles.redDot} />
          </View>
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={taglineStyle}>
          <Text style={styles.tagline}>Wake Up or Pay Up</Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  bg: {
    flex: 1,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flash: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  flashInner: {
    flex: 1,
    borderRadius: 100,
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  digit1: {
    fontSize: 80,
    fontWeight: '900',
    color: '#1A1A1A',
    lineHeight: 88,
  },
  zeroWrap: {
    position: 'relative',
  },
  digit0: {
    fontSize: 80,
    fontWeight: '900',
    color: '#1A1A1A',
    lineHeight: 88,
  },
  bellWrap: {
    position: 'absolute',
    top: 18,
    left: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zeroWrap2: {
    position: 'relative',
  },
  signalWrap: {
    position: 'absolute',
    top: 8,
    right: -12,
  },
  redDot: {
    position: 'absolute',
    top: 30,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E53935',
  },
  tagline: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    marginTop: 24,
    letterSpacing: 0.5,
  },
});
