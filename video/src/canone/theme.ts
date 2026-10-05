import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {loadFont as loadSerif} from '@remotion/google-fonts/InstrumentSerif';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';
import {Easing, useVideoConfig} from 'remotion';

export const SANS = loadInter('normal', {weights: ['400', '500', '600', '700', '800', '900'], subsets: ['latin']}).fontFamily;
export const SERIF = loadSerif('normal', {weights: ['400'], subsets: ['latin']}).fontFamily;
export const SERIF_ITALIC = loadSerif('italic', {weights: ['400'], subsets: ['latin']}).fontFamily;
export const MONO = loadMono('normal', {weights: ['400', '500', '700'], subsets: ['latin']}).fontFamily;

/**
 * Black and purple, like the app (app/…/ui/theme/Theme.kt). The emotional arc is carried by
 * brightness and saturation, not by other hues:
 *   cold   → near-black, desaturated violet-grey, slow
 *   bright → the app's purple and magenta at full strength (solution, value phrase)
 *   demo   → the app's own black surfaces, purple accents, high contrast
 *   warm   → a violet-to-rose dawn with a touch of gold (vision)
 */
export const C = {
  // The app's palette
  purple: '#A855F7',
  purpleLight: '#C4A5FF',
  purpleDeep: '#3B1E66',
  magenta: '#E879F9',
  black: '#0B0A10',
  white: '#FFFFFF',
  text2: '#B3B0BB',
  surface: '#17141F',
  surface2: '#1F1B29',
  surface3: '#2A2536',
  outline: '#4A4458',
  gold: '#F2C46B', // Circle Zone accidentals

  // Arc
  cold: {bg: '#07060B', fog: '#151221', text: '#CFC9DC', dim: '#5E5870', line: '#2B2638', accent: '#7D6C9E'},
  warm: {top: '#1E0F3A', mid: '#6B2A8C', glow: '#C2489E', low: '#F07AA0', horizon: '#FFB38A', sun: '#FFE2A8', text: '#FFF6FB'},

  // Code
  code: {bg: '#100E16', bar: '#18151F', text: '#ECE8F4', dim: '#6B6580', kw: '#C4A5FF', str: '#F0ABFC', num: '#F2C46B', fn: '#A5B4FC', ok: '#86EFAC'},
} as const;

export const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EXPO_IN = Easing.bezier(0.7, 0, 0.84, 0);
export const EXPO_IN_OUT = Easing.bezier(0.87, 0, 0.13, 1);
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const useLayout = () => {
  const {width, height} = useVideoConfig();
  const vertical = height > width;
  // `u` = 1% of the short side: sizes written in u look the same in both formats
  const u = Math.min(width, height) / 100;
  return {W: width, H: height, vertical, u, pick: <T,>(h: T, v: T): T => (vertical ? v : h)};
};

export const glow = (color: string, px: number, alpha = 0.55) => {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  const b = Math.round(alpha * 0.45 * 255)
    .toString(16)
    .padStart(2, '0');
  return `0 0 ${px}px ${color}${a}, 0 0 ${px * 3}px ${color}${b}`;
};
