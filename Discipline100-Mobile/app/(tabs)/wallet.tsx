import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';
import { useApp } from '../../src/context/AppContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';

export default function WalletScreen() {
  const { state } = useApp();
  const { theme, isDark } = useTheme();
  const totalSnoozes = state.history.length;
  const ptsSpent = state.history.reduce((a, h) => a + h.cost, 0);
  const freeOnes = state.history.filter(h => h.cost === 0).length;
  const isNeg = state.score < 0;
  const pct = Math.max(0, Math.min(100, state.score));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.text }]}>Wallet</Text>

        {/* Score Card */}
        <View style={styles.wallet}>
          <View style={styles.walletShine} />
          <View style={styles.topRow}>
            <Text style={styles.walletLabel}>YOUR SCORE</Text>
            <View style={styles.badge}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name={state.score <= 20 ? 'warning' : 'flash'} size={12} color={Colors.brown} />
                <Text style={styles.badgeText}>
                  {state.score <= 0 ? 'Empty' : state.score <= 20 ? 'Low' : 'Active'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.scoreRow}>
            <Text style={[styles.score, isNeg && styles.scoreNeg]}>{state.score}</Text>
            <Text style={styles.unit}>pts</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%` }, pct <= 20 && styles.progressLow]} />
          </View>
          <Text style={[styles.subtitle, isNeg && { color: Colors.red }]}>
            {isNeg ? "You're in debt!" : state.score === 0 ? 'Zero points...' : state.score <= 10 ? 'Running low!' : 'Stay disciplined!'}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{totalSnoozes}</Text>
            <Text style={styles.statLabel}>SNOOZES</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{ptsSpent}</Text>
            <Text style={styles.statLabel}>POINTS{'\n'}SPENT</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{freeOnes}</Text>
            <Text style={styles.statLabel}>FREE{'\n'}SNOOZES</Text>
          </View>
        </View>

        {/* Buy Points */}
        <Pressable style={styles.buyBtn}>
          <Text style={styles.buyText}>Buy More Points (Coming Soon)</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  content: { padding: 24, paddingBottom: 100 },
  title: { fontSize: 20, fontWeight: '900', color: Colors.black, textAlign: 'center', marginBottom: 16 },
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
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  score: { fontSize: 56, fontWeight: '700', color: Colors.black },
  scoreNeg: { color: Colors.red },
  unit: { fontSize: 18, fontWeight: '800', color: 'rgba(26,26,26,0.5)' },
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
  statValue: { fontSize: 28, fontWeight: '700', color: Colors.black, textAlign: 'center' },
  statLabel: { fontSize: 11, fontWeight: '700', color: Colors.grayDark, letterSpacing: 1, marginTop: 4, textAlign: 'center' },
  buyBtn: {
    marginTop: 24, padding: 16, borderWidth: 2,
    borderColor: Colors.grayMid, borderRadius: 16, alignItems: 'center',
    backgroundColor: Colors.gray,
  },
  buyText: { fontSize: 15, fontWeight: '800', color: Colors.grayDark },
});
