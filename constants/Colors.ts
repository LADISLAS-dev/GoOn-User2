/**
 * GoOn Premium Color Palette
 * Luxury brand colors for a high-end travel & booking experience
 */
export const Colors = {
  // Primary brand colors
  primary: '#B8860B',        // Rich gold - luxury
  primaryDark: '#8B6914',    // Dark gold
  primaryLight: '#D4A843',   // Light gold

  // Accent
  accent: '#1A1A2E',         // Deep navy/black
  accentLight: '#16213E',    // Dark blue

  // Functional
  success: '#0EA882',        // Emerald green
  error: '#DC2626',          // Red
  warning: '#F59E0B',        // Amber
  info: '#3B82F6',           // Blue

  // Neutrals
  white: '#FFFFFF',
  background: '#FAFAFA',
  surface: '#F8F8F8',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  // Text
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Specific UI
  cardShadow: 'rgba(0, 0, 0, 0.08)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  skeleton: '#E5E7EB',

  // Category colors
  restaurant: '#E11D48',
  hotel: '#7C3AED',
  activity: '#059669',
  wellness: '#D97706',
  travel: '#2563EB',
  event: '#DB2777',

  // Gradients (for reference - use with expo-linear-gradient)
  gradientGold: ['#B8860B', '#D4A843'],
  gradientDark: ['#1A1A2E', '#16213E'],
  gradientPremium: ['#B8860B', '#1A1A2E'],
} as const;

export type ColorKey = keyof typeof Colors;
