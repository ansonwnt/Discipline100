export const Colors = {
  // Pikachu palette
  yellow: '#FFD700',
  yellowSoft: '#FFDF33',
  yellowLight: '#FFF8DC',
  yellowPale: '#FFFDF0',
  yellowGlow: '#FFE44D',

  black: '#1A1A1A',
  blackSoft: '#2D2D2D',

  red: '#E53935',
  redSoft: '#FF6B6B',
  redLight: '#FFF0F0',

  brown: '#8B4513',
  brownLight: '#C9956B',

  green: '#22C55E',
  greenLight: '#F0FDF4',

  white: '#FFFFFF',
  gray: '#F3F4F6',
  grayMid: '#E5E7EB',
  grayDark: '#9CA3AF',
};

export const LightTheme = {
  bg: Colors.white,
  bgSoft: Colors.yellowPale,
  cardBg: Colors.white,
  cardBorder: Colors.gray,
  text: Colors.black,
  textSecondary: Colors.grayDark,
  inputBg: Colors.gray,
  tabBg: Colors.white,
  tabBorder: Colors.gray,
  ...Colors,
};

export const DarkTheme = {
  bg: '#0D0D0D',
  bgSoft: '#111111',
  cardBg: '#1A1A1A',
  cardBorder: '#2A2A2A',
  text: '#F0F0F0',
  textSecondary: '#999999',
  inputBg: '#1E1E1E',
  tabBg: '#111111',
  tabBorder: '#222222',
  ...Colors,
  // Override some colors for dark
  yellowLight: '#2A2200',
  yellowPale: '#1A1500',
  redLight: '#2A0A0A',
  greenLight: '#0A2A12',
  gray: '#1E1E1E',
  grayMid: '#2A2A2A',
  grayDark: '#6B7280',
  white: '#1A1A1A',
  black: '#F0F0F0',
};

export type Theme = typeof LightTheme;
