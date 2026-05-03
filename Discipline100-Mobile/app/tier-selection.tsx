import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/colors';
import { useTheme } from '../src/context/ThemeContext';
import { useApp } from '../src/context/AppContext';
import { usePayment } from '../src/hooks/usePayment';
import { TIERS, TierKey, formatUSD } from '../src/constants/config';

const TIER_LIST: { key: TierKey; color: string; description: string; costInfo: string }[] = [
  {
    key: 'weak_mind',
    color: Colors.grayDark,
    description: 'Flat $1 per snooze',
    costInfo: '$1, $1, $1, $1...',
  },
  {
    key: 'discipline_guy',
    color: Colors.yellow,
    description: 'Fibonacci sequence',
    costInfo: '$1, $2, $3, $5, $8, $13...',
  },
  {
    key: 'tough_guy',
    color: Colors.red,
    description: 'Powers of 2',
    costInfo: '$1, $2, $4, $8, $16, $32...',
  },
];

const TIER_ORDER: TierKey[] = ['weak_mind', 'discipline_guy', 'tough_guy'];

export default function TierSelectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string }>();
  const { theme } = useTheme();
  const { state } = useApp();
  const { initiateDeposit, loading } = usePayment();

  // Filter tiers: if upgrading, only show tiers above current
  const currentTierIndex = state.tier ? TIER_ORDER.indexOf(state.tier) : -1;
  const isUpgrade = state.tier && state.balance > 0;
  const availableTiers = isUpgrade
    ? TIER_LIST.filter((_, i) => i > currentTierIndex)
    : TIER_LIST;

  async function handleSelectTier(tier: TierKey) {
    const success = await initiateDeposit(tier);
    if (success) {
      router.back();
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>
          {isUpgrade ? 'Upgrade Your Tier' : 'Choose Your Tier'}
        </Text>
      </View>

      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        This is a fully refundable deposit, not a purchase.{'\n'}
        Withdraw your remaining balance at any time.
      </Text>

      <View style={styles.cards}>
        {availableTiers.map((tier) => {
          const config = TIERS[tier.key];
          const displayAmount = isUpgrade
            ? formatUSD(config.amount - TIERS[state.tier!].amount)
            : formatUSD(config.amount);

          return (
            <Pressable
              key={tier.key}
              style={[styles.card, { borderColor: tier.color, backgroundColor: theme.cardBg }]}
              onPress={() => handleSelectTier(tier.key)}
              disabled={loading}
            >
              <View style={[styles.cardBadge, { backgroundColor: tier.color }]}>
                <Ionicons name={config.icon as any} size={18} color={Colors.white} />
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardLabel, { color: theme.text }]}>{config.label}</Text>
                <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>{tier.description}</Text>
                <Text style={[styles.cardCost, { color: theme.textSecondary }]}>{tier.costInfo}</Text>
              </View>
              <View style={styles.cardRight}>
                <Text style={[styles.cardAmount, { color: theme.text }]}>{displayAmount}</Text>
                {isUpgrade && (
                  <Text style={[styles.cardUpgrade, { color: tier.color }]}>upgrade</Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.yellow} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Processing payment...</Text>
        </View>
      )}

      <Text style={[styles.footer, { color: theme.textSecondary }]}>
        First snooze each alarm is free. Costs reset daily.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  closeBtn: { padding: 8, marginRight: 8 },
  title: { fontSize: 20, fontWeight: '900' },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    lineHeight: 20,
  },
  cards: { paddingHorizontal: 20, gap: 14 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 16,
    padding: 18,
    gap: 14,
  },
  cardBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { flex: 1 },
  cardLabel: { fontSize: 16, fontWeight: '800' },
  cardDesc: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  cardCost: { fontSize: 11, fontWeight: '500', marginTop: 2, fontStyle: 'italic' },
  cardRight: { alignItems: 'flex-end' },
  cardAmount: { fontSize: 22, fontWeight: '800' },
  cardUpgrade: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
  loading: { alignItems: 'center', marginTop: 24, gap: 8 },
  loadingText: { fontSize: 14, fontWeight: '600' },
  footer: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 24,
    marginTop: 24,
  },
});
