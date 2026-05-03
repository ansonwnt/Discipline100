import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import Animated, { FadeInDown } from 'react-native-reanimated';

const steps = [
  { num: '1', title: 'Set your alarm', desc: 'Pick your wake-up time with the scroll wheel', color: Colors.yellowLight, textColor: Colors.brown },
  { num: '2', title: 'Snooze = lose money', desc: 'First snooze for each alarm is free. After that, each one costs real money from your deposit', color: Colors.redLight, textColor: Colors.red },
  { num: '3', title: 'Prove you\'re awake', desc: 'Tap Wake Up, solve a quick quiz, and the alarm turns off', color: Colors.greenLight, textColor: Colors.green },
  { num: '4', title: 'Keep alarms reliable', desc: 'Allow notifications and don\'t force-quit the app — both are needed for alarms to fire', color: Colors.yellowLight, textColor: Colors.brown },
];

export default function HowItWorks() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>HOW IT WORKS</Text>
          </View>
          <Text style={styles.title}>Simple rules,{'\n'}real consequences</Text>
        </View>

        <View style={styles.steps}>
          {steps.map((step, i) => (
            <Animated.View key={i} entering={FadeInDown.delay(150 + i * 150).duration(500)} style={styles.step}>
              <View style={[styles.stepNum, { backgroundColor: step.color }]}>
                <Text style={[styles.stepNumText, { color: step.textColor }]}>{step.num}</Text>
              </View>
              <View style={styles.stepText}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        <Pressable style={styles.btn} onPress={() => router.push('/(onboarding)/name')}>
          <Text style={styles.btnText}>GOT IT</Text>
        </Pressable>

        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { flex: 1, justifyContent: 'center', padding: 28 },
  header: { alignItems: 'center', marginBottom: 40 },
  tag: {
    backgroundColor: Colors.yellowLight, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, marginBottom: 16,
  },
  tagText: { fontSize: 12, fontWeight: '800', color: Colors.brown, letterSpacing: 2 },
  title: { fontSize: 26, fontWeight: '900', color: Colors.black, textAlign: 'center', lineHeight: 34 },
  steps: { gap: 20, marginBottom: 44 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  stepNum: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  stepNumText: { fontSize: 20, fontWeight: '900' },
  stepText: { flex: 1, paddingTop: 2 },
  stepTitle: { fontSize: 16, fontWeight: '800', color: Colors.black, marginBottom: 2 },
  stepDesc: { fontSize: 14, fontWeight: '600', color: Colors.grayDark, lineHeight: 20 },
  btn: {
    paddingVertical: 18, backgroundColor: Colors.yellow, borderRadius: 16,
    alignItems: 'center', shadowColor: Colors.yellow,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  btnText: { fontSize: 16, fontWeight: '800', color: Colors.black, letterSpacing: 0.5 },
  dots: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.grayMid },
  dotActive: { width: 24, backgroundColor: Colors.yellow },
});
