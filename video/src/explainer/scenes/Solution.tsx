import React from 'react';
import {AbsoluteFill, interpolate, random} from 'remotion';
import {Logo} from '../../components/Logo';
import {DISPLAY, EXPO_OUT, springAt, tween, useLayout} from '../../theme';
import {content} from '../content';
import {clamp, pal, useSceneTime} from '../kit';
import {timeline} from '../timeline';

const {cues} = timeline;

/** Camera for the solution: shake on impacts, a punch on every beat of the drop. */
const useCamera = (since: (b: number) => number) => {
  let scale = 1;
  let x = 0;
  let y = 0;
  for (const b of timeline.audio.impacts) {
    const t = since(b);
    if (t >= 0 && t < 12) {
      const k = (1 - t / 12) ** 2;
      x += (random(`x${b}${t}`) - 0.5) * 40 * k;
      y += (random(`y${b}${t}`) - 0.5) * 40 * k;
      scale += 0.05 * Math.exp(-t / 4);
    }
  }
  for (let b = cues.valueA + 1; b < timeline.scenes.value.end; b++) {
    const t = since(b);
    if (t >= 0 && t < 12) scale += 0.022 * Math.exp(-t / 3);
  }
  return `translate(${x}px, ${y}px) scale(${scale})`;
};

/** Expanding rings (sound waves), one per hit. */
const Rings: React.FC<{hits: number[]; since: (b: number) => number; color: string; max: number}> = ({hits, since, color, max}) => (
  <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
    {hits.map((b) => {
      const t = since(b);
      if (t < 0 || t > 30) return null;
      const p = tween(t, 30);
      return (
        <div
          key={b}
          style={{
            position: 'absolute',
            width: max * p,
            height: max * p,
            borderRadius: '50%',
            border: `${interpolate(p, [0, 1], [14, 1])}px solid ${color}`,
            opacity: 1 - p,
          }}
        />
      );
    })}
  </AbsoluteFill>
);

/** Big kinetic word block: every word slams in (scale + blur) on its own beat offset. */
const Slam: React.FC<{lines: string[][]; t: number; size: number; colors: string[]; lineHeight?: number}> = ({lines, t, size, colors, lineHeight = 0.9}) => (
  <div style={{fontFamily: DISPLAY, fontWeight: 900, fontSize: size, lineHeight, letterSpacing: '-0.05em', textTransform: 'uppercase', textAlign: 'center'}}>
    {lines.map((words, li) => (
      <div key={li} style={{display: 'flex', justifyContent: 'center', columnGap: '0.24em', color: colors[li]}}>
        {words.map((w, wi) => {
          const d = (li * words.length + wi) * 2;
          const p = interpolate(t - d, [0, 8], [0, 1], {...clamp, easing: EXPO_OUT});
          return (
            <span
              key={wi}
              style={{
                display: 'inline-block',
                opacity: Math.min(1, p * 2),
                filter: `blur(${(1 - p) * 18}px)`,
                transform: `scale(${interpolate(p, [0, 1], [1.7, 1])})`,
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    ))}
  </div>
);

export const Solution: React.FC = () => {
  const {since} = useSceneTime('name');
  const {W, H, pick, vertical} = useLayout();
  const camera = useCamera(since);
  const max = Math.hypot(W, H);
  const [a, b] = content.value;
  const split = (s: string) => s.split(' ');

  // ── Beat 30–32: green burst + logo impact + name
  if (since(cues.valueA) < 0) {
    const t = since(cues.nameImpact);
    const burst = tween(t, 22);
    const pop = springAt(t, {damping: 10, mass: 0.7});
    const nameIn = interpolate(t - 4, [0, 10], [0, 1], {...clamp, easing: EXPO_OUT});
    const logo = pick(230, 280);
    return (
      <AbsoluteFill style={{background: pal.black, transform: camera}}>
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at 50% 50%, ${pal.green} 0%, rgba(29,185,84,0.35) ${18 + burst * 30}%, transparent ${30 + burst * 45}%)`,
            opacity: 1 - burst * 0.55,
          }}
        />
        <Rings hits={[cues.nameImpact, cues.nameImpact + 0.25]} since={since} color={pal.green} max={max} />
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: pick(40, 56)}}>
          <div style={{transform: `scale(${interpolate(pop, [0, 1], [0.3, 1])})`, filter: 'drop-shadow(0 0 60px rgba(29,185,84,0.6))'}}>
            <Logo size={logo} grooves spin={t * 3} />
          </div>
          <div
            style={{
              fontFamily: DISPLAY,
              fontWeight: 900,
              fontSize: pick(150, 140),
              letterSpacing: '-0.05em',
              color: '#FFFFFF',
              opacity: nameIn,
              transform: `translateY(${(1 - nameIn) * 40}px)`,
            }}
          >
            {content.name}
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  // ── Beat 32: DROP — green screen, "DOWNLOAD ONCE." in black
  if (since(cues.valueB) < 0) {
    const t = since(cues.valueA);
    const fill = tween(t, 6);
    return (
      <AbsoluteFill style={{background: pal.black, transform: camera}}>
        <AbsoluteFill style={{background: pal.green, clipPath: `circle(${fill * max * 0.6}px at 50% 50%)`}} />
        <Rings hits={[cues.valueA + 1]} since={since} color="rgba(5,7,6,0.35)" max={max} />
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <Slam lines={split(a).map((w) => [w])} t={t} size={pick(300, 172)} colors={[pal.black, pal.black]} />
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  // ── Beat 34: inversion — "LISTEN FOREVER." in green on black
  if (since(cues.valueBoth) < 0) {
    const t = since(cues.valueB);
    return (
      <AbsoluteFill style={{background: pal.black, transform: camera}}>
        <Rings hits={[cues.valueB, cues.valueB + 1]} since={since} color={pal.green} max={max} />
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <Slam lines={split(b).map((w) => [w])} t={t} size={pick(300, 172)} colors={[pal.green, pal.green]} />
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  // ── Beats 36–40: the whole value phrase, with the logo, pulsing on the beat
  const t = since(cues.valueBoth);
  const hits = [36, 37, 38, 39];
  return (
    <AbsoluteFill style={{background: pal.black, transform: camera}}>
      <AbsoluteFill style={{background: `radial-gradient(ellipse 60% 55% at 50% 50%, rgba(29,185,84,0.22) 0%, transparent 70%)`}} />
      <Rings hits={hits} since={since} color="rgba(29,185,84,0.6)" max={max} />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: pick(50, 70)}}>
        <div style={{opacity: tween(t, 10), transform: `scale(${interpolate(tween(t, 12), [0, 1], [0.6, 1])})`}}>
          <Logo size={pick(120, 150)} grooves spin={t * 3} />
        </div>
        <Slam
          lines={vertical ? [...split(a).map((w) => [w]), ...split(b).map((w) => [w])] : [split(a), split(b)]}
          t={t}
          size={pick(165, 150)}
          colors={vertical ? ['#FFFFFF', '#FFFFFF', pal.green, pal.green] : ['#FFFFFF', pal.green]}
          lineHeight={0.95}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
