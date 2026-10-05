import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {Logo} from '../../components/Logo';
import {DISPLAY, EXPO_IN, EXPO_IN_OUT, EXPO_OUT, MONO, springAt, tween, useLayout} from '../../theme';
import {content} from '../content';
import {clamp, pal, useSceneTime, wave, Words} from '../kit';
import {beatToFrame, timeline} from '../timeline';

const {cues, scenes} = timeline;
export const VISION_LEAD = 10;
export const CLOSING_LEAD = 8;

/* ── 6 · Vision: sunrise, a plane, a train out of a tunnel, a trail — and the music is alive ── */
export const Vision: React.FC = () => {
  const {since, global} = useSceneTime('vision', VISION_LEAD);
  const {W, H, pick, vertical} = useLayout();
  const horizon = H * pick(0.68, 0.64);
  const t0 = since(scenes.vision.start);
  const dur = beatToFrame(scenes.vision.end) - beatToFrame(scenes.vision.start);

  const sunR = pick(120, 150);
  const sunX = W * pick(0.72, 0.5);
  const sunY = interpolate(t0, [-VISION_LEAD, dur], [horizon + sunR * 0.6, horizon - sunR * 1.6], {...clamp, easing: EXPO_OUT});
  const drift = interpolate(t0, [0, dur], [0, 1], clamp); // slow parallax

  // Silhouettes
  const farPeaks = vertical
    ? [[0, 0.62], [0.18, 0.5], [0.36, 0.58], [0.58, 0.44], [0.8, 0.56], [1, 0.5]]
    : [[0, 0.62], [0.12, 0.52], [0.26, 0.6], [0.44, 0.47], [0.62, 0.58], [0.8, 0.5], [1, 0.6]];
  const farPath =
    `M0,${horizon} ` + farPeaks.map(([x, y]) => `L${x * W - drift * 30},${H * y}`).join(' ') + ` L${W},${horizon} Z`;
  const tunnelX = W * pick(0.3, 0.28);
  const tunnelW = pick(110, 120);
  const midPath = `M0,${horizon} L0,${H * pick(0.6, 0.58)} L${W * 0.14},${H * pick(0.57, 0.55)} L${tunnelX + tunnelW * 1.6},${H * pick(0.6, 0.57)} L${W * 0.55},${horizon} Z`;

  // Train leaves the tunnel on "Tunnels."
  const trainT = since(cues.places[1]);
  const trainX = tunnelX + interpolate(trainT, [0, dur], [-tunnelW * 0.2, W * 0.9], {...clamp, easing: EXPO_IN_OUT});
  // Plane crosses the sky on "Flights."
  const planeT = since(cues.places[0] - 0.5);
  const planeX = interpolate(planeT, [0, dur * 0.8], [W + 100, W * 0.1], clamp);
  const planeY = H * pick(0.44, 0.42) - interpolate(planeT, [0, dur], [0, 50], clamp);
  // Trail draws up the far mountain on "Mountain trails."
  const trail = tween(since(cues.places[2]), 24);

  const life = interpolate(t0, [0, beatToFrame(cues.keepsPlaying) - beatToFrame(scenes.vision.start)], [0.05, 1], {...clamp, easing: EXPO_IN});
  const t2 = since(cues.keepsPlaying);

  return (
    <AbsoluteFill>
      {/* Sky + ground */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(to bottom, ${pal.warm.top} 0%, ${pal.warm.mid} ${pick(42, 40)}%, ${pal.warm.low} ${pick(58, 54)}%, ${pal.warm.horizon} ${pick(68, 64)}%, ${pal.warm.plum} ${pick(68, 64)}%, #140A18 100%)`,
        }}
      />
      {/* Sun + glow */}
      <div style={{position: 'absolute', left: sunX - sunR * 4, top: sunY - sunR * 4, width: sunR * 8, height: sunR * 8, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,231,168,0.55) 0%, rgba(255,180,90,0.18) 35%, transparent 65%)'}} />
      <div style={{position: 'absolute', left: sunX - sunR, top: sunY - sunR, width: sunR * 2, height: sunR * 2, borderRadius: '50%', background: pal.warm.sun, clipPath: `inset(0 0 ${Math.max(0, sunY + sunR - horizon)}px 0)`}} />

      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <path d={farPath} fill="#6B2F5C" opacity={0.75} />
        {/* trail on the far mountain */}
        <path
          d={`M${W * pick(0.5, 0.45)},${horizon - 10} Q${W * pick(0.47, 0.5)},${H * 0.56} ${W * pick(0.44, 0.58) - drift * 30},${H * pick(0.48, 0.45)}`}
          fill="none"
          stroke={pal.warm.sun}
          strokeWidth={4}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - trail}
        />
        <path d={midPath} fill="#3B1838" />
        {/* tunnel mouth */}
        <path d={`M${tunnelX},${horizon} L${tunnelX},${horizon - tunnelW * 0.55} A${tunnelW / 2},${tunnelW / 2} 0 0 1 ${tunnelX + tunnelW},${horizon - tunnelW * 0.55} L${tunnelX + tunnelW},${horizon} Z`} fill="#12070F" />
      </svg>

      {/* Train, clipped so it emerges from the tunnel mouth */}
      {trainT >= 0 ? (
        <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, clipPath: `inset(0 0 0 ${tunnelX + tunnelW * 0.15}px)`}}>
          <div style={{position: 'absolute', left: trainX, top: horizon - pick(58, 62), display: 'flex', gap: 6}}>
            {[0, 1, 2].map((c) => (
              <div key={c} style={{width: pick(150, 170), height: pick(54, 58), borderRadius: c === 2 ? '10px 40px 10px 10px' : 10, background: '#1E0C1C', display: 'flex', gap: 10, padding: '10px 14px'}}>
                {[0, 1, 2].map((w) => (
                  <div key={w} style={{flex: 1, height: 16, borderRadius: 3, background: 'rgba(255,200,120,0.75)'}} />
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Plane + contrail */}
      {planeT >= 0 ? (
        <>
          <div style={{position: 'absolute', left: planeX + 50, top: planeY + 14, width: Math.max(0, W - planeX), height: 3, background: 'linear-gradient(90deg, rgba(255,248,238,0.6), transparent 70%)'}} />
          <svg width={70} height={36} viewBox="0 0 70 36" style={{position: 'absolute', left: planeX, top: planeY}}>
            <path d="M2 18 L50 14 L66 6 L70 8 L60 18 L70 28 L66 30 L50 22 Z M28 15 L40 2 L46 2 L40 16 Z M28 21 L40 34 L46 34 L40 20 Z" fill="#2A1430" />
          </svg>
        </>
      ) : null}

      {/* The music line, alive again, along the horizon */}
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <g transform={`translate(0 ${horizon})`}>
          <path d={wave(W, pick(70, 80), global * 0.14, life)} fill="none" stroke={pal.warm.sun} strokeWidth={5} strokeLinecap="round" style={{filter: 'drop-shadow(0 0 12px rgba(255,220,150,0.9))'}} />
        </g>
      </svg>

      {/* Words */}
      <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', paddingTop: H * pick(0.1, 0.12), textShadow: '0 4px 30px rgba(40,10,40,0.45)'}}>
        <div style={{display: 'flex', columnGap: '0.3em', flexWrap: 'wrap', justifyContent: 'center', maxWidth: pick(1600, 980), fontFamily: DISPLAY, fontWeight: 800, fontSize: pick(84, 80), letterSpacing: '-0.035em', color: pal.warm.text, opacity: t2 >= 0 ? 0.85 : 1}}>
          {content.vision.places.map((p, i) => (
            <Words key={p} text={p} t={since(cues.places[i])} stagger={3} duration={12} />
          ))}
        </div>
        <div style={{marginTop: pick(26, 40), maxWidth: pick(1600, 980), display: 'flex', justifyContent: 'center'}}>
          <Words
            text={content.vision.line}
            t={t2}
            stagger={3}
            duration={12}
            color={pal.warm.text}
            highlight={['playing.']}
            highlightColor={pal.warm.sun}
            style={{fontFamily: DISPLAY, fontWeight: 900, fontSize: pick(124, 116), letterSpacing: '-0.045em', lineHeight: 1, justifyContent: 'center'}}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ── 7 · Closing: logo, name, the value phrase once more, URL ─────────── */
export const Closing: React.FC = () => {
  const {since} = useSceneTime('closing', CLOSING_LEAD);
  const {pick} = useLayout();
  const tLogo = since(cues.logo);
  const pop = springAt(tLogo, {damping: 12, mass: 0.7});
  const nameIn = tween(tLogo - 5, 12);
  const valueIn = tween(since(cues.closingValue), 12);
  const urlIn = tween(since(cues.url), 14);
  const end = interpolate(since(scenes.closing.end), [-8, 0], [0, 1], {...clamp, easing: EXPO_IN});
  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse 70% 60% at 50% 45%, #2A1622 0%, #0A0608 75%)', opacity: 1 - end}}>
      <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 38%, rgba(29,185,84,0.22) 0%, transparent 40%)'}} />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
        <div style={{transform: `scale(${interpolate(pop, [0, 1], [0.5, 1])})`, opacity: Math.min(1, pop * 1.5), filter: 'drop-shadow(0 0 50px rgba(29,185,84,0.5))'}}>
          <Logo size={pick(200, 240)} grooves spin={tLogo * 2} />
        </div>
        <div style={{marginTop: pick(36, 50), fontFamily: DISPLAY, fontWeight: 900, fontSize: pick(120, 120), letterSpacing: '-0.05em', color: '#fff', opacity: nameIn, transform: `translateY(${(1 - nameIn) * 30}px)`}}>
          {content.name}
        </div>
        <div style={{marginTop: pick(14, 24), display: 'flex', gap: '0.3em', fontFamily: DISPLAY, fontWeight: 800, fontSize: pick(54, 58), letterSpacing: '-0.03em', opacity: valueIn, transform: `translateY(${(1 - valueIn) * 20}px)`}}>
          <span style={{color: '#fff'}}>{content.value[0]}</span>
          <span style={{color: pal.green}}>{content.value[1]}</span>
        </div>
        <div style={{marginTop: pick(48, 70), position: 'relative', fontFamily: MONO, fontSize: pick(40, 40), color: pal.warm.text, opacity: urlIn}}>
          <div style={{clipPath: `inset(0 ${(1 - urlIn) * 100}% 0 0)`}}>{content.url}</div>
          <div style={{position: 'absolute', left: 0, bottom: -14, height: 4, width: `${tween(since(cues.url) - 4, 14) * 100}%`, background: pal.green, borderRadius: 4, boxShadow: '0 0 14px rgba(29,185,84,0.7)'}} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
