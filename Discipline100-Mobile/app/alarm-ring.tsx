import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { Colors } from '../src/constants/colors';
import { HOLD_DURATION_MS, SNOOZE_DURATION_MS, snoozeCostCents, formatUSD } from '../src/constants/config';
import { scheduleSnoozeAlarm } from '../src/utils/alarmSync';
import { playAlarmAudio, stopAlarmAudio, startSilentLoop, scheduleJsSnooze } from '../src/utils/backgroundAlarm';
import { useApp, fmt12, guiltMsg } from '../src/context/AppContext';
import { useAuth } from '../src/context/AuthContext';
import { deductSnoozeBalance } from '../src/utils/firestoreSync';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withSequence, useAnimatedProps,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING_R = 64;
const RING_C = 2 * Math.PI * RING_R;

type Step = 'alarm' | 'math' | 'hold';

export default function AlarmRingScreen() {
  const router = useRouter();
  const { alarmId } = useLocalSearchParams<{ alarmId: string }>();
  const { state, dispatch } = useApp();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('alarm');
  const [mathProblem, setMathProblem] = useState('');
  const [mathAnswer, setMathAnswer] = useState(0);
  const [mathInput, setMathInput] = useState('');
  const [mathError, setMathError] = useState('');
  const [, setHolding] = useState(false);
  const [holdDone, setHoldDone] = useState(false);
  const holdTimer = useRef<NodeJS.Timeout | null>(null);

  // activeAlarmId is already set by AlarmWatcher before navigating here

  // Use activeAlarmId from state, fall back to route param for first render
  const targetId = state.activeAlarmId ?? (alarmId ? parseInt(alarmId) : null);
  const alarm = targetId ? state.alarms.find(a => a.id === targetId) : undefined;
  const ringRotate = useSharedValue(0);
  const holdProgress = useSharedValue(RING_C);

  useEffect(() => {
    ringRotate.value = withRepeat(
      withSequence(withTiming(20, { duration: 150 }), withTiming(-20, { duration: 150 }), withTiming(0, { duration: 150 })),
      -1
    );
    playAlarmAudio();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    return () => {
      stopAlarmAudio();
      if (holdTimer.current) clearTimeout(holdTimer.current);
    };
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ringRotate.value}deg` }],
  }));

  // Sound is managed by backgroundAlarm.ts (playAlarmAudio / stopAlarmAudio)

  // ===== SNOOZE =====
  const handleSnooze = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const costCents = state.tier ? snoozeCostCents(state.tier, state.snoozeCount) : 0;
    const actualCost = Math.min(costCents, state.balance);

    dispatch({ type: 'SNOOZE' });
    await stopAlarmAudio();
    startSilentLoop(); // resume keepalive for next alarm check

    if (user && actualCost > 0) {
      deductSnoozeBalance(user.uid, actualCost);
    }

    if (alarm) {
      const snoozeMinutes = SNOOZE_DURATION_MS / 60000;
      scheduleJsSnooze(alarm.id, snoozeMinutes); // JS watcher re-fires (works on all iOS)
      await scheduleSnoozeAlarm(alarm.id, snoozeMinutes); // native fallback (iOS 26+ / Android)
    }

    router.back();
  };

  // ===== DISMISS FLOW =====
  const startMathChallenge = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    generateMathProblem();
    setStep('math');
  };

  function generateMathProblem() {
    const difficulty = Math.min(state.snoozeCount, 3);
    let a: number, b: number, answer: number, display: string;

    if (difficulty <= 1) {
      a = 10 + Math.floor(Math.random() * 40);
      b = 10 + Math.floor(Math.random() * 40);
      answer = a + b;
      display = `${a} + ${b} = ?`;
    } else if (difficulty === 2) {
      a = 20 + Math.floor(Math.random() * 80);
      b = 10 + Math.floor(Math.random() * 50);
      if (Math.random() > 0.5) { answer = a + b; display = `${a} + ${b} = ?`; }
      else { if (b > a) [a, b] = [b, a]; answer = a - b; display = `${a} - ${b} = ?`; }
    } else {
      a = 3 + Math.floor(Math.random() * 10);
      b = 3 + Math.floor(Math.random() * 10);
      answer = a * b;
      display = `${a} × ${b} = ?`;
    }

    setMathProblem(display);
    setMathAnswer(answer);
    setMathInput('');
    setMathError('');
  }

  const submitMath = () => {
    const val = parseInt(mathInput);
    if (isNaN(val) || mathInput === '') {
      setMathError('Enter a number!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (val !== mathAnswer) {
      setMathError('Wrong! Try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => { setMathInput(''); setMathError(''); }, 800);
      return;
    }
    // Correct!
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setStep('hold'), 500);
  };

  // ===== HOLD TO CONFIRM =====
  const startHold = () => {
    if (holdDone) return;
    if (holdTimer.current) clearTimeout(holdTimer.current); // cancel any prior incomplete hold
    setHolding(true);
    holdProgress.value = withTiming(0, { duration: HOLD_DURATION_MS });

    holdTimer.current = setTimeout(() => {
      setHoldDone(true);
      setHolding(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      stopAlarmAudio();
      setTimeout(() => {
        dispatch({ type: 'DISMISS' });
        router.back();
      }, 600);
    }, HOLD_DURATION_MS);
  };

  const endHold = () => {
    if (holdDone) return;
    setHolding(false);
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdProgress.value = withTiming(RING_C, { duration: 300 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const holdRingProps = useAnimatedProps(() => ({
    strokeDashoffset: holdProgress.value,
  }));

  // ===== RENDER =====
  if (step === 'math') {
    return (
      <View style={styles.overlay}>
        <Ionicons name="school" size={48} color={Colors.yellow} />
        <Text style={styles.mathTitle}>Prove you're awake!</Text>
        <Text style={styles.mathSub}>Solve this to dismiss your alarm</Text>
        <Text style={styles.mathProblem}>{mathProblem}</Text>
        <TextInput
          style={[styles.mathInput, mathError ? styles.mathInputWrong : null]}
          value={mathInput}
          onChangeText={setMathInput}
          keyboardType="number-pad"
          placeholder="?"
          placeholderTextColor="rgba(255,255,255,0.3)"
          maxLength={4}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={submitMath}
        />
        {!!mathError && <Text style={styles.mathError}>{mathError}</Text>}
        <Pressable style={styles.mathGoBtn} onPress={submitMath}>
          <Text style={styles.mathGoBtnText}>GO</Text>
        </Pressable>
      </View>
    );
  }

  if (step === 'hold') {
    return (
      <View style={styles.overlay}>
        <Text style={styles.holdTitle}>Almost there!</Text>
        <Text style={styles.holdSub}>Hold the button for 3 seconds</Text>

        <Pressable
          onPressIn={startHold}
          onPressOut={endHold}
          style={styles.holdWrap}
        >
          <Svg width={140} height={140} style={styles.holdSvg}>
            <Circle cx={70} cy={70} r={RING_R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} />
            <AnimatedCircle
              cx={70} cy={70} r={RING_R} fill="none"
              stroke={holdDone ? Colors.green : Colors.yellow}
              strokeWidth={6} strokeLinecap="round"
              strokeDasharray={RING_C}
              animatedProps={holdRingProps}
              transform="rotate(-90 70 70)"
            />
          </Svg>
          <View style={[styles.holdBtn, holdDone && styles.holdBtnDone]}>
            {holdDone
              ? <Ionicons name="checkmark" size={36} color={Colors.white} />
              : <Ionicons name="sunny" size={36} color={Colors.black} />
            }
          </View>
        </Pressable>

        <Text style={styles.holdHint}>{holdDone ? "You're up!" : 'Press & hold'}</Text>
      </View>
    );
  }

  // Main alarm view
  return (
    <View style={styles.overlay}>
      <Animated.View style={iconStyle}>
        <Ionicons name="alarm" size={72} color={Colors.yellow} />
      </Animated.View>
      <Text style={styles.alarmTime}>{alarm ? fmt12(alarm.time) : ''}</Text>
      <Text style={styles.alarmLabel}>WAKE UP!</Text>

      <Text style={[styles.guilt, state.balance <= 0 && styles.guiltDebt]}>
        {(() => {
          const lastCost = state.snoozeCount > 0 && state.tier ? snoozeCostCents(state.tier, state.snoozeCount - 1) : 0;
          return guiltMsg(state.snoozeCount, state.balance, state.name, lastCost);
        })()}
      </Text>
      {state.snoozeCount > 0 && (
        <Text style={styles.snoozeCount}>
          Snoozed {state.snoozeCount} time{state.snoozeCount > 1 ? 's' : ''}
        </Text>
      )}

      <View style={styles.scoreSection}>
        <Text style={[styles.score, state.balance <= 0 && styles.scoreNeg]}>{formatUSD(state.balance)}</Text>
        <Text style={styles.scoreLabel}>BALANCE REMAINING</Text>
      </View>

      <View style={styles.buttons}>
        <Pressable style={styles.imUpBtn} onPress={startMathChallenge}>
          <Text style={styles.imUpText}>I'M UP!</Text>
        </Pressable>
        <Pressable style={styles.snoozeBtn} onPress={handleSnooze}>
          <Text style={styles.snoozeText}>SNOOZE</Text>
          <Text style={styles.snoozeHint}>
            {(() => {
              const cost = state.tier ? snoozeCostCents(state.tier, state.snoozeCount) : 0;
              return cost === 0 ? '5 min · FREE' : `5 min · −${formatUSD(cost)}`;
            })()}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(26,26,26,0.97)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  alarmIcon: { fontSize: 72, marginBottom: 8 },
  alarmTime: { fontSize: 56, fontWeight: '700', color: Colors.white, letterSpacing: -3 },
  alarmLabel: { fontSize: 14, fontWeight: '800', color: Colors.yellow, letterSpacing: 4, marginTop: 2 },
  guilt: { fontSize: 18, fontWeight: '800', color: Colors.yellowGlow, marginTop: 32, textAlign: 'center', maxWidth: 320, lineHeight: 25 },
  guiltDebt: { color: Colors.redSoft },
  snoozeCount: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.35)', marginTop: 4 },
  scoreSection: { marginTop: 24, alignItems: 'center' },
  score: { fontSize: 44, fontWeight: '700', color: Colors.yellow },
  scoreNeg: { color: Colors.redSoft },
  scoreLabel: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginTop: 2 },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 32, width: '100%' },
  imUpBtn: {
    flex: 1, padding: 18, borderWidth: 3, borderColor: 'rgba(255,215,0,0.4)',
    borderRadius: 16, backgroundColor: 'rgba(255,215,0,0.08)', alignItems: 'center',
  },
  imUpText: { fontSize: 15, fontWeight: '800', color: Colors.yellow, letterSpacing: 1 },
  snoozeBtn: {
    flex: 1, padding: 18, backgroundColor: Colors.yellow, borderRadius: 16, alignItems: 'center',
    shadowColor: Colors.yellow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10,
  },
  snoozeText: { fontSize: 15, fontWeight: '800', color: Colors.black, letterSpacing: 1 },
  snoozeHint: { fontSize: 11, fontWeight: '700', color: Colors.black, opacity: 0.6, marginTop: 3 },

  // Math challenge
  mathEmoji: { fontSize: 48, marginBottom: 12 },
  mathTitle: { fontSize: 20, fontWeight: '900', color: Colors.white, marginBottom: 4 },
  mathSub: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.4)', marginBottom: 28 },
  mathProblem: { fontSize: 42, fontWeight: '700', color: Colors.yellow, letterSpacing: 2, marginBottom: 24 },
  mathInput: {
    width: '80%', padding: 18, fontSize: 28, fontWeight: '700', textAlign: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)', color: Colors.white,
  },
  mathInputWrong: { borderColor: Colors.red, backgroundColor: 'rgba(229,57,53,0.08)' },
  mathError: { fontSize: 14, fontWeight: '700', color: Colors.redSoft, marginTop: 12 },
  mathGoBtn: {
    marginTop: 20, paddingVertical: 16, paddingHorizontal: 48,
    backgroundColor: Colors.yellow, borderRadius: 14, alignItems: 'center',
  },
  mathGoBtnText: { fontSize: 16, fontWeight: '800', color: Colors.black },

  // Hold to confirm
  holdTitle: { fontSize: 20, fontWeight: '900', color: Colors.white, marginBottom: 4 },
  holdSub: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.4)', marginBottom: 32 },
  holdWrap: { width: 140, height: 140, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  holdSvg: { position: 'absolute' },
  holdBtn: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: Colors.yellow,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.yellow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12,
  },
  holdBtnDone: { backgroundColor: Colors.green },
  holdBtnIcon: { fontSize: 36 },
  holdHint: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
});
