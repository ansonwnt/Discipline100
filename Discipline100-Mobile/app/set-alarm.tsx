import { View, Text, Pressable, StyleSheet, FlatList, Modal, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useRef, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../src/constants/colors';
import { MAX_ALARMS } from '../src/constants/config';
import { useApp } from '../src/context/AppContext';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/context/ThemeContext';
import Animated, { useAnimatedStyle, withRepeat, withTiming, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { useEffect } from 'react';
import { playAlarmAudio, stopAlarmAudio } from '../src/utils/backgroundAlarm';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TIPS_SEEN_KEY = 'd100_alarm_tips_opted_out_v2';
const ALARM_GUIDE_URL = 'https://ansonwnt.github.io/Discipline100/alarm-reliability.html';

const TIPS = [
  {
    icon: 'notifications-outline' as const,
    label: 'Keep notifications on',
    body: 'Required for alarm alerts when Discipline100 is not open.',
  },
  {
    icon: 'moon-outline' as const,
    label: 'Allow Discipline100 in Focus/Sleep Mode',
    body: 'So Focus settings do not silence your alarm notification.',
  },
  {
    icon: 'phone-portrait-outline' as const,
    label: 'Leave Discipline100 open in the background',
    body: 'Do not swipe the app away before your alarm.',
  },
];

const ITEM_HEIGHT = 54;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const periods = ['AM', 'PM'];

function tripleData(data: string[]) {
  return [...data, ...data, ...data];
}

interface WheelProps {
  data: string[];
  initial: number;
  onSelect: (index: number) => void;
  wrap?: boolean;
}

function ScrollWheel({ data, initial, onSelect, wrap = false }: WheelProps) {
  const displayData = wrap ? tripleData(data) : data;
  const offset = wrap ? data.length : 0;
  const ref = useRef<FlatList>(null);
  useEffect(() => {
    setTimeout(() => {
      ref.current?.scrollToOffset({ offset: (initial + offset) * ITEM_HEIGHT, animated: false });
    }, 100);
  }, []);

  const onMomentumEnd = useCallback((e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    let index = Math.round(y / ITEM_HEIGHT);

    if (wrap) {
      const realIndex = ((index - offset) % data.length + data.length) % data.length;
      const centerIndex = realIndex + offset;
      if (Math.abs(index - centerIndex) > data.length / 2) {
        ref.current?.scrollToOffset({ offset: centerIndex * ITEM_HEIGHT, animated: false });
      }
      onSelect(realIndex);
      Haptics.selectionAsync();
    } else {
      index = Math.max(0, Math.min(data.length - 1, index));
      onSelect(index);
      Haptics.selectionAsync();
    }
  }, [data.length, offset, wrap, onSelect]);

  return (
    <View style={styles.wheelContainer}>
      <View style={styles.wheelHighlight} />
      <FlatList
        ref={ref}
        data={displayData}
        keyExtractor={(_, i) => i.toString()}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumEnd}
        contentContainerStyle={{ paddingVertical: PICKER_HEIGHT / 2 - ITEM_HEIGHT / 2 }}
        renderItem={({ item }) => (
          <View style={styles.wheelItem}>
            <Text style={styles.wheelText}>{item}</Text>
          </View>
        )}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
      />
    </View>
  );
}

export default function SetAlarmScreen() {
  const router = useRouter();
  const { state, dispatch } = useApp();
  const { theme } = useTheme();
  const [hourIdx, setHourIdx] = useState(6);
  const [minIdx, setMinIdx] = useState(0);
  const [perIdx, setPerIdx] = useState(0);
  const [showTestPrompt, setShowTestPrompt] = useState(false);
  const [isTestingSound, setIsTestingSound] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [checked, setChecked] = useState<boolean[]>(TIPS.map(() => false));
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const submitting = useRef(false);
  const testTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bounceY = useSharedValue(0);
  const previewScale = useSharedValue(1);

  useEffect(() => {
    bounceY.value = withRepeat(
      withSequence(withTiming(-12, { duration: 1000 }), withTiming(0, { duration: 1000 })),
      -1, true
    );
  }, []);

  useEffect(() => {
    return () => {
      if (testTimer.current) clearTimeout(testTimer.current);
      stopAlarmAudio();
    };
  }, []);

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounceY.value }],
  }));

  const previewStyle = useAnimatedStyle(() => ({
    transform: [{ scale: previewScale.value }],
  }));

  const popPreview = () => {
    previewScale.value = withSequence(withTiming(1.12, { duration: 100 }), withSpring(1, { damping: 8 }));
  };

  const getTime24 = () => {
    let h = parseInt(hours[hourIdx]);
    const m = parseInt(minutes[minIdx]);
    const p = periods[perIdx];
    if (p === 'AM' && h === 12) h = 0;
    else if (p === 'PM' && h !== 12) h += 12;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const getTime12 = () => `${hours[hourIdx]}:${minutes[minIdx]} ${periods[perIdx]}`;

  const toggleCheck = (i: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChecked(prev => prev.map((v, idx) => idx === i ? !v : v));
  };

  const handleSet = async () => {
    if (submitting.current) return;
    if (state.balance <= 0 || !state.tier) {
      router.push('/tier-selection?from=set-alarm');
      return;
    }
    if (state.alarms.length >= MAX_ALARMS) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    submitting.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    dispatch({ type: 'ADD_ALARM', time: getTime24() });

    const seen = await AsyncStorage.getItem(TIPS_SEEN_KEY);
    if (seen) {
      router.back();
    } else {
      setDontShowAgain(false);
      setShowTestPrompt(true);
    }
  };

  const handleDismiss = async () => {
    if (testTimer.current) clearTimeout(testTimer.current);
    await stopAlarmAudio();
    setShowTestPrompt(false);
    setIsTestingSound(false);
    if (dontShowAgain) {
      await AsyncStorage.setItem(TIPS_SEEN_KEY, '1');
    }
    setShowTips(false);
    router.back();
  };

  const toggleDontShowAgain = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDontShowAgain(prev => !prev);
  };

  const showReliabilityTips = async () => {
    if (testTimer.current) clearTimeout(testTimer.current);
    await stopAlarmAudio();
    setShowTestPrompt(false);
    setIsTestingSound(false);
    setShowTips(true);
  };

  const startSoundTest = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setIsTestingSound(true);
    await playAlarmAudio();
    testTimer.current = setTimeout(() => {
      showReliabilityTips();
    }, 5000);
  };

  const openAlarmGuide = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(ALARM_GUIDE_URL);
  };

  const allChecked = checked.every(Boolean);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => (showTips || showTestPrompt) ? handleDismiss() : router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.black} />
        </Pressable>
        <Text style={styles.title}>Set Alarm</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.mascot}>
          <Animated.View style={mascotStyle}>
            <Ionicons name="alarm" size={64} color={Colors.brown} />
          </Animated.View>
          <Text style={styles.mascotMsg}>When are you waking up?</Text>
          <Text style={styles.mascotSub}>Scroll to pick your time</Text>
        </View>

        <View style={styles.pickerCard}>
          <View style={styles.pickerRow}>
            <ScrollWheel data={hours} initial={6} onSelect={(i) => { setHourIdx(i); popPreview(); }} wrap />
            <Text style={styles.colon}>:</Text>
            <ScrollWheel data={minutes} initial={0} onSelect={(i) => { setMinIdx(i); popPreview(); }} wrap />
            <ScrollWheel data={periods} initial={0} onSelect={(i) => { setPerIdx(i); popPreview(); }} />
          </View>
        </View>

        <Animated.View style={[styles.previewPill, previewStyle]}>
          <Text style={styles.previewText}>{getTime12()}</Text>
        </Animated.View>
        <Text style={styles.tip}>Swipe up & down or scroll</Text>

        <View style={styles.actions}>
          <Pressable style={styles.setBtn} onPress={handleSet}>
            <Text style={styles.setBtnText}>SET ALARM</Text>
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </View>

      {/* First alarm sound test */}
      <Modal visible={showTestPrompt} transparent animationType="slide" onRequestClose={showReliabilityTips}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetIconWrap}>
                <Ionicons name={isTestingSound ? 'volume-high-outline' : 'alarm'} size={28} color={Colors.brown} />
              </View>
              <Text style={styles.sheetTitle}>{isTestingSound ? 'Alarm Sound Test' : 'Test alarm sound?'}</Text>
              <Text style={styles.sheetSub}>
                {isTestingSound ? 'Make sure you can hear this clearly.' : 'Play a 5-second test before relying on this alarm.'}
              </Text>
            </View>

            {isTestingSound ? (
              <Pressable style={styles.ctaBtn} onPress={showReliabilityTips}>
                <Text style={styles.ctaBtnText}>STOP TEST</Text>
              </Pressable>
            ) : (
              <View style={styles.testActions}>
                <Pressable style={styles.ctaBtn} onPress={startSoundTest}>
                  <Text style={styles.ctaBtnText}>TEST NOW</Text>
                  <Ionicons name="volume-high-outline" size={18} color={Colors.black} />
                </Pressable>
                <Pressable style={styles.skipBtn} onPress={showReliabilityTips}>
                  <Text style={styles.skipBtnText}>Skip</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* One-time alarm reliability checklist */}
      <Modal visible={showTips} transparent animationType="slide" onRequestClose={handleDismiss}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            {/* Handle */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetIconWrap}>
                <Ionicons name="alarm" size={28} color={Colors.brown} />
              </View>
              <Text style={styles.sheetTitle}>Sound Test Complete</Text>
              <Text style={styles.sheetSub}>Before your alarm:</Text>
            </View>

            {/* Checklist */}
            <View style={styles.checklist}>
              {TIPS.map((tip, i) => (
                <Pressable key={tip.label} style={styles.tipRow} onPress={() => toggleCheck(i)}>
                  <View style={[styles.checkbox, checked[i] && styles.checkboxDone]}>
                    {checked[i] && <Ionicons name="checkmark" size={14} color={Colors.black} />}
                  </View>
                  <View style={styles.tipIconWrap}>
                    <Ionicons name={tip.icon} size={20} color={checked[i] ? Colors.grayDark : Colors.brown} />
                  </View>
                  <View style={styles.tipText}>
                    <Text style={[styles.tipLabel, checked[i] && styles.tipLabelDone]}>{tip.label}</Text>
                    <Text style={styles.tipBody}>{tip.body}</Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.guideLink} onPress={openAlarmGuide}>
              <Ionicons name="help-circle-outline" size={18} color={Colors.brown} />
              <Text style={styles.guideLinkText}>How to allow Discipline100 in Focus/Sleep Mode</Text>
            </Pressable>

            <Pressable style={styles.dontShowRow} onPress={toggleDontShowAgain}>
              <View style={[styles.smallCheckbox, dontShowAgain && styles.checkboxDone]}>
                {dontShowAgain && <Ionicons name="checkmark" size={13} color={Colors.black} />}
              </View>
              <Text style={styles.dontShowText}>Don't show this again</Text>
            </Pressable>

            {/* CTA — pinned outside ScrollView so it's always reachable */}
            <Pressable
              style={[styles.ctaBtn, allChecked && styles.ctaBtnReady]}
              onPress={handleDismiss}
            >
              <Text style={styles.ctaBtnText}>
                {allChecked ? 'I\'M READY — LET\'S GO' : 'GOT IT'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.black} />
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 2, borderColor: Colors.grayMid,
    justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.white,
  },
  backText: { fontSize: 18, color: Colors.black },
  title: { fontSize: 18, fontWeight: '900', color: Colors.black },
  body: {
    flex: 1, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center',
    paddingBottom: 40,
  },
  mascot: { alignItems: 'center', marginBottom: 16 },
  mascotMsg: { fontSize: 18, fontWeight: '800', color: Colors.black, marginTop: 8 },
  mascotSub: { fontSize: 13, fontWeight: '600', color: Colors.grayDark, marginTop: 2 },
  pickerCard: {
    width: '100%', backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.gray,
    borderRadius: 28, padding: 8, marginTop: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
    elevation: 4,
  },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: PICKER_HEIGHT,
  },
  colon: {
    fontSize: 30, fontWeight: '700', color: Colors.brown, opacity: 0.5, paddingHorizontal: 4,
  },
  wheelContainer: {
    height: PICKER_HEIGHT, width: 90, overflow: 'hidden', position: 'relative',
  },
  wheelHighlight: {
    position: 'absolute', left: 4, right: 4, top: PICKER_HEIGHT / 2 - ITEM_HEIGHT / 2,
    height: ITEM_HEIGHT, backgroundColor: Colors.yellow, borderRadius: 14, zIndex: -1,
    shadowColor: Colors.yellow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8,
  },
  wheelItem: { height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  wheelText: { fontSize: 28, fontWeight: '700', color: Colors.black },
  previewPill: {
    marginTop: 16, backgroundColor: Colors.yellowLight, borderWidth: 2,
    borderColor: Colors.yellow, borderRadius: 40, paddingHorizontal: 24, paddingVertical: 8,
  },
  previewText: { fontSize: 16, fontWeight: '700', color: Colors.brown },
  tip: { fontSize: 12, fontWeight: '600', color: Colors.grayDark, marginTop: 8 },
  actions: { width: '100%', gap: 12, marginTop: 24 },
  setBtn: {
    paddingVertical: 18, backgroundColor: Colors.yellow, borderRadius: 16, alignItems: 'center',
    shadowColor: Colors.yellow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 6,
  },
  setBtnText: { fontSize: 16, fontWeight: '800', color: Colors.black, letterSpacing: 0.5 },
  cancelBtn: {
    paddingVertical: 16, borderWidth: 2, borderColor: Colors.grayMid, borderRadius: 16, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: Colors.grayDark },

  // Modal
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12,
    maxHeight: '90%',
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.grayMid, marginBottom: 20,
  },
  sheetHeader: { alignItems: 'center', marginBottom: 24 },
  sheetIconWrap: {
    width: 60, height: 60, borderRadius: 20, backgroundColor: Colors.yellowLight,
    borderWidth: 2, borderColor: Colors.yellow,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  sheetTitle: { fontSize: 20, fontWeight: '900', color: Colors.black, marginBottom: 6 },
  sheetSub: {
    fontSize: 13, fontWeight: '600', color: Colors.grayDark,
    textAlign: 'center', lineHeight: 19,
  },
  checklist: { gap: 16, marginBottom: 28 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: {
    width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: Colors.grayMid,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 1,
  },
  checkboxDone: {
    backgroundColor: Colors.yellow, borderColor: Colors.yellow,
  },
  tipIconWrap: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.gray,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  tipText: { flex: 1 },
  tipLabel: { fontSize: 14, fontWeight: '800', color: Colors.black, marginBottom: 2 },
  tipLabelDone: { color: Colors.grayDark, textDecorationLine: 'line-through' },
  tipBody: { fontSize: 12, fontWeight: '600', color: Colors.grayDark, lineHeight: 17 },
  testActions: { gap: 12 },
  skipBtn: {
    paddingVertical: 14, borderWidth: 2, borderColor: Colors.grayMid, borderRadius: 16, alignItems: 'center',
  },
  skipBtnText: { fontSize: 15, fontWeight: '800', color: Colors.grayDark },
  guideLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.yellowLight, borderWidth: 2, borderColor: Colors.yellow,
    borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8,
  },
  guideLinkText: { flex: 1, fontSize: 13, fontWeight: '800', color: Colors.brown, textAlign: 'center' },
  dontShowRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, marginTop: 4,
  },
  smallCheckbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: Colors.grayMid,
    justifyContent: 'center', alignItems: 'center',
  },
  dontShowText: { fontSize: 13, fontWeight: '700', color: Colors.grayDark },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 20, paddingVertical: 18, backgroundColor: Colors.yellow, borderRadius: 16,
    shadowColor: Colors.yellow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 6,
  },
  ctaBtnReady: {
    shadowOpacity: 0.5, shadowRadius: 12,
  },
  ctaBtnText: { fontSize: 16, fontWeight: '900', color: Colors.black, letterSpacing: 0.5 },
});
