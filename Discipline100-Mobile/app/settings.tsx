import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/colors';
import { useTheme } from '../src/context/ThemeContext';
import { useAuth } from '../src/context/AuthContext';
import { useApp } from '../src/context/AppContext';
import { usePayment } from '../src/hooks/usePayment';
import { TIERS, TierKey, formatUSD } from '../src/constants/config';

const TIER_ORDER: TierKey[] = ['weak_mind', 'discipline_guy', 'tough_guy'];

export default function SettingsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, signOut } = useAuth();
  const { state } = useApp();
  const { initiateWithdrawal, loading } = usePayment();

  const canUpgrade = state.tier && TIER_ORDER.indexOf(state.tier) < TIER_ORDER.length - 1;

  function handleWithdraw() {
    if (state.balance <= 0) return;
    Alert.alert(
      'Withdraw Balance',
      `Withdraw ${formatUSD(state.balance)}? Your alarms will be deactivated and you'll need to make a new deposit to continue.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            const success = await initiateWithdrawal();
            if (success) router.replace('/(tabs)');
          },
        },
      ]
    );
  }

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Account */}
      <View style={[styles.section, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>ACCOUNT</Text>
        <View style={styles.row}>
          <Ionicons name="person-outline" size={20} color={theme.textSecondary} />
          <Text style={[styles.rowText, { color: theme.text }]}>
            {user?.email || user?.displayName || 'Signed in'}
          </Text>
        </View>
      </View>

      {/* Tier */}
      {state.tier && (
        <View style={[styles.section, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>TIER</Text>
          <View style={styles.row}>
            <Ionicons name={TIERS[state.tier].icon as any} size={20} color={Colors.yellow} />
            <Text style={[styles.rowText, { color: theme.text }]}>{TIERS[state.tier].label}</Text>
            <Text style={[styles.rowValue, { color: theme.textSecondary }]}>
              {formatUSD(state.balance)} remaining
            </Text>
          </View>
          {canUpgrade && (
            <Pressable
              style={[styles.upgradeBtn, { borderColor: Colors.yellow }]}
              onPress={() => router.push('/tier-selection')}
            >
              <Ionicons name="arrow-up-circle-outline" size={16} color={Colors.yellow} />
              <Text style={[styles.upgradeBtnText, { color: Colors.yellow }]}>Upgrade Tier</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Sign Out */}
      <Pressable style={[styles.section, { backgroundColor: theme.cardBg }]} onPress={handleSignOut}>
        <View style={styles.row}>
          <Ionicons name="log-out-outline" size={20} color={Colors.red} />
          <Text style={[styles.rowText, { color: Colors.red }]}>Sign Out</Text>
        </View>
      </Pressable>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Withdraw — subtle, at the bottom */}
      {state.balance > 0 && (
        <Pressable style={styles.withdrawBtn} onPress={handleWithdraw} disabled={loading}>
          <Text style={styles.withdrawText}>
            Withdraw Balance ({formatUSD(state.balance)})
          </Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 8 },
  title: { fontSize: 18, fontWeight: '800' },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowText: { fontSize: 15, fontWeight: '600', flex: 1 },
  rowValue: { fontSize: 13, fontWeight: '600' },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  upgradeBtnText: { fontSize: 13, fontWeight: '700' },
  withdrawBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 40,
  },
  withdrawText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
  },
});
