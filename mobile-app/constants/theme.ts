// App-wide colour palette & shared styles
const lightColors = {
  primary: '#3B82F6',
  secondary: '#8B5CF6',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
  icon: '#475569',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  star: '#FBBF24',
  input: '#F1F5F9',
  overlay: 'rgba(15, 23, 42, 0.08)',
} as const;

const darkColors = {
  primary: '#60A5FA',
  secondary: '#A78BFA',
  background: '#0F172A',
  surface: '#111827',
  surfaceAlt: '#1E293B',
  border: '#334155',
  text: '#F8FAFC',
  textMuted: '#CBD5E1',
  icon: '#CBD5E1',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  star: '#FBBF24',
  input: '#1E293B',
  overlay: 'rgba(15, 23, 42, 0.35)',
} as const;

export const Colors = {
  ...lightColors,
  light: lightColors,
  dark: darkColors,
} as const;

export const FontSizes = {
  xs:   11,
  sm:   13,
  md:   15,
  lg:   17,
  xl:   20,
  xxl:  24,
  xxxl: 30,
};

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 16,
  lg: 22,
  xl: 32,
  full: 999,
};
