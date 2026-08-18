export const COLORS = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#93C5FD',
  secondary: '#059669',
  secondaryLight: '#6EE7B7',
  danger: '#DC2626',
  dangerLight: '#FCA5A5',
  warning: '#F59E0B',
  warningLight: '#FCD34D',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#1E293B',
  textSecondary: '#64748B',
  textLight: '#94A3B8',
  border: '#E2E8F0',
  black: '#000000',
  grayDark: '#374151',
};

export const FONTS = {
  standard: { fontSize: 14 },
  standardBold: { fontSize: 14, fontWeight: 'bold' },
  simplified: { fontSize: 20 },
  simplifiedBold: { fontSize: 20, fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: 'bold' },
  simplifiedTitle: { fontSize: 28, fontWeight: 'bold' },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export function getTheme(isSimplified) {
  return {
    font: isSimplified ? FONTS.simplified : FONTS.standard,
    fontBold: isSimplified ? FONTS.simplifiedBold : FONTS.standardBold,
    title: isSimplified ? FONTS.simplifiedTitle : FONTS.title,
    buttonHeight: isSimplified ? 64 : 48,
    buttonFontSize: isSimplified ? 20 : 16,
    padding: isSimplified ? SPACING.lg : SPACING.md,
  };
}
