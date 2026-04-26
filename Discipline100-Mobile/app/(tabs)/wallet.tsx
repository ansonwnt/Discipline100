import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { useApp } from '../../src/context/AppContext';
import { useTheme } from '../../src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { TIERS, formatUSD } from '../../src/constants/config';

export default function WalletScreen() {
  const router = useRouter();
  const { state } = useApp();
  const { theme } = useTheme();
  const totalSnoozes = state.history.length;
  const totalSpent = state.history.reduce((a, h) => a + h.cost, 0);
  const freeOnes = state.history.filter(h => h.cost === 0).length;
  const isEmpty = state.balance <= 0;

  const tierConfig = state.tier ? TIERS[state.tier] : null;
  const tierAmount = tierConfig ? tierConfig.amount : 0;
  const pct = tierAmount > 0 ? Math.max(0, Math.min(100, (state.balance / tierAmount) * 100)) : 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Wallet</Text>
          <Pressable onPress={() => router.push('/settings')} style={styles.gearBtn}>
            <Ionicons name="settings-outline" size={22} color={theme.textSecondary} />
          </Pressable>
        </View>

        {/* Balance Card */}
        <View style={styles.wallet}>
          <View style={styles.walletShine} />
          <View style={styles.topRow}>
            <Text style={styles.walletLabel}>YOUR BALANCE</Text>
            {tierConfig && (
              <View style={styles.badge}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons name={tierConfig.icon as any} size={12} color={Colors.brown} />
                  <Text style={styles.badgeText}>{tierConfig.label}</Text>
                </View>
              </View>
            )}
          </View>
          <View style={styles.balanceRow}>
            <Text style={[styles.balance, isEmpty && styles.balanceEmpty]}>{formatUSD(state.balance)}</Text>
          </View>
          {tierConfig && (
            <>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${pct}%` }, pct <= 20 && styles.progressLow]} />
              </View>
              <Text style={[styles.subtitle, isEmpty && { color: Colors.red }]}>
                {isEmpty ? 'Balance empty!' : state.balance < 500 ? 'Running low!' : 'Stay disciplined!'}
              </Text>
            </>
          )}
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{totalSnoozes}</Text>
            <Text style={styles.statLabel}>SNOOZES</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatUSD(totalSpent)}</Text>
            <Text style={styles.statLabel}>SPENT</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{freeOnes}</Text>
            <Text style={styles.statLabel}>FREE{'\n'}SNOOZES</Text>
          </View>
        </View>

        {/* Action Button */}
        {!state.tier || isEmpty ? (
          <Pressable
            style={[styles.actionBtn, { backgroundColor: Colors.yellow }]}
            onPress={() => router.push('/tier-selection')}
          >
            <Text style={styles.actionBtnText}>Make a Deposit</Text>
          </Pressable>
        ) : state.tier !== 'tough_guy' ? (
          <Pressable
            style={[styles.actionBtn, { borderWidth: 2, borderColor: Colors.yellow, backgroundColor: 'transparent' }]}
            onPress={() => router.push('/tier-selection')}
          >
            <Text style={[styles.actionBtnText, { color: Colors.yellow }]}>Upgrade Tier</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  content: { padding: 24, paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '900', color: Colors.black },
  gearBtn: { padding: 8 },
  wallet: {
    borderRadius: 24, padding: 28, overflow: 'hidden',
    backgroundColor: Colors.yellow,
    shadowColor: Colors.yellow, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 15, elevation: 10,
  },
  walletShine: {
    position: 'absolute', top: -40, right: -40, width: 140, height: 140,
    borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.2)',
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  walletLabel: { fontSize: 11, fontWeight: '800', color: 'rgba(139,69,19,0.7)', letterSpacing: 2 },
  badge: { backgroundColor: 'rgba(255,255,255,0.35)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '800', color: Colors.brown },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  balance: { fontSize: 48, fontWeight: '700', color: Colors.black },
  balanceEmpty: { color: Colors.red },
  progressBar: {
    width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3, marginTop: 16, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: 'rgba(26,26,26,0.25)', borderRadius: 3 },
  progressLow: { backgroundColor: Colors.red },
  subtitle: { fontSize: 13, fontWeight: '700', color: 'rgba(139,69,19,0.6)', marginTop: 10 },
  stats: { flexDirection: 'row', gap: 12, marginTop: 24 },
  stat: {
    flex: 1, backgroundColor: Colors.gray, borderRadius: 16, padding: 18, alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '700', color: Colors.black, textAlign: 'center' },
  statLabel: { fontSize: 11, fontWeight: '700', color: Colors.grayDark, letterSpacing: 1, marginTop: 4, textAlign: 'center' },
  actionBtn: {
    marginTop: 24, padding: 16, borderRadius: 16, alignItems: 'center',
    shadowColor: Colors.yellow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  actionBtnText: { fontSize: 15, fontWeight: '800', color: Colors.black },
});
