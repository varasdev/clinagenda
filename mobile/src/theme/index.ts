import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';

export const colors = {
  primary: '#176b52',
  primaryDark: '#124c3d',
  primaryLight: '#e4f3ec',
  accent: '#c9eadb',

  background: '#f5f8f6',
  surface: '#ffffff',
  surfaceSoft: '#f8faf9',

  text: '#20332d',
  textLight: '#687a72',
  border: '#dfe8e3',

  success: '#23794e',
  danger: '#ba3f42',
  warning: '#936a1b',
  emergency: '#c62828',

  // Accessibility: high contrast variants
  textOnPrimary: '#ffffff',
  textOnSurface: '#20332d',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const borderRadius = {
  sm: 10,
  md: 16,
  lg: 24,
  full: 999,
};

export const shadows = {
  sm: {
    shadowColor: '#1f4433',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#1f4433',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1f4433',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
};

export const typography = {
  // Minimum 16sp for body (accessibility for elderly)
  h1: { fontSize: 28, fontWeight: '800' as const, lineHeight: 34, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '700' as const, lineHeight: 24 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  button: { fontSize: 16, fontWeight: '700' as const, lineHeight: 20 },
  input: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
};

export const minTouchTarget = 48; // Minimum 48dp for accessibility

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenPadding: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardContent: {
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Accessibility helpers
export const a11y = {
  button: (label: string, hint?: string) => ({
    accessibilityRole: 'button' as const,
    accessibilityLabel: label,
    accessibilityHint: hint,
    minHeight: minTouchTarget,
    minWidth: minTouchTarget,
  }),
  input: (label: string, hint?: string) => ({
    accessibilityLabel: label,
    accessibilityHint: hint,
  }),
  text: (label: string) => ({
    accessibilityRole: 'text' as const,
    accessibilityLabel: label,
  }),
  image: (label: string) => ({
    accessibilityRole: 'image' as const,
    accessibilityLabel: label,
  }),
  header: (label: string) => ({
    accessibilityRole: 'header' as const,
    accessibilityLabel: label,
  }),
  listItem: (label: string, hint?: string) => ({
    accessibilityRole: 'button' as const,
    accessibilityLabel: label,
    accessibilityHint: hint,
  }),
};