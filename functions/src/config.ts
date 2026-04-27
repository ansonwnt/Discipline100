export const TIERS = {
  weak_mind: { amount: 1000, label: 'Weak Mind' },
  discipline_guy: { amount: 5000, label: 'Discipline Guy' },
  tough_guy: { amount: 10000, label: 'Tough Guy' },
} as const;

export type TierKey = keyof typeof TIERS;

export const VALID_TIERS = Object.keys(TIERS) as TierKey[];

export function isValidTier(tier: string): tier is TierKey {
  return VALID_TIERS.includes(tier as TierKey);
}

export function getTierAmount(tier: TierKey): number {
  return TIERS[tier].amount;
}

/** Returns the tier upgrade cost in cents (new tier - current tier) */
export function getUpgradeCost(currentTier: TierKey, newTier: TierKey): number {
  const current = TIERS[currentTier].amount;
  const next = TIERS[newTier].amount;
  return next - current;
}
