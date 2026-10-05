import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig, type SpringConfig} from 'remotion';
import {beatToFrame, timeline, type SceneName} from './timeline';

export const DISPLAY = loadInter('normal', {weights: ['500', '700', '800', '900'], subsets: ['latin']}).fontFamily;
export const MONO = loadMono('normal', {weights: ['400', '500', '700'], subsets: ['latin']}).fontFamily;

// #1DB954 is the default playlist colour in the app (PlaylistEntity) → the "signal".
export const colors = {
  bg: '#070908',
  deep: '#0F3D22',
  surface: '#111613',
  surface2: '#18201B',
  line: '#1DB954',
  lineGlow: 'rgba(29,185,84,0.55)',
  white: '#FFFFFF',
  muted: '#8A948F',
  faint: 'rgba(255,255,255,0.12)',
} as const;

/** Snappy "expo out" used for almost every entrance. */
export const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EXPO_IN = Easing.bezier(0.7, 0, 0.84, 0);
export const EXPO_IN_OUT = Easing.bezier(0.87, 0, 0.13, 1);

export const useLayout = () => {
  const {width, height} = useVideoConfig();
  const vertical = height > width;
  return {
    W: width,
    H: height,
    vertical,
    pick: <T>(horizontal: T, verticalValue: T): T => (vertical ? verticalValue : horizontal),
  };
};

/**
 * Time helpers for a component rendered inside the Sequence of `scene`.
 * `since(beat)` = frames elapsed since an absolute beat (negative before it).
 */
export const useSceneTime = (scene: SceneName) => {
  const frame = useCurrentFrame();
  const sceneStart = beatToFrame(timeline.scenes[scene].start);
  const since = (beat: number) => frame + sceneStart - beatToFrame(beat);
  return {frame, since};
};

/** 0→1 eased progress over `duration` frames starting at t=0. */
export const tween = (t: number, duration: number, easing = EXPO_OUT) =>
  interpolate(t, [0, duration], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing});

export const springAt = (t: number, config: Partial<SpringConfig> = {damping: 200}, durationInFrames?: number) =>
  spring({frame: t, fps: timeline.fps, config, durationInFrames});

export const lineGlow = (px: number) =>
  `0 0 ${px}px ${colors.lineGlow}, 0 0 ${px * 3}px rgba(29,185,84,0.25)`;
