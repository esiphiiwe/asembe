/**
 * App-level light/dark theme values. Color tokens come from
 * `constants/colors.ts` — the single source of truth for the Asambe palette.
 */

import { Platform } from 'react-native';

import { palette } from './colors';

const tintColorLight = palette.accent;
const tintColorDark = palette.primary[200];

export const Colors = {
  light: {
    text: palette.neutral[900],
    background: palette.neutral[50],
    tint: tintColorLight,
    icon: palette.neutral[500],
    tabIconDefault: palette.neutral[400],
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: palette.neutral[900],
    tint: tintColorDark,
    icon: palette.neutral[400],
    tabIconDefault: palette.neutral[500],
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
