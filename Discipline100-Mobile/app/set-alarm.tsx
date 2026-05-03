import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
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

const ITEM_HEIGHT = 54;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const periods = ['AM', 'PM'];

// Triple the data for infinite scroll illusion
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
      // Recenter if scrolled too far
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
  const [hourIdx, setHourIdx] = useState(6); // 07
  const [minIdx, setMinIdx] = useState(0);   // 00
  const [perIdx, setPerIdx] = useState(0);   // AM

  const bounceY = useSharedValue(0);
  const previewScale = useSharedValue(1);

  useEffect(() => {
    bounceY.value = withRepeat(
      withSequence(withTiming(-12, { duration: 1000 }), withTiming(0, { duration: 1000 })),
      -1, true
    );
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

  const handleSet = () => {
    // If no deposit yet, redirect to tier selection
    if (state.balance <= 0 || !state.tier) {
      router.push('/tier-selection?from=set-alarm');
      return;
    }
    if (state.alarms.length >= MAX_ALARMS) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    // Native scheduling handled automatically by syncAlarmsToNative in AppContext
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    dispatch({ type: 'ADD_ALARM', time: getTime24() });
    router.back();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.black} />
        </Pressable>
        <Text style={styles.title}>Set Alarm</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        {/* Mascot */}
        <View style={styles.mascot}>
          <Animated.View style={mascotStyle}>
            <Ionicons name="alarm" size={64} color={Colors.brown} />
          </Animated.View>
          <Text style={styles.mascotMsg}>When are you waking up?</Text>
          <Text style={styles.mascotSub}>Scroll to pick your time</Text>
        </View>

        {/* Picker */}
        <View style={styles.pickerCard}>
          <View style={styles.pickerRow}>
            <ScrollWheel data={hours} initial={6} onSelect={(i) => { setHourIdx(i); popPreview(); }} wrap />
            <Text style={styles.colon}>:</Text>
            <ScrollWheel data={minutes} initial={0} onSelect={(i) => { setMinIdx(i); popPreview(); }} wrap />
            <ScrollWheel data={periods} initial={0} onSelect={(i) => { setPerIdx(i); popPreview(); }} />
          </View>
        </View>

        {/* Preview */}
        <Animated.View style={[styles.previewPill, previewStyle]}>
          <Text style={styles.previewText}>{getTime12()}</Text>
        </Animated.View>
        <Text style={styles.tip}>Swipe up & down or scroll</Text>

        {/* Reliability tip */}
        <View style={styles.reliabilityTip}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.brown} />
          <Text style={styles.reliabilityText}>Allow notifications & keep app installed for reliable alarms</Text>
        </View>

        {/* Buttons */}
        <View style={styles.actions}>
          <Pressable style={styles.setBtn} onPress={handleSet}>
            <Text style={styles.setBtnText}>SET ALARM</Text>
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
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
  mascotIcon: { fontSize: 64 },
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
  wheelItem: {
    height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center',
  },
  wheelText: {
    fontSize: 28, fontWeight: '700', color: Colors.black,
  },
  previewPill: {
    marginTop: 16, backgroundColor: Colors.yellowLight, borderWidth: 2,
    borderColor: Colors.yellow, borderRadius: 40, paddingHorizontal: 24, paddingVertical: 8,
  },
  previewText: { fontSize: 16, fontWeight: '700', color: Colors.brown },
  tip: { fontSize: 12, fontWeight: '600', color: Colors.grayDark, marginTop: 8 },
  reliabilityTip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12,
    backgroundColor: Colors.yellowLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  reliabilityText: { fontSize: 12, fontWeight: '600', color: Colors.brown, flex: 1 },
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
});
