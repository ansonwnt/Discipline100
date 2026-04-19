import { HistoryEntry } from '../context/AppContext';

export function getSnoozesByDate(history: HistoryEntry[]): Record<string, number> {
  const map: Record<string, number> = {};
  history.forEach(h => {
    if (!h.date) return;
    map[h.date] = (map[h.date] || 0) + 1;
  });
  return map;
}

export function calcStreak(history: HistoryEntry[]): { current: number; best: number } {
  const snoozeMap = getSnoozesByDate(history);
  const dates = Object.keys(snoozeMap).sort((a, b) => b.localeCompare(a));

  if (dates.length === 0) return { current: 0, best: 0 };

  // Current streak: walk backward from today checking consecutive days
  let current = 0;
  const today = new Date();
  const d = new Date(today);

  while (true) {
    const dateStr = d.toISOString().slice(0, 10);
    const count = snoozeMap[dateStr];

    if (count === undefined) {
      // No data for this day — skip today (day may not be over), break on others
      if (dateStr === today.toISOString().slice(0, 10)) {
        d.setDate(d.getDate() - 1);
        continue;
      }
      break; // gap = streak broken
    }

    if (count <= 1) {
      current++;
    } else {
      break; // bad day = streak broken
    }

    d.setDate(d.getDate() - 1);
  }

  // Best streak: walk through all dates (oldest first), must be consecutive
  const allDates = [...dates].sort((a, b) => a.localeCompare(b));
  let tempStreak = 0;
  let best = 0;
  let prevDate: string | null = null;

  allDates.forEach(dateStr => {
    const count = snoozeMap[dateStr];
    if (count <= 1) {
      if (prevDate) {
        const prev = new Date(prevDate + 'T12:00:00');
        const curr = new Date(dateStr + 'T12:00:00');
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
        tempStreak = diffDays === 1 ? tempStreak + 1 : 1;
      } else {
        tempStreak = 1;
      }
      if (tempStreak > best) best = tempStreak;
    } else {
      tempStreak = 0;
    }
    prevDate = dateStr;
  });

  return { current, best: Math.max(best, current) };
}

export function perfClass(count: number): 'great' | 'ok' | 'bad' {
  if (count <= 1) return 'great';
  if (count <= 3) return 'ok';
  return 'bad';
}
