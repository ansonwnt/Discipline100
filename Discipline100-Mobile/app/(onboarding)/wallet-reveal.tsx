import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { useApp } from '../../src/context/AppContext';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { requestNotificationPermission } from '../../src/utils/localNotifications';

export default function WalletReveal() {
  const router = useRouter();
  const { state, dispatch } = useApp();

  const handleGo = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await requestNotificationPermission(); // triggers iOS permission prompt
    dispatch({ type: 'FINISH_ONBOARDING' });
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.greeting}>
          {state.name ? `Hey ${state.name}!` : 'Hey there!'}
        </Text>
        <Text style={styles.title}>Your Wallet</Text>

        <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.wallet}>
          <View style={styles.walletShine} />
          <Text style={styles.walletLabel}>YOUR BALANCE</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balance}>$0.00</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(600).springify()} style={styles.infoCards}>
          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark" size={20} color={Colors.green} />
            <Text style={styles.infoText}>Make a refundable deposit to start</Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="cash-outline" size={20} color={Colors.red} />
            <Text style={styles.infoText}>Every snooze costs real money</Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="notifications-outline" size={20} color={Colors.yellow} />
            <Text style={styles.infoText}>Notifications let alarms ring when the app is closed</Text>
          </View>
        </Animated.View>

        <Text style={styles.note}>
          For best reliability, don't force-quit the app after setting alarms.
        </Text>

        <Pressable style={styles.btn} onPress={handleGo}>
          <Text style={styles.btnText}>ENABLE NOTIFICATIONS</Text>
        </Pressable>

        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  greeting: { fontSize: 18, fontWeight: '700', color: Colors.grayDark, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '900', color: Colors.black, marginBottom: 32 },
  wallet: {
    width: '100%', borderRadius: 24, padding: 32,
    backgroundColor: Colors.yellow, overflow: 'hidden',
    shadowColor: Colors.yellow, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 15, elevation: 10,
    marginBottom: 24,
  },
  walletShine: {
    position: 'absolute', top: -40, right: -40,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  walletLabel: {
    fontSize: 12, fontWeight: '800', color: 'rgba(139,69,19,0.7)',
    letterSpacing: 2, marginBottom: 8,
  },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  balance: { fontSize: 52, fontWeight: '700', color: Colors.black },
  infoCards: { width: '100%', gap: 10, marginBottom: 24 },
  infoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.gray, borderRadius: 14, padding: 14,
  },
  infoText: { fontSize: 14, fontWeight: '700', color: Colors.black, flex: 1 },
  note: {
    fontSize: 13, fontWeight: '600', color: Colors.grayDark,
    textAlign: 'center', marginBottom: 32, lineHeight: 19,
  },
  btn: {
    width: '100%', paddingVertical: 18, backgroundColor: Colors.yellow,
    borderRadius: 16, alignItems: 'center',
    shadowColor: Colors.yellow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  btnText: { fontSize: 16, fontWeight: '800', color: Colors.black, letterSpacing: 0.5 },
  dots: { flexDirection: 'row', gap: 8, marginTop: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.grayMid },
  dotActive: { width: 24, backgroundColor: Colors.yellow },
});
