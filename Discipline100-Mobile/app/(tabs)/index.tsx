import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';
import { MAX_ALARMS } from '../../src/constants/config';
import { useApp, getGreeting } from '../../src/context/AppContext';
import { hasNotificationPermission } from '../../src/utils/localNotifications';
import { StreakCard } from '../../src/components/StreakCard';
import { AlarmCard } from '../../src/components/AlarmCard';
import { CalendarGrid } from '../../src/components/CalendarGrid';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useState, useEffect } from 'react';

export default function HomeScreen() {
  const router = useRouter();
  const { state, dispatch } = useApp();
  const { theme, isDark } = useTheme();
  const canAdd = state.balance > 0 && state.tier != null && state.alarms.length < MAX_ALARMS;
  const needsDeposit = state.balance <= 0 || !state.tier;
  const hasActiveAlarms = state.alarms.some(a => a.enabled);
  const [notifGranted, setNotifGranted] = useState(true);

  useEffect(() => {
    if (hasActiveAlarms) {
      hasNotificationPermission().then(setNotifGranted);
    }
  }, [hasActiveAlarms]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}><Ionicons name="flash" size={14} color={Colors.white} /></View>
            <Text style={[styles.logoText, { color: theme.text }]}>Discipline<Text style={styles.logoAccent}>100</Text></Text>
          </View>
          <Pressable onPress={() => router.push('/settings')} style={styles.settingsBtn}>
            <Ionicons name="settings-outline" size={22} color={theme.textSecondary} />
          </Pressable>
        </View>

        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={[styles.greetText, { color: theme.textSecondary }]}>{getGreeting()}</Text>
          <Text style={[styles.greetName, { color: theme.text }]}>{state.name || 'Champ'}</Text>
        </View>

        {/* Streak */}
        <StreakCard />

        {/* Alarms */}
        <View style={styles.alarmsHeader}>
          <Text style={styles.sectionLabel}>ALARMS</Text>
          <Text style={styles.sectionLabel}>{state.alarms.length}/{MAX_ALARMS}</Text>
        </View>

        {state.alarms.length === 0 && needsDeposit ? (
          <View style={[styles.startCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <View style={styles.startIcon}>
              <Ionicons name="shield-checkmark-outline" size={26} color={Colors.green} />
            </View>
            <Text style={[styles.startTitle, { color: theme.text }]}>Start With A Refundable Deposit</Text>
            <Text style={[styles.startBody, { color: theme.textSecondary }]}>
              Choose your tier, then set your first alarm.
            </Text>
            <Pressable
              style={styles.startBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/tier-selection');
              }}
            >
              <Text style={styles.startBtnText}>CHOOSE TIER</Text>
            </Pressable>
          </View>
        ) : state.alarms.length === 0 ? (
          <Text style={styles.emptyText}>No alarms set</Text>
        ) : (
          <View style={styles.alarmList}>
            {state.alarms.map(alarm => (
              <AlarmCard
                key={alarm.id}
                alarm={alarm}
                onToggle={() => dispatch({ type: 'TOGGLE_ALARM', id: alarm.id })}
                onDelete={() => dispatch({ type: 'DELETE_ALARM', id: alarm.id })}
              />
            ))}
          </View>
        )}

        {canAdd ? (
          <Pressable
            style={styles.addBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/set-alarm');
            }}
          >
            <Text style={styles.addBtnText}>+ ADD ALARM</Text>
          </Pressable>
        ) : needsDeposit && state.alarms.length > 0 ? (
          <Pressable style={styles.blocked} onPress={() => router.push('/tier-selection')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="flash" size={14} color={Colors.red} />
              <Text style={styles.blockedText}>Out of balance! Make a deposit to set alarms.</Text>
            </View>
          </Pressable>
        ) : state.alarms.length >= MAX_ALARMS ? (
          <View style={[styles.addBtn, styles.addBtnDisabled]}>
            <Text style={[styles.addBtnText, { opacity: 0.4 }]}>Max {MAX_ALARMS} alarms</Text>
          </View>
        ) : null}

        {/* Reliability warning — shown when alarms are active */}
        {hasActiveAlarms && (
          <View style={styles.reliabilityBanner}>
            <Ionicons
              name={notifGranted ? 'information-circle-outline' : 'warning-outline'}
              size={14}
              color={notifGranted ? Colors.brown : Colors.red}
            />
            <Text style={[styles.reliabilityText, !notifGranted && { color: Colors.red }]}>
              {notifGranted
                ? 'Keep app installed & don\'t force-quit for reliable alarms'
                : 'Allow notifications in Settings for alarms to fire when app is closed'}
            </Text>
          </View>
        )}

        {/* Calendar */}
        <CalendarGrid />

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoIcon: {
    width: 26, height: 26, backgroundColor: Colors.yellow, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.yellow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  logoIconText: { fontSize: 14 },
  logoText: { fontSize: 18, fontWeight: '900', color: Colors.black },
  logoAccent: { color: Colors.yellow },
  settingsBtn: { padding: 8 },
  greeting: { paddingVertical: 16 },
  greetText: { fontSize: 15, fontWeight: '700', color: Colors.grayDark },
  greetName: { fontSize: 24, fontWeight: '900', color: Colors.black },
  alarmsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: Colors.grayDark,
    textTransform: 'uppercase', letterSpacing: 2,
  },
  alarmList: { gap: 10 },
  emptyText: { textAlign: 'center', padding: 24, color: Colors.grayDark, fontWeight: '600' },
  startCard: {
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 20,
    padding: 22,
  },
  startIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  startTitle: {
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  startBody: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  startBtn: {
    width: '100%',
    backgroundColor: Colors.yellow,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: Colors.yellow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  startBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.black,
    letterSpacing: 0.5,
  },
  addBtn: {
    marginTop: 10, padding: 16, borderRadius: 16, alignItems: 'center',
    backgroundColor: Colors.yellow,
    shadowColor: Colors.yellow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  addBtnDisabled: { opacity: 0.4, backgroundColor: Colors.grayMid, shadowOpacity: 0 },
  addBtnText: { fontSize: 14, fontWeight: '800', color: Colors.black, letterSpacing: 0.5 },
  reliabilityBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12,
    backgroundColor: Colors.yellowLight, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  reliabilityText: {
    fontSize: 12, fontWeight: '600', color: Colors.brown, flex: 1, lineHeight: 17,
  },
  blocked: {
    marginTop: 10, padding: 14, backgroundColor: Colors.redLight,
    borderWidth: 2, borderColor: 'rgba(229,57,53,0.2)', borderRadius: 16,
    alignItems: 'center',
  },
  blockedText: { fontSize: 14, fontWeight: '700', color: Colors.red },
});
