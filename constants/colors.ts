/**
 * Asambe design tokens — single source of truth for all color references.
 *
 * Locked in PRD Section 9 (Saffron palette). Tailwind classes reference the
 * same scale via tailwind.config.js; use `palette.*` here for React Native
 * props that don't accept className (color, tintColor, trackColor,
 * placeholderTextColor, etc.).
 *
 * Do not introduce raw hex literals in app/ or components/ — add a token here
 * first, then reference it.
 */

export const palette = {
  accent: '#e8902a',
  primary: {
    50: '#fdf8f3',
    100: '#f9ecde',
    200: '#f1d3b3',
    300: '#e6b380',
    400: '#d89358',
    500: '#c97838',
    600: '#a8622f',
    700: '#875027',
    800: '#6e4322',
    900: '#5b391e',
  },
  neutral: {
    50: '#fafaf9',
    100: '#f5f5f4',
    200: '#e7e5e4',
    300: '#d6d3d1',
    400: '#a8a29e',
    500: '#78716c',
    600: '#57534e',
    700: '#44403c',
    800: '#292524',
    900: '#1c1917',
  },
  success: '#16a34a',
  danger: '#dc2626',
  warning: '#f59e0b',
  info: '#0284c7',
  white: '#ffffff',
  black: '#000000',
} as const;

export type PaletteScale = keyof typeof palette.primary;
