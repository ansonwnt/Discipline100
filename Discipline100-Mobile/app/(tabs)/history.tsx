import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Colors } from '../../src/constants/colors';
import { useApp, HistoryEntry } from '../../src/context/AppContext';
import { formatUSD } from '../../src/constants/config';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { perfClass } from '../../src/utils/streak';

const perfColors = {
  great: { bar: Colors.yellow, dot: Colors.yellow, badge: Colors.yellowLight, badgeText: Colors.brown },
  ok: { bar: Colors.brown, dot: Colors.brown, badge: Colors.yellowPale, badgeText: Colors.brown },
  bad: { bar: Colors.red, dot: Colors.red, badge: Colors.redLight, badgeText: Colors.red },
};

function formatDateLabel(dateStr: string): string {
  if (!dateStr || dateStr === 'Unknown') return 'Unknown Date';
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return dateStr;
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

interface DayGroup {
  date: string;
  entries: HistoryEntry[];
  totalCost: number;
  perf: 'great' | 'ok' | 'bad';
}

export default function HistoryScreen() {
  const { state } = useApp();
  const { theme } = useTheme();
  const [openDays, setOpenDays] = useState<Set<string> | null>(null);

  // Group by date
  const groupMap: Record<string, HistoryEntry[]> = {};
  state.history.forEach(h => {
    const d = h.date || 'Unknown';
    if (!groupMap[d]) groupMap[d] = [];
    groupMap[d].push(h);
  });
  const dateOrder = Object.keys(groupMap).sort((a, b) => b.localeCompare(a));

  const groups: DayGroup[] = dateOrder.map(date => {
    const entries = groupMap[date];
    const totalCost = entries.reduce((a, e) => a + e.cost, 0);
    return { date, entries, totalCost, perf: perfClass(entries.length) };
  });

  // First group open by default
  const effectiveOpen = openDays ?? (groups.length > 0 ? new Set([groups[0].date]) : new Set<string>());

  const toggleDay = (date: string) => {
    const next = new Set(effectiveOpen);
    if (next.has(date)) next.delete(date);
    else next.add(date);
    setOpenDays(next);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Snooze Log</Text>

        {groups.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="trophy" size={48} color={Colors.yellow} />
            <Text style={styles.emptyText}>No snoozes yet</Text>
            <Text style={styles.emptySub}>Keep it that way, champ!</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {groups.map(group => {
              const isOpen = effectiveOpen.has(group.date);
              const colors = perfColors[group.perf];
              return (
                <View key={group.date} style={styles.dayCard}>
                  <Pressable style={styles.dayHeader} onPress={() => toggleDay(group.date)}>
                    <View style={[styles.dayBar, { backgroundColor: colors.bar }]} />
                    <View style={styles.dayLeft}>
                      <View style={[styles.dayDot, { backgroundColor: colors.dot }]} />
                      <View>
                        <Text style={styles.dayLabel}>{formatDateLabel(group.date)}</Text>
                        <Text style={styles.daySummary}>
                          {group.entries.length} snooze{group.entries.length > 1 ? 's' : ''} · {group.totalCost > 0 ? `−${formatUSD(group.totalCost)}` : 'no cost'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.dayRight}>
                      <View style={[styles.dayBadge, { backgroundColor: colors.badge }]}>
                        <Text style={[styles.dayBadgeText, { color: colors.badgeText }]}>
                          {group.totalCost > 0 ? `−${formatUSD(group.totalCost)}` : '$0'}
                        </Text>
                      </View>
                      <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.grayDark} />
                    </View>
                  </Pressable>

                  {isOpen && (
                    <View style={styles.entries}>
                      {group.entries.map((e, i) => (
                        <View key={i} style={[styles.entry, i < group.entries.length - 1 && styles.entryBorder]}>
                          <View style={styles.entryLeft}>
                            <View style={[styles.entryNum, e.cost === 0 ? styles.entryNumFree : styles.entryNumPaid]}>
                              <Text style={[styles.entryNumText, { color: e.cost === 0 ? Colors.green : Colors.red }]}>
                                #{e.snoozeNum}
                              </Text>
                            </View>
                            <Text style={styles.entryTime}>{e.time}</Text>
                          </View>
                          <Text style={[styles.entryCost, { color: e.cost === 0 ? Colors.green : Colors.red }]}>
                            {e.cost === 0 ? 'FREE' : `−${formatUSD(e.cost)}`}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  content: { padding: 24, paddingBottom: 100 },
  title: { fontSize: 20, fontWeight: '900', color: Colors.black, textAlign: 'center', marginBottom: 20 },
  list: { gap: 14 },
  dayCard: { backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.gray, borderRadius: 18, overflow: 'hidden' },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, paddingLeft: 20 },
  dayBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, borderRadius: 4 },
  dayLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  dayDot: { width: 10, height: 10, borderRadius: 5 },
  dayLabel: { fontSize: 14, fontWeight: '800', color: Colors.black },
  daySummary: { fontSize: 11, fontWeight: '700', color: Colors.grayDark, marginTop: 1 },
  dayRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dayBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  dayBadgeText: { fontSize: 14, fontWeight: '700' },
  chevron: { fontSize: 12, color: Colors.grayDark },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  entries: { borderTopWidth: 1, borderTopColor: Colors.gray },
  entry: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, paddingLeft: 40 },
  entryBorder: { borderBottomWidth: 1, borderBottomColor: Colors.gray },
  entryLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  entryNum: { width: 24, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  entryNumFree: { backgroundColor: Colors.greenLight },
  entryNumPaid: { backgroundColor: Colors.redLight },
  entryNumText: { fontSize: 11, fontWeight: '800' },
  entryTime: { fontSize: 13, fontWeight: '700', color: Colors.black },
  entryCost: { fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', padding: 60, gap: 8 },
  emptyIcon: { fontSize: 48, opacity: 0.8 },
  emptyText: { fontSize: 15, fontWeight: '700', color: Colors.grayDark },
  emptySub: { fontSize: 13, fontWeight: '600', color: Colors.grayDark, opacity: 0.7 },
});
