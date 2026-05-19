import { useColorScheme } from 'nativewind';

export type ThemeColor = readonly [number, number, number];

export type Theme = {
  background: ThemeColor;
  foreground: ThemeColor;
  card: ThemeColor;
  cardForeground: ThemeColor;
  popover: ThemeColor;
  popoverForeground: ThemeColor;
  primary: ThemeColor;
  primaryForeground: ThemeColor;
  secondary: ThemeColor;
  secondaryForeground: ThemeColor;
  muted: ThemeColor;
  mutedForeground: ThemeColor;
  accent: ThemeColor;
  accentForeground: ThemeColor;
  border: ThemeColor;
  input: ThemeColor;
  ring: ThemeColor;
  success: ThemeColor;
  warning: ThemeColor;
  destructive: ThemeColor;
  brand50: ThemeColor;
  brand100: ThemeColor;
  brand200: ThemeColor;
  brand300: ThemeColor;
  brand400: ThemeColor;
  brand500: ThemeColor;
  brand600: ThemeColor;
  brand700: ThemeColor;
  brand800: ThemeColor;
  brand900: ThemeColor;
  brandForeground: ThemeColor;
  chart1: ThemeColor;
  chart2: ThemeColor;
  chart3: ThemeColor;
  chart4: ThemeColor;
  chart5: ThemeColor;
};

export type ColorToken = keyof Theme;

type SharedTokens = Pick<
  Theme,
  | 'brand50'
  | 'brand100'
  | 'brand200'
  | 'brand300'
  | 'brand400'
  | 'brand500'
  | 'brand600'
  | 'brand700'
  | 'brand800'
  | 'brand900'
  | 'brandForeground'
  | 'chart1'
  | 'chart2'
  | 'chart3'
  | 'chart4'
  | 'chart5'
>;

const sharedTokens: SharedTokens = {
  brand50: [220, 243, 234],
  brand100: [190, 229, 220],
  brand200: [155, 214, 199],
  brand300: [115, 196, 175],
  brand400: [60, 175, 142],
  brand500: [13, 153, 116],
  brand600: [0, 135, 98],
  brand700: [18, 112, 83],
  brand800: [32, 92, 70],
  brand900: [36, 73, 53],
  brandForeground: [235, 250, 243],
  chart1: [126, 211, 169],
  chart2: [16, 185, 129],
  chart3: [5, 150, 105],
  chart4: [0, 135, 98],
  chart5: [18, 112, 83],
};

export const lightTheme: Theme = {
  background: [255, 255, 255],
  foreground: [24, 24, 27],
  card: [250, 250, 250],
  cardForeground: [24, 24, 27],
  popover: [255, 255, 255],
  popoverForeground: [24, 24, 27],
  primary: [0, 135, 98],
  primaryForeground: [235, 250, 243],
  secondary: [244, 244, 245],
  secondaryForeground: [24, 24, 27],
  muted: [244, 244, 245],
  mutedForeground: [113, 113, 122],
  accent: [244, 244, 245],
  accentForeground: [24, 24, 27],
  border: [228, 228, 231],
  input: [228, 228, 231],
  ring: [0, 135, 98],
  success: [5, 150, 105],
  warning: [217, 119, 6],
  destructive: [220, 38, 38],
  ...sharedTokens,
};

export const darkTheme: Theme = {
  background: [24, 24, 27],
  foreground: [250, 250, 250],
  card: [39, 39, 42],
  cardForeground: [250, 250, 250],
  popover: [39, 39, 42],
  popoverForeground: [250, 250, 250],
  primary: [18, 112, 83],
  primaryForeground: [235, 250, 243],
  secondary: [63, 63, 70],
  secondaryForeground: [250, 250, 250],
  muted: [39, 39, 42],
  mutedForeground: [161, 161, 170],
  accent: [63, 63, 70],
  accentForeground: [250, 250, 250],
  border: [63, 63, 70],
  input: [63, 63, 70],
  ring: [18, 112, 83],
  success: [16, 185, 129],
  warning: [245, 158, 11],
  destructive: [239, 68, 68],
  ...sharedTokens,
};

export const radius = 14;

export function rgb([r, g, b]: ThemeColor, alpha = 1): string {
  return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function mix([r1, g1, b1]: ThemeColor, [r2, g2, b2]: ThemeColor, t = 0.5): string {
  const r = Math.round(r1 * (1 - t) + r2 * t);
  const g = Math.round(g1 * (1 - t) + g2 * t);
  const b = Math.round(b1 * (1 - t) + b2 * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function useTheme(): Theme {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'dark' ? darkTheme : lightTheme;
}
