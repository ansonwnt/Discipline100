export const SNOOZE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
export const MAX_ALARMS = 5;
export const MAX_HISTORY = 50;
export const HOLD_DURATION_MS = 3000; // 3 seconds
export const MAX_MATH_DIFFICULTY = 3;

// ===== Tier Configuration =====
export const TIERS = {
  weak_mind:      { amount: 1000,  label: 'Weak Mind',      icon: 'skull-outline' as const },
  discipline_guy: { amount: 5000,  label: 'Discipline Guy', icon: 'fitness-outline' as const },
  tough_guy:      { amount: 10000, label: 'Tough Guy',      icon: 'flame-outline' as const },
} as const;

export type TierKey = keyof typeof TIERS;

// ===== Snooze Cost Calculation =====

/** Fibonacci: 1, 2, 3, 5, 8, 13, 21, ... */
function fibDollars(n: number): number {
  let a = 1, b = 2;
  for (let i = 1; i < n; i++) {
    [a, b] = [b, a + b];
  }
  return a;
}

/** Powers of 2: 1, 2, 4, 8, 16, 32, 64, ... */
function pow2Dollars(n: number): number {
  return Math.pow(2, n - 1);
}

/**
 * Returns snooze cost in CENTS.
 * dailySnoozeIndex is 0-based (0 = first snooze = FREE).
 */
export function snoozeCostCents(tier: TierKey, dailySnoozeIndex: number): number {
  if (dailySnoozeIndex === 0) return 0; // First snooze is free
  const paidIndex = dailySnoozeIndex; // 1-based paid snooze number

  switch (tier) {
    case 'weak_mind':
      return 100; // flat $1
    case 'discipline_guy':
      return fibDollars(paidIndex) * 100; // $1, $2, $3, $5, $8, $13...
    case 'tough_guy':
      return pow2Dollars(paidIndex) * 100; // $1, $2, $4, $8, $16, $32...
  }
}

// ===== Formatting =====

/** Format cents as USD string, e.g. 1050 → "$10.50" */
export function formatUSD(cents: number): string {
  const abs = Math.abs(cents);
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${(abs / 100).toFixed(2)}`;
}
