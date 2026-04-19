import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { loadState, saveState } from '../utils/storage';
import { syncAlarmsToNative } from '../utils/alarmSync';
import { STARTING_SCORE, MAX_ALARMS, MAX_HISTORY } from '../constants/config';

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
  cost: number;
}

export interface AppState {
  score: number;
  alarms: Alarm[];
  snoozeCount: number;
  activeAlarmId: number | null;
  history: HistoryEntry[];
  name: string;
  onboarded: boolean;
}

const defaultState: AppState = {
  score: STARTING_SCORE,
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
  | { type: 'SET_STATE'; state: Partial<AppState> };

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
      if (state.score <= 0) return state;
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
      const now = new Date();
      const cost = state.snoozeCount > 0 ? 1 : 0;
      const newEntry: HistoryEntry = {
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: now.toISOString().slice(0, 10),
        snoozeNum: state.snoozeCount + 1,
        cost,
      };
      const history = [newEntry, ...state.history].slice(0, MAX_HISTORY);
      return {
        ...state,
        score: state.score - cost,
        snoozeCount: state.snoozeCount + 1,
        history,
      };
    }

    case 'DISMISS': {
      return {
        ...state,
        alarms: state.alarms.map(a =>
          a.id === state.activeAlarmId ? { ...a, enabled: false } : a
        ),
        activeAlarmId: null,
        snoozeCount: 0,
      };
    }

    case 'SET_STATE':
      return { ...state, ...action.state };

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
      history.push({ time: `07:${(i * 5).toString().padStart(2, '0')} AM`, date: dateStr(td - 6), snoozeNum: i, cost: i === 1 ? 0 : 1 });
    }
  }

  // 5 days ago — ok, 3 snoozes
  if (td - 5 >= 1) {
    for (let i = 1; i <= 3; i++) {
      history.push({ time: `07:${(i * 5).toString().padStart(2, '0')} AM`, date: dateStr(td - 5), snoozeNum: i, cost: i === 1 ? 0 : 1 });
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
    score: 92,
    alarms: [
      { id: 1, time: '07:00', enabled: true },
      { id: 2, time: '08:30', enabled: false },
    ],
    history: history.reverse(),
    name: 'Demo User',
    onboarded: true,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, defaultState);
  const [loaded, setLoaded] = React.useState(false);

  // Load state on mount
  useEffect(() => {
    loadState(defaultState).then(saved => {
      dispatch({ type: 'LOAD', state: saved });
      setLoaded(true);
    });
  }, []);

  // Save state on every change + sync alarms to native
  useEffect(() => {
    if (state.onboarded || state.name) {
      saveState(state);
    }
    if (loaded) {
      syncAlarmsToNative(state.alarms);
    }
  }, [state, loaded]);

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

export function guiltMsg(snoozeCount: number, score: number, name: string): string {
  if (snoozeCount === 0) return name ? `Rise and shine, ${name}!` : 'Rise and shine, champ!';
  if (score < -5) return ['You\'re buried in debt!', 'How deep will you go?!', 'This is getting embarrassing...', 'WAKE UP!'][Math.min(snoozeCount - 1, 3)];
  if (score < 0) return ['You\'re in DEBT now!', 'Negative score... really?', 'Stop! You owe points!'][Math.min(snoozeCount - 1, 2)];
  return ['That cost you 1 point...', 'Another point gone!', 'Your score is melting...', 'Seriously? Again?!', 'Points don\'t grow on trees!'][Math.min(snoozeCount - 1, 4)];
}
