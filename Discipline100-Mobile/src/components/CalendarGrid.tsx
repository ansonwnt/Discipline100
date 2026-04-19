import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { useState } from 'react';
import { Colors } from '../constants/colors';
import { useApp } from '../context/AppContext';
import { getSnoozesByDate, perfClass } from '../utils/streak';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const CARD_PADDING = 20;
const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_WIDTH = Math.min(SCREEN_WIDTH - 48 - CARD_PADDING * 2, 400); // account for screen padding + card padding
const DAY_SIZE = Math.floor((GRID_WIDTH - 6 * 4) / 7); // 7 columns, 4px gap between

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS = ['M','T','W','T','F','S','S'];

const perfColors = {
  great: { bg: Colors.yellow, text: Colors.black },
  ok: { bg: Colors.brown, text: Colors.white },
  bad: { bg: Colors.red, text: Colors.white },
};

export function CalendarGrid() {
  const { state } = useApp();
  const { theme } = useTheme();
  const [viewDate, setViewDate] = useState(new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay + 6) % 7;
  const snoozeMap = getSnoozesByDate(state.history);

  const nav = (dir: number) => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() + dir);
    setViewDate(d);
  };

  const days: React.ReactNode[] = [];
  for (let i = 0; i < startOffset; i++) {
    days.push(<View key={`e${i}`} style={styles.day} />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${(month+1).toString().padStart(2,'0')}-${d.toString().padStart(2,'0')}`;
    const count = snoozeMap[dateStr] || 0;
    const isToday = dateStr === today;
    const perf = count > 0 ? perfClass(count) : null;
    const perfStyle = perf ? perfColors[perf] : null;

    days.push(
      <View key={d} style={[
        styles.day,
        perfStyle && { backgroundColor: perfStyle.bg },
        isToday && !perfStyle && styles.dayToday,
      ]}>
        <Text style={[
          styles.dayText,
          perfStyle && { color: perfStyle.text, fontWeight: '900' },
          isToday && !perfStyle && styles.dayTodayText,
        ]}>{d}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{MONTH_NAMES[month]} {year}</Text>
        <View style={styles.nav}>
          <Pressable style={styles.navBtn} onPress={() => nav(-1)}>
            <Ionicons name="chevron-back" size={16} color={Colors.grayDark} />
          </Pressable>
          <Pressable style={styles.navBtn} onPress={() => nav(1)}>
            <Ionicons name="chevron-forward" size={16} color={Colors.grayDark} />
          </Pressable>
        </View>
      </View>

      <View style={styles.weekdays}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={styles.weekday}>{w}</Text>
        ))}
      </View>

      <View style={styles.grid}>{days}</View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.yellow }]} />
          <Text style={styles.legendText}>0-1</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.brown }]} />
          <Text style={styles.legendText}>2-3</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.red }]} />
          <Text style={styles.legendText}>4+</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.gray,
    borderRadius: 20, padding: 20, marginTop: 24,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 16, fontWeight: '900', color: Colors.black },
  nav: { flexDirection: 'row', gap: 4 },
  navBtn: {
    width: 32, height: 32, borderRadius: 10, borderWidth: 2, borderColor: Colors.gray,
    justifyContent: 'center', alignItems: 'center',
  },
  navText: { fontSize: 14, color: Colors.grayDark },
  weekdays: { flexDirection: 'row', gap: 4, marginBottom: 6 },
  weekday: {
    width: DAY_SIZE, textAlign: 'center', fontSize: 11, fontWeight: '800',
    color: Colors.grayDark, letterSpacing: 0.5,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-start' },
  day: {
    width: DAY_SIZE, height: DAY_SIZE,
    justifyContent: 'center', alignItems: 'center',
    borderRadius: DAY_SIZE / 2,
  },
  dayText: { fontSize: 13, fontWeight: '700', color: Colors.grayDark },
  dayToday: { borderWidth: 2, borderColor: Colors.grayMid },
  dayTodayText: { color: Colors.black, fontWeight: '900' },
  legend: {
    flexDirection: 'row', justifyContent: 'center', gap: 16,
    marginTop: 14, flexWrap: 'wrap',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, fontWeight: '700', color: Colors.grayDark },
});
