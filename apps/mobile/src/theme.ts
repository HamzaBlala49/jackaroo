import { Platform } from 'react-native';

/**
 * Jackaroo mobile theme: warm wood over deep red felt.
 * All colours are hand-tuned for contrast on small screens.
 */

export const colors = {
  /** Deep red felt table. */
  felt: '#5f1212',
  feltDeep: '#3c0a0a',
  feltEdge: '#7e1e1e',

  /** Wood tones. */
  wood: '#7a4a24',
  woodLight: '#a5713d',
  woodDark: '#543014',
  woodGrain: 'rgba(255, 231, 186, 0.16)',

  /** Ivory / paper. */
  ivory: '#f6ead2',
  ivoryDark: '#e6d5b2',
  ink: '#2c1c10',
  inkSoft: 'rgba(44, 28, 16, 0.72)',

  /** Metals. */
  gold: '#d9a84e',
  goldSoft: 'rgba(217, 168, 78, 0.35)',
  goldPale: '#f2d9a0',

  /** Status. */
  danger: '#c9564f',
  success: '#57b98a',
  offline: '#9c8f85',

  /** Team marbles (same palette as the web board). */
  teams: [
    { id: 0, name: 'الزمرد', primary: '#35b99c', deep: '#0f5a4c', pale: '#d9f4ec' },
    { id: 1, name: 'العنبر', primary: '#e9a23b', deep: '#7a4712', pale: '#fbe8c4' },
    { id: 2, name: 'الياقوت', primary: '#5b8def', deep: '#22417f', pale: '#dbe6ff' },
    { id: 3, name: 'الورد', primary: '#df6a8c', deep: '#7e2944', pale: '#fbdde6' },
  ],
} as const;

export type TeamPalette = (typeof colors.teams)[number];

export function teamPalette(teamId: number): TeamPalette {
  return colors.teams[teamId % colors.teams.length]!;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
};

export const font = {
  /** System Arabic-capable families; no bundled fonts keeps the app tiny. */
  regular: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
  medium: Platform.select({
    ios: 'System',
    android: 'sans-serif-medium',
    default: 'sans-serif-medium',
  }),
  bold: Platform.select({ ios: 'System', android: 'sans-serif-black', default: 'sans-serif-black' }),
};

export const text = {
  title: {
    fontFamily: font.bold,
    fontSize: 34,
    color: colors.ivory,
    textAlign: 'right' as const,
    writingDirection: 'rtl' as const,
  },
  heading: {
    fontFamily: font.bold,
    fontSize: 22,
    color: colors.ivory,
    textAlign: 'right' as const,
    writingDirection: 'rtl' as const,
  },
  body: {
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(246, 234, 210, 0.86)',
    textAlign: 'right' as const,
    writingDirection: 'rtl' as const,
  },
  caption: {
    fontFamily: font.regular,
    fontSize: 12,
    color: 'rgba(246, 234, 210, 0.55)',
    textAlign: 'right' as const,
    writingDirection: 'rtl' as const,
  },
};

export const shadow = Platform.select({
  ios: {
    shadowColor: '#1a0505',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 8 },
});
