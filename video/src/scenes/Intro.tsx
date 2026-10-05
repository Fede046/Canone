import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {content} from '../content';
import {Signal} from '../components/Stage';
import {colors, DISPLAY, EXPO_IN, EXPO_OUT, springAt, tween, useLayout, useSceneTime} from '../theme';
import {timeline} from '../timeline';

const {cues, scenes} = timeline;

/**
 * 0–2 s: one green line cuts the black, splits in two, and the project name
 * is revealed in the slot between them: MUSIC on beat 1, PLAYER on beat 2.
 */
export const Intro: React.FC = () => {
  const {since} = useSceneTime('intro');
  const {W, H, pick} = useLayout();
  const font = pick(330, 250);
  const lineH = font * 0.88;

  const draw = tween(since(cues.lineDraw), 10);
  const open1 = springAt(since(cues.nameMusic), {damping: 16, mass: 0.7});
  const open2 = springAt(since(cues.namePlayer), {damping: 16, mass: 0.7});
  const closeT = since(scenes.intro.end) + 6; // last 6 frames
  const close = interpolate(closeT, [0, 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EXPO_IN});

  const pad = font * 0.08;
  const gap = (open1 * (lineH + pad) + open2 * lineH) * (1 - close);
  const cy = H / 2;
  const top = cy - gap / 2;
  const bottom = cy + gap / 2;

  // Block shifts up by half a line when PLAYER arrives so the pair stays centred.
  const blockShift = (lineH / 2) * (1 - open2);
  const drift = tween(since(cues.namePunch), 18) * pick(46, 30);
  const tracking = interpolate(open1, [0, 1], [0.12, -0.045]);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{clipPath: `inset(${top}px 0 ${H - bottom}px 0)`}}>
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div
            style={{
              fontFamily: DISPLAY,
              fontWeight: 900,
              fontSize: font,
              lineHeight: `${lineH}px`,
              letterSpacing: `${tracking}em`,
              color: colors.white,
              textAlign: 'center',
              transform: `translateY(${blockShift}px)`,
            }}
          >
            <div style={{transform: `translate(${-drift}px, ${(1 - open1) * lineH * 0.6}px)`}}>{content.name[0]}</div>
            <div style={{transform: `translate(${drift}px, ${(1 - open2) * lineH * 0.8}px)`}}>
              {content.name[1]}
            </div>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      {/* The signal: one line that becomes the two edges of the slot. */}
      <Signal style={{left: (W * (1 - draw)) / 2, width: W * draw, top: top - 3}} />
      {gap > 1 ? <Signal style={{left: 0, width: W, top: bottom - 3}} /> : null}

      {/* Beat ticks on the line while it waits for the name. */}
      {since(cues.nameMusic) < 0
        ? [0.2, 0.4, 0.6, 0.8].map((x) => (
            <div
              key={x}
              style={{
                position: 'absolute',
                left: W * x - 1,
                top: cy - 14,
                width: 2,
                height: 28,
                background: colors.line,
                opacity: draw * 0.6,
              }}
            />
          ))
        : null}
    </AbsoluteFill>
  );
};
