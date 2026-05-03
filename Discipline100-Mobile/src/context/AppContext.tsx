import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { loadState, saveState } from '../utils/storage';
import { syncAlarmsToNative } from '../utils/alarmSync';
import { syncLocalNotifications } from '../utils/localNotifications';
import { pushToFirestore, pullFromFirestore, createUserDoc } from '../utils/firestoreSync';
import { MAX_ALARMS, MAX_HISTORY, snoozeCostCents, formatUSD, TierKey } from '../constants/config';

// ===== Types =====
export interface Alarm {
  id: number;
  time: string; // "HH:MM" 24-hour
  enabled: boolean;
}

export interface HistoryEntry {
  time: string;
  date: string; // "YYYY-MM-DD"
  snoozeNum: number;
  cost: number; // in cents (0 = free)
}

export interface AppState {
  balance: number; // cents
  tier: TierKey | null;
  dailySnoozeCount: number;
  dailySnoozeDate: string; // "YYYY-MM-DD"
  alarms: Alarm[];
  snoozeCount: number; // within current alarm session
  activeAlarmId: number | null;
  history: HistoryEntry[];
  name: string;
  onboarded: boolean;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const defaultState: AppState = {
  balance: 0,
  tier: null,
  dailySnoozeCount: 0,
  dailySnoozeDate: todayStr(),
  alarms: [],
  snoozeCount: 0,
  activeAlarmId: null,
  history: [],
  name: '',
  onboarded: false,
};

// ===== Actions =====
type Action =
  | { type: 'LOAD'; state: AppState }
  | { type: 'SET_NAME'; name: string }
  | { type: 'FINISH_ONBOARDING' }
  | { type: 'ADD_ALARM'; time: string }
  | { type: 'DELETE_ALARM'; id: number }
  | { type: 'TOGGLE_ALARM'; id: number }
  | { type: 'TRIGGER_ALARM'; id: number }
  | { type: 'SNOOZE' }
  | { type: 'DISMISS' }
  | { type: 'SET_STATE'; state: Partial<AppState> }
  | { type: 'SET_BALANCE'; balance: number; tier?: TierKey | null }
  | { type: 'RESET_AFTER_WITHDRAWAL' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD':
      return { ...defaultState, ...action.state, activeAlarmId: null, snoozeCount: 0 };

    case 'SET_NAME':
      return { ...state, name: action.name };

    case 'FINISH_ONBOARDING':
      return { ...state, onboarded: true };

    case 'ADD_ALARM': {
      if (state.alarms.length >= MAX_ALARMS) return state;
      if (state.balance <= 0 || !state.tier) return state;
      const newAlarm: Alarm = { id: Date.now(), time: action.time, enabled: true };
      return { ...state, alarms: [...state.alarms, newAlarm] };
    }

    case 'DELETE_ALARM':
      return {
        ...state,
        alarms: state.alarms.filter(a => a.id !== action.id),
        activeAlarmId: state.activeAlarmId === action.id ? null : state.activeAlarmId,
        snoozeCount: state.activeAlarmId === action.id ? 0 : state.snoozeCount,
      };

    case 'TOGGLE_ALARM':
      return {
        ...state,
        alarms: state.alarms.map(a =>
          a.id === action.id ? { ...a, enabled: !a.enabled } : a
        ),
      };

    case 'TRIGGER_ALARM':
      return { ...state, activeAlarmId: action.id };

    case 'SNOOZE': {
      if (!state.tier) return state;

      const now = new Date();
      const today = todayStr();
      const dailyCount = state.dailySnoozeDate !== today ? 0 : state.dailySnoozeCount;
      const costCents = snoozeCostCents(state.tier, state.snoozeCount);
      // Charge what's left if balance < cost
      const actualCost = Math.min(costCents, state.balance);

      const newEntry: HistoryEntry = {
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: today,
        snoozeNum: state.snoozeCount + 1,
        cost: actualCost,
      };
      const history = [newEntry, ...state.history].slice(0, MAX_HISTORY);

      return {
        ...state,
        balance: state.balance - actualCost,
        dailySnoozeCount: dailyCount + 1,
        dailySnoozeDate: today,
        snoozeCount: state.snoozeCount + 1,
        history,
      };
    }

    case 'DISMISS': {
      // Keep alarm enabled so it fires again tomorrow.
      // The JS watcher's firedToday set prevents same-day re-firing.
      const today = todayStr();
      // If user dismissed without snoozing, record a perfect-day entry so the
      // streak doesn't break (history is the only source for streak calculation).
      const newHistory = state.snoozeCount === 0
        ? [
            {
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              date: today,
              snoozeNum: 0, // sentinel: "dismissed with no snooze"
              cost: 0,
            },
            ...state.history,
          ].slice(0, MAX_HISTORY)
        : state.history;
      return {
        ...state,
        activeAlarmId: null,
        snoozeCount: 0,
        history: newHistory,
      };
    }

    case 'SET_STATE':
      return { ...state, ...action.state };

    case 'SET_BALANCE':
      return {
        ...state,
        balance: action.balance,
        ...(action.tier !== undefined ? { tier: action.tier } : {}),
      };

    case 'RESET_AFTER_WITHDRAWAL':
      return {
        ...state,
        balance: 0,
        tier: null,
        dailySnoozeCount: 0,
        dailySnoozeDate: todayStr(),
      };

    default:
      return state;
  }
}

// ===== Context =====
interface AppContextType {
  state: AppState;
  loaded: boolean;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextType>({
  state: defaultState,
  loaded: false,
  dispatch: () => {},
});

function seedDemoData(s: AppState): AppState {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const td = today.getDate();

  function dateStr(day: number) {
    return `${y}-${(m + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  const history: HistoryEntry[] = [];

  // 6 days ago — bad day, 5 snoozes
  if (td - 6 >= 1) {
    for (let i = 1; i <= 5; i++) {
      history.push({ time: `07:${(i * 5).toString().padStart(2, '0')} AM`, date: dateStr(td - 6), snoozeNum: i, cost: i === 1 ? 0 : 100 });
    }
  }

  // 5 days ago — ok, 3 snoozes
  if (td - 5 >= 1) {
    for (let i = 1; i <= 3; i++) {
      history.push({ time: `07:${(i * 5).toString().padStart(2, '0')} AM`, date: dateStr(td - 5), snoozeNum: i, cost: i === 1 ? 0 : 100 });
    }
  }

  // 4 days ago through yesterday — great days, 1 snooze each (4-day streak)
  for (let offset = 4; offset >= 1; offset--) {
    if (td - offset >= 1) {
      history.push({ time: '06:50 AM', date: dateStr(td - offset), snoozeNum: 1, cost: 0 });
    }
  }

  // Today — 1 snooze (keeps streak alive)
  history.push({ time: '07:00 AM', date: dateStr(td), snoozeNum: 1, cost: 0 });

  return {
    ...s,
    balance: 4400, // $44.00
    tier: 'discipline_guy',
    alarms: [
      { id: 1, time: '07:00', enabled: true },
      { id: 2, time: '08:30', enabled: false },
    ],
    history: history.reverse(),
    name: 'Demo User',
    onboarded: true,
  };
}

export function AppProvider({ children, uid }: { children: React.ReactNode; uid?: string | null }) {
  const [state, dispatch] = useReducer(reducer, defaultState);
  const [loaded, setLoaded] = React.useState(false);
  const prevUid = useRef<string | null>(null);
  const justLoaded = useRef(false);

  // Load state on mount or when uid changes (sign-in/sign-out)
  useEffect(() => {
    const load = async () => {
      setLoaded(false);

      if (uid && uid !== prevUid.current) {
        // User signed in — try to pull from Firestore first
        const cloudData = await pullFromFirestore(uid);
        if (cloudData) {
          dispatch({ type: 'LOAD', state: { ...defaultState, ...cloudData } });
        } else {
          // New user — load local data and push to Firestore
          const localData = await loadState(defaultState);
          dispatch({ type: 'LOAD', state: localData });
          await createUserDoc(uid, localData.name || '');
          if (localData.onboarded) {
            await pushToFirestore(uid, localData);
          }
        }
      } else if (prevUid.current) {
        // User signed out — reset to defaults, clear local data
        dispatch({ type: 'LOAD', state: defaultState });
      } else {
        // No user on initial load — load from local storage
        const saved = await loadState(defaultState);
        dispatch({ type: 'LOAD', state: saved });
      }

      prevUid.current = uid || null;
      justLoaded.current = true;
      setLoaded(true);
    };
    load();
  }, [uid]);

  // Save state on every change + push to Firestore
  useEffect(() => {
    if (!loaded) return;

    // Skip the first render right after LOAD to avoid push-after-pull race
    if (justLoaded.current) {
      justLoaded.current = false;
      return;
    }

    if (state.onboarded || state.name) {
      saveState(state);
    }

    // Push to Firestore if signed in
    if (uid) {
      pushToFirestore(uid, state);
    }
  }, [state, loaded, uid]);

  // Sync alarms to native + local notifications only when alarms array changes
  useEffect(() => {
    if (!loaded) return;
    syncAlarmsToNative(state.alarms);
    syncLocalNotifications(state.alarms);
  }, [state.alarms, loaded]);

  return (
    <AppContext.Provider value={{ state, loaded, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}

export function fmt12(hm: string): string {
  const [h, m] = hm.split(':').map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  return 'Good evening,';
}

export function guiltMsg(snoozeCount: number, balance: number, name: string, lastCost = 0): string {
  if (snoozeCount === 0) return name ? `Rise and shine, ${name}!` : 'Rise and shine, champ!';
  if (balance <= 0) return ['You\'re out of funds!', 'Balance empty... keep going?!', 'This is getting expensive...', 'WAKE UP!'][Math.min(snoozeCount - 1, 3)];
  if (balance < 500) return ['Running low on funds!', 'Your balance is shrinking...', 'Almost out!'][Math.min(snoozeCount - 1, 2)];
  if (lastCost === 0) return ['Free pass... for now.', 'Enjoy the freebie — next one costs!', 'Still free, but the clock is ticking...'][Math.min(snoozeCount - 1, 2)];
  return ['That cost you real money...', 'Another dollar gone!', 'Your balance is melting...', 'Seriously? Again?!', 'Money doesn\'t grow on trees!'][Math.min(snoozeCount - 1, 4)];
}
