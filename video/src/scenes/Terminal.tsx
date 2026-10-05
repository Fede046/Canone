import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {content} from '../content';
import {colors, EXPO_IN, EXPO_OUT, lineGlow, MONO, useLayout, useSceneTime} from '../theme';
import {beatToFrame, timeline, typedChars} from '../timeline';

const {cues, scenes} = timeline;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/**
 * 10.5–13 s: the slit line stretches open into a terminal window; the install
 * snippet is typed (one line per typing window, clicks in sync), each Enter
 * lands on a beat. At the end the window folds back into a line.
 */
export const Terminal: React.FC = () => {
  const {frame, since} = useSceneTime('terminal');
  const {W, pick} = useLayout();
  const globalFrame = frame + beatToFrame(scenes.terminal.start);
  const term = content.terminal;

  const winW = pick(1480, 980);
  const winH = pick(420, 640);
  const t0 = since(scenes.terminal.start);
  const tEnd = since(cues.spiral);

  // Open: full-width line → window width → window height. Close: height → line → nothing.
  let w = interpolate(t0, [0, 6], [W, winW], {...clamp, easing: EXPO_OUT});
  let h = interpolate(t0, [3, 11], [6, winH], {...clamp, easing: EXPO_OUT});
  if (tEnd >= -6) {
    h = interpolate(tEnd, [-6, -1], [winH, 6], {...clamp, easing: EXPO_IN});
    w = interpolate(tEnd, [-1, 5], [winW, 0], {...clamp, easing: EXPO_IN});
  }
  const chrome = interpolate(h, [60, winH * 0.6], [0, 1], clamp);
  const tilt = interpolate(t0, [0, beatToFrame(scenes.terminal.end) - beatToFrame(scenes.terminal.start)], [14, -4]);

  const font = pick(38, 33);
  const doneT = since(cues.installed);
  const currentLine = cues.typing.reduce((acc, wd, i) => (globalFrame >= beatToFrame(wd.start) - 2 ? i : acc), 0);

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', perspective: 1800}}>
      <div
        style={{
          width: w,
          height: h,
          borderRadius: h < 30 ? 6 : 22,
          background: h < 30 ? colors.line : 'rgba(10,14,12,0.92)',
          boxShadow: h < 30 ? lineGlow(14) : `0 60px 140px rgba(0,0,0,0.7), 0 0 0 2px rgba(29,185,84,${0.6 * (1 - chrome) + 0.12})`,
          overflow: 'hidden',
          transform: `rotateX(${tilt}deg)`,
          position: 'relative',
        }}
      >
        <div style={{opacity: chrome}}>
          <div
            style={{
              height: pick(64, 70),
              display: 'flex',
              alignItems: 'center',
              padding: '0 26px',
              gap: 12,
              background: colors.surface2,
              borderBottom: '2px solid rgba(255,255,255,0.06)',
              position: 'relative',
            }}
          >
            {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
              <div key={c} style={{width: 18, height: 18, borderRadius: 9, background: c}} />
            ))}
            <div style={{position: 'absolute', left: 0, right: 0, textAlign: 'center', fontFamily: MONO, fontSize: pick(24, 26), color: colors.muted}}>
              {term.title}
            </div>
          </div>
          <div style={{padding: pick('40px 52px', '40px 38px'), fontFamily: MONO, fontSize: font, lineHeight: 1.6, color: colors.white}}>
            {term.lines.map((line, i) => {
              const win = cues.typing[i];
              const n = typedChars(globalFrame, win, line.length);
              const started = globalFrame >= beatToFrame(win.start) - 2;
              if (!started) return null;
              const typing = n < line.length;
              const enterFlash = interpolate(since(win.end), [0, 10], [0.22, 0], clamp);
              const isCurrent = i === currentLine && doneT < 0;
              const blink = Math.floor(frame / 8) % 2 === 0;
              return (
                <div
                  key={i}
                  style={{
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                    paddingLeft: '1.25em',
                    textIndent: '-1.25em',
                    marginBottom: pick(4, 12),
                    background: `rgba(29,185,84,${since(win.end) >= 0 ? enterFlash : 0})`,
                  }}
                >
                  <span style={{color: colors.line, fontWeight: 700}}>{term.prompt} </span>
                  {line.slice(0, n)}
                  {isCurrent && (typing || blink) ? (
                    <span style={{display: 'inline-block', width: '0.6em', height: '1.1em', verticalAlign: 'text-bottom', background: colors.line, boxShadow: lineGlow(8)}} />
                  ) : null}
                </div>
              );
            })}
            {doneT >= 0 ? (
              <div
                style={{
                  color: colors.line,
                  fontWeight: 700,
                  opacity: interpolate(doneT, [0, 4], [0, 1], clamp),
                  transform: `translateX(${interpolate(doneT, [0, 8], [-30, 0], {...clamp, easing: EXPO_OUT})}px)`,
                }}
              >
                {term.done}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
