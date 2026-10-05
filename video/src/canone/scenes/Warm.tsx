/**
 * Vision (warm, bright, positive): a violet-to-rose dawn over the forest lookout, birds lifting.
 * Closing: logo, name, the value phrase once more, the repository URL. No call to action.
 */
import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {brand, devContent, publicContent} from '../content';
import {Logo, Words, Wordmark, useBeat} from '../kit';
import {C, EXPO_IN_OUT, EXPO_OUT, MONO, SANS, clamp, useLayout} from '../theme';
import {FPS, beatToFrame} from '../timeline';
import {PALETTES, soundtracks} from '../zones/data';
import {ForestZone} from '../zones/ForestZone';
import {MusicZone} from '../zones/MusicZone';

export const Vision: React.FC = () => {
  const {frame, since, tl, audience} = useBeat();
  const {W, H, u, vertical} = useLayout();
  const start = tl.scenes.vision.start;
  const local = since(start);
  // Sunrise reveal from the bottom (starts 12 frames before the beat)
  const reveal = interpolate(local, [-12, 4], [0, 1], {...clamp, easing: EXPO_IN_OUT});
  const day = interpolate(local, [-12, beatToFrame(6)], [0.4, 0.84], {...clamp, easing: EXPO_OUT});
  const sunArc = interpolate(local, [-12, beatToFrame(10)], [0.03, 0.17], clamp);
  const lift = audience === 'public' ? ('birdsRise' in tl.cues ? (tl.cues as {birdsRise: number}).birdsRise : start + 3) : start + 3;
  const lines = audience === 'public' ? [{text: publicContent.vision.text, at: start + 1, until: tl.scenes.vision.end}] : [
    {text: devContent.vision.a, at: start + 0.75, until: (tl.cues as {visionB: number}).visionB},
    {text: devContent.vision.b, at: (tl.cues as {visionB: number}).visionB + 0.25, until: tl.scenes.vision.end},
  ];
  return (
    <AbsoluteFill style={{background: '#000', clipPath: reveal < 1 ? `circle(${reveal * Math.hypot(W, H)}px at 50% 100%)` : undefined}}>
      <ForestZone
        width={W}
        height={H}
        frames={local + 24}
        sky={{from: 'violet', to: 'dawn', f: day}}
        sunArc={sunArc}
        isSun
        mood={frame >= beatToFrame(lift) ? 'energetic' : 'calm'}
        seed={12}
        birdScale={1.4}
      />
      {/* Warm bloom from the horizon */}
      <AbsoluteFill style={{background: `radial-gradient(ellipse 75% 55% at ${8 + 84 * sunArc}% 66%, rgba(255,179,138,${0.42 * day}), rgba(194,72,158,${0.18 * day}) 45%, transparent 75%)`, mixBlendMode: 'screen'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(30,15,58,0.55) 0%, transparent 40%)'}} />
      {lines.map((l, i) => {
        const out = interpolate(since(l.until), [-8, 0], [1, 0], clamp);
        const last = i === lines.length - 1;
        return frame >= beatToFrame(l.at) - 2 && (out > 0 || last) ? (
          <div key={i} style={{position: 'absolute', left: W * 0.08, right: W * 0.08, top: vertical ? H * 0.16 : H * 0.16, display: 'flex', justifyContent: 'center', opacity: last ? 1 : out}}>
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
              {(vertical ? l.text.split(/(?<=\.) /) : [l.text]).map((line, k, all) => (
                <Words
                  key={k}
                  text={line}
                  t={since(l.at) - all.slice(0, k).reduce((a, x) => a + x.split(' ').length, 0) * 4}
                  stagger={4}
                  duration={20}
                  color={C.warm.text}
                  style={{fontFamily: SANS, fontWeight: 800, fontSize: vertical ? u * 8.6 : l.text.length > 36 ? u * 6.6 : u * 7.6, letterSpacing: '-0.03em', lineHeight: 1.08, justifyContent: 'center', textAlign: 'center', textShadow: `0 0 ${u * 5}px rgba(194,72,158,0.55), 0 4px 30px rgba(30,15,58,0.6)`}}
                />
              ))}
            </div>
          </div>
        ) : null;
      })}
    </AbsoluteFill>
  );
};

export const Closing: React.FC = () => {
  const {frame, since, tl, audience} = useBeat();
  const {W, H, u, vertical} = useLayout();
  const cues = tl.cues as {logo: number; closingValue: number; url: number};
  const logo = interpolate(since(cues.logo), [0, 16], [0, 1], {...clamp, easing: EXPO_OUT});
  const value = interpolate(since(cues.closingValue), [0, 14], [0, 1], {...clamp, easing: EXPO_OUT});
  const url = interpolate(since(cues.url), [0, 14], [0, 1], {...clamp, easing: EXPO_OUT});
  const end = interpolate(since(tl.scenes.closing.end), [-10, 0], [1, 0], clamp);
  const words = audience === 'public' ? publicContent.value.join(' ') : devContent.value.join(' ');
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse 70% 60% at 50% 45%, #1E0F3A 0%, #07050C 70%)`, opacity: end}}>
      <AbsoluteFill style={{opacity: 0.32}}>
        <MusicZone song={soundtracks[audience]} t={frame / FPS} width={W} height={H} colors={PALETTES.fast} nebula={0.4} opt={{radius: vertical ? 0.42 : 0.62, dimGuide: 0.6}} />
      </AbsoluteFill>
      <AbsoluteFill style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: u * 2.2}}>
        <div style={{transform: `scale(${0.7 + 0.3 * logo})`, opacity: logo, filter: `drop-shadow(0 0 ${u * 4}px ${C.purple}aa)`}}>
          <Logo size={u * (vertical ? 22 : 17)} ring={logo} />
        </div>
        <div style={{opacity: logo, transform: `translateY(${(1 - logo) * u * 3}px)`}}>
          <Wordmark size={u * (vertical ? 15 : 12)} />
        </div>
        <div style={{opacity: value, transform: `translateY(${(1 - value) * u * 2}px)`, fontFamily: SANS, fontWeight: 800, fontSize: u * (vertical ? 5.6 : 4.6), color: C.white, letterSpacing: '-0.02em', textShadow: `0 0 ${u * 3}px ${C.purple}`, textAlign: 'center', padding: `0 ${W * 0.06}px`}}>
          {words}
        </div>
        <div style={{marginTop: u * 1.5, opacity: url, fontFamily: MONO, fontSize: u * (vertical ? 3.4 : 2.8), color: C.purpleLight, letterSpacing: '0.01em'}}>{brand.url}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
