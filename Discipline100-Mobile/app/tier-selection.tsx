import { View, Text, Pressable, StyleSheet, ActivityIndicator, Modal, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Colors } from '../src/constants/colors';
import { useTheme } from '../src/context/ThemeContext';
import { useApp } from '../src/context/AppContext';
import { usePayment } from '../src/hooks/usePayment';
import { TIERS, TierKey, formatUSD } from '../src/constants/config';

type TierInfo = {
  key: TierKey;
  color: string;
  description: string;
  costInfo: string;
  costSequence: number[];
  howItWorks: string;
};

const LEGAL_URL = 'https://ansonwnt.github.io/Discipline100/privacy-policy.html';

const TIER_LIST: TierInfo[] = [
  {
    key: 'weak_mind',
    color: Colors.brown,
    description: '$1 per paid snooze',
    costInfo: 'Free, $1, $1, $1...',
    costSequence: [0, 100, 100, 100, 100, 100, 100, 100],
    howItWorks: 'First snooze for each alarm is free. After that, every snooze costs $1.',
  },
  {
    key: 'discipline_guy',
    color: Colors.yellow,
    description: '$1, $2, $3, $5...',
    costInfo: 'Free, $1, $2, $3, $5, $8...',
    costSequence: [0, 100, 200, 300, 500, 800, 1300, 2100],
    howItWorks: 'First snooze for each alarm is free. After that, costs follow Fibonacci: $1, $2, $3, $5...',
  },
  {
    key: 'tough_guy',
    color: Colors.red,
    description: '$1, $2, $4, $8...',
    costInfo: 'Free, $1, $2, $4, $8, $16...',
    costSequence: [0, 100, 200, 400, 800, 1600, 3200, 6400],
    howItWorks: 'First snooze for each alarm is free. After that, costs double: $1, $2, $4, $8...',
  },
];

const TIER_ORDER: TierKey[] = ['weak_mind', 'discipline_guy', 'tough_guy'];

function DepositSuccessModal({ amount, onClose }: { amount: string; onClose: () => void }) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.successCard}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={30} color={Colors.black} />
          </View>
          <Text style={styles.successTitle}>You're Set</Text>
          <Text style={styles.successBody}>
            {amount} deposited. Withdraw your remaining balance anytime.
          </Text>
          <Pressable style={styles.successBtn} onPress={onClose}>
            <Text style={styles.successBtnText}>Set Your Alarm</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function TierDetailModal({ tier, isUpgrade, currentTier, onClose, theme }: {
  tier: TierInfo;
  isUpgrade: boolean;
  currentTier: TierKey | null;
  onClose: () => void;
  theme: any;
}) {
  const config = TIERS[tier.key];
  const depositAmount = isUpgrade && currentTier
    ? formatUSD(config.amount - TIERS[currentTier].amount)
    : formatUSD(config.amount);

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalCard, { backgroundColor: theme.cardBg }]} onPress={() => {}}>
          {/* Header */}
          <View style={[styles.modalHeader, { backgroundColor: tier.color }]}>
            <View style={styles.modalHeaderIcon}>
              <Ionicons name={config.icon as any} size={28} color={Colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTierName}>{config.label}</Text>
              <Text style={styles.modalDeposit}>{depositAmount} deposit</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close-circle" size={26} color="rgba(255,255,255,0.8)" />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* How it works */}
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="information-circle-outline" size={18} color={tier.color} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>How it works</Text>
              </View>
              <Text style={[styles.sectionBody, { color: theme.text }]}>{tier.howItWorks}</Text>
            </View>

            {/* When you get charged */}
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="time-outline" size={18} color={tier.color} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>When you get charged</Text>
              </View>
              <View style={[styles.stepRow, { borderColor: theme.cardBorder }]}>
                <View style={[styles.stepIcon, { backgroundColor: tier.color + '20' }]}>
                  <Ionicons name="alarm-outline" size={18} color={tier.color} />
                </View>
                <Text style={[styles.stepText, { color: theme.textSecondary }]}>Alarm rings at your set time</Text>
              </View>
              <View style={[styles.stepRow, { borderColor: theme.cardBorder }]}>
                <View style={[styles.stepIcon, { backgroundColor: tier.color + '20' }]}>
                  <Ionicons name="hand-left-outline" size={18} color={tier.color} />
                </View>
                <Text style={[styles.stepText, { color: theme.textSecondary }]}>Tap Snooze → free once. Charge from 2nd snooze.</Text>
              </View>
              <View style={[styles.stepRow, { borderColor: theme.cardBorder }]}>
                <View style={[styles.stepIcon, { backgroundColor: tier.color + '20' }]}>
                  <Ionicons name="sunny-outline" size={18} color={tier.color} />
                </View>
                <Text style={[styles.stepText, { color: theme.textSecondary }]}>Tap Wake Up → do a small quiz → alarm off</Text>
              </View>
            </View>

            {/* Cost sequence */}
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="trending-up-outline" size={18} color={tier.color} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Cost per snooze</Text>
              </View>
              <View style={styles.costRow}>
                {tier.costSequence.map((cents, i) => (
                  <View key={i} style={styles.costItem}>
                    <View style={[styles.costBubble, cents === 0
                      ? { backgroundColor: Colors.green }
                      : { backgroundColor: tier.color }
                    ]}>
                      <Text style={styles.costBubbleText}>{cents === 0 ? 'FREE' : formatUSD(cents)}</Text>
                    </View>
                    <Text style={[styles.costOrdinal, { color: theme.textSecondary }]}>#{i + 1}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Reset note */}
            <View style={[styles.resetBox, { borderColor: theme.cardBorder }]}>
              <Ionicons name="refresh-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.resetText, { color: theme.text }]}>
                First snooze for each alarm is free.
              </Text>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function TierSelectionScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { state } = useApp();
  const { initiateDeposit, loading } = usePayment();
  const [modalTier, setModalTier] = useState<TierInfo | null>(null);
  const [selectedTier, setSelectedTier] = useState<TierKey>('discipline_guy');
  const [successAmount, setSuccessAmount] = useState<string | null>(null);

  const currentTierIndex = state.tier ? TIER_ORDER.indexOf(state.tier) : -1;
  const isUpgrade = !!(state.tier && state.balance > 0);
  const availableTiers = isUpgrade
    ? TIER_LIST.filter((_, i) => i > currentTierIndex)
    : TIER_LIST;
  const selectedTierInfo = availableTiers.find(tier => tier.key === selectedTier) || availableTiers[0];
  const selectedDisplayAmount = selectedTierInfo
    ? isUpgrade
      ? formatUSD(TIERS[selectedTierInfo.key].amount - TIERS[state.tier!].amount)
      : formatUSD(TIERS[selectedTierInfo.key].amount)
    : '$0.00';

  useEffect(() => {
    if (availableTiers.some(tier => tier.key === 'discipline_guy')) {
      setSelectedTier('discipline_guy');
      return;
    }
    if (availableTiers[0]) {
      setSelectedTier(availableTiers[0].key);
    }
  }, [isUpgrade, state.tier]);

  async function handleContinue() {
    if (!selectedTierInfo) return;
    const success = await initiateDeposit(selectedTierInfo.key);
    if (success) {
      setSuccessAmount(selectedDisplayAmount);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      {modalTier && (
        <TierDetailModal
          tier={modalTier}
          isUpgrade={isUpgrade}
          currentTier={state.tier}
          onClose={() => setModalTier(null)}
          theme={theme}
        />
      )}
      {successAmount && (
        <DepositSuccessModal
          amount={successAmount}
          onClose={() => {
            setSuccessAmount(null);
            router.replace('/set-alarm');
          }}
        />
      )}

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>
          {isUpgrade ? 'Upgrade Your Tier' : 'Choose Your Tier'}
        </Text>
      </View>

      <View style={styles.trustRow}>
        <Ionicons name="shield-checkmark-outline" size={15} color={Colors.green} />
        <Text style={styles.trustText}>Fully Refundable Deposit · Withdraw Anytime</Text>
      </View>

      <View style={styles.cards}>
        {availableTiers.map((tier) => {
          const config = TIERS[tier.key];
          const displayAmount = isUpgrade
            ? formatUSD(config.amount - TIERS[state.tier!].amount)
            : formatUSD(config.amount);
          const isSelected = selectedTierInfo?.key === tier.key;

          return (
            <Pressable
              key={tier.key}
              style={[
                styles.card,
                { borderColor: tier.color, backgroundColor: theme.cardBg },
                tier.key === 'discipline_guy' && styles.popularCard,
                isSelected && { backgroundColor: tier.color + '10' },
                isSelected && styles.selectedCard,
              ]}
              onPress={() => setSelectedTier(tier.key)}
              disabled={loading}
            >
              {tier.key === 'discipline_guy' && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                </View>
              )}
              <View style={[styles.cardBadge, { backgroundColor: tier.color }]}>
                <Ionicons name={config.icon as any} size={18} color={Colors.white} />
              </View>
              <View style={styles.cardContent}>
                <View style={styles.labelRow}>
                  <Text style={[styles.cardLabel, { color: theme.text }]}>{config.label}</Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={18} color={tier.color} />
                  )}
                  <Pressable
                    style={[styles.tipBtn, { borderColor: tier.color }]}
                    onPress={(e) => { e.stopPropagation(); setModalTier(tier); }}
                    hitSlop={10}
                  >
                    <Text style={[styles.tipBtnText, { color: tier.color }]}>?</Text>
                  </Pressable>
                </View>
                <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>{tier.description}</Text>
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

      <View style={styles.bottomBar}>
        <Text style={[styles.freeNote, { color: theme.textSecondary }]}>First snooze for each alarm is free</Text>
        <Pressable
          style={[styles.continueBtn, loading && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={loading || !selectedTierInfo}
        >
          {loading ? (
            <ActivityIndicator color={Colors.black} />
          ) : (
            <Text style={styles.continueBtnText}>
              {isUpgrade ? `Upgrade For ${selectedDisplayAmount}` : `Deposit ${selectedDisplayAmount}`}
            </Text>
          )}
        </Pressable>
        <View style={styles.legalRow}>
          {['Terms', 'Privacy', 'Refund Policy'].map((label, i) => (
            <Pressable key={label} onPress={() => Linking.openURL(LEGAL_URL)} hitSlop={8}>
              <Text style={[styles.legalText, { color: theme.textSecondary }]}>
                {i > 0 ? ` · ${label}` : label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
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
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.greenLight,
  },
  trustText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.black,
  },
  cards: { paddingHorizontal: 20, gap: 14 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 16,
    padding: 18,
    gap: 14,
    position: 'relative',
  },
  selectedCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  popularCard: {
    marginTop: 10,
    borderWidth: 4,
    transform: [{ translateY: -2 }],
    shadowColor: Colors.yellow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  popularBadge: {
    position: 'absolute',
    top: -15,
    left: 14,
    backgroundColor: Colors.green,
    borderColor: Colors.white,
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    zIndex: 1,
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 11,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  cardBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardLabel: { fontSize: 16, fontWeight: '800' },
  cardDesc: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  tipBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipBtnText: { fontSize: 11, fontWeight: '800', lineHeight: 14 },
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
    color: Colors.grayDark,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  freeNote: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  continueBtn: {
    backgroundColor: Colors.yellow,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: Colors.yellow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  continueBtnDisabled: {
    opacity: 0.6,
  },
  continueBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.black,
    letterSpacing: 0.4,
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  legalText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  successCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.black,
    marginBottom: 8,
  },
  successBody: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.grayDark,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  successBtn: {
    width: '100%',
    backgroundColor: Colors.yellow,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  successBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.black,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 14,
  },
  modalHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTierName: { fontSize: 20, fontWeight: '900', color: Colors.white },
  modalDeposit: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  modalBody: { padding: 20 },
  section: { marginBottom: 20 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '800' },
  sectionBody: { fontSize: 13, fontWeight: '600', lineHeight: 20 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontSize: 13, fontWeight: '700', flex: 1 },
  costRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  costItem: { alignItems: 'center', gap: 4 },
  costBubble: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 44,
    alignItems: 'center',
  },
  costBubbleText: { fontSize: 12, fontWeight: '800', color: Colors.white },
  costOrdinal: { fontSize: 10, fontWeight: '600' },
  resetBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  resetText: { fontSize: 12, fontWeight: '700', flex: 1, lineHeight: 17 },
});
