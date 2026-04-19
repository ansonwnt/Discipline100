import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { Alarm, fmt12 } from '../context/AppContext';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface Props {
  alarm: Alarm;
  onToggle: () => void;
  onDelete: () => void;
}

export function AlarmCard({ alarm, onToggle, onDelete }: Props) {
  const { theme } = useTheme();
  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete();
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }, alarm.enabled && styles.cardEnabled]}>
      <View style={styles.left}>
        <View style={[styles.icon, alarm.enabled ? styles.iconEnabled : { backgroundColor: theme.inputBg }]}>
          <Ionicons name="alarm" size={18} color={alarm.enabled ? Colors.brown : theme.textSecondary} />
        </View>
        <View style={styles.textCol}>
          <Text style={[styles.time, { color: theme.text }, !alarm.enabled && { color: theme.textSecondary }]}>
            {fmt12(alarm.time)}
          </Text>
        </View>
      </View>
      <View style={styles.right}>
        <Pressable
          style={[styles.toggle, alarm.enabled && styles.toggleOn]}
          onPress={handleToggle}
        >
          <View style={[styles.toggleThumb, alarm.enabled && styles.toggleThumbOn]} />
        </Pressable>
        <Pressable style={styles.delBtn} onPress={handleDelete}>
          <Ionicons name="close" size={18} color={Colors.grayDark} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.gray,
    borderRadius: 18,
    padding: 16,
    paddingHorizontal: 18,
  },
  cardEnabled: {
    borderColor: Colors.yellow,
    shadowColor: Colors.yellow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: {
    width: 38, height: 38, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  iconEnabled: { backgroundColor: Colors.yellowLight },
  iconDisabled: { backgroundColor: Colors.gray },
  iconText: { fontSize: 16 },
  textCol: {},
  time: { fontSize: 20, fontWeight: '700', color: Colors.black },
  timeDisabled: { color: Colors.grayDark },
  right: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggle: {
    width: 46, height: 26, borderRadius: 13,
    backgroundColor: Colors.grayMid, justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleOn: { backgroundColor: Colors.yellow },
  toggleThumb: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 2, elevation: 2,
  },
  toggleThumbOn: { alignSelf: 'flex-end' },
  delBtn: {
    width: 28, height: 28, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  delText: { fontSize: 16, color: Colors.grayDark },
});
