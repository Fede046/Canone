import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {content} from '../content';
import {Logo, spiralPath} from '../components/Logo';
import {Signal} from '../components/Stage';
import {colors, DISPLAY, EXPO_IN, EXPO_OUT, MONO, springAt, tween, useLayout, useSceneTime} from '../theme';
import {beatToFrame, timeline} from '../timeline';

const {cues, scenes} = timeline;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const SPIRAL = spiralPath(7, 49, 2);

/**
 * 13–15 s: the line winds into a spiral (a vinyl groove) and snaps into the logo
 * on the impact beat, with a shockwave. Then wordmark (slot reveal) and the repo URL,
 * underlined by the line one last time. Ends on a clean fade.
 */
export const Outro: React.FC = () => {
  const {since} = useSceneTime('outro');
  const {W, H, pick} = useLayout();

  const logoSize = pick(250, 330);
  const impactT = since(cues.logoImpact);
  const wind = interpolate(since(cues.spiral), [0, beatToFrame(cues.logoImpact) - beatToFrame(cues.spiral)], [0, 1], {
    ...clamp,
    easing: EXPO_IN,
  });
  const logoPop = impactT >= 0 ? springAt(impactT, {damping: 11, mass: 0.7}) : 0;
  const logoScale = impactT >= 0 ? interpolate(logoPop, [0, 1], [1.5, 1]) : 0;

  // Layout: logo, wordmark, URL stacked and centred; logo starts alone at centre, then rises.
  const settle = interpolate(since(cues.wordmark), [-4, 8], [0, 1], {...clamp, easing: EXPO_OUT});
  const wordFont = pick(124, 128);
  const urlFont = pick(44, 42);
  const blockH = logoSize + 60 + wordFont + 50 + urlFont;
  const logoCy = interpolate(settle, [0, 1], [H / 2, H / 2 - blockH / 2 + logoSize / 2]);

  // Wordmark slot (the signature move again)
  const wordOpen = springAt(since(cues.wordmark), {damping: 18, mass: 0.6});
  const wordY = logoCy + logoSize / 2 + 60;
  const wordGap = wordOpen * wordFont * 1.1;

  // URL wipe + final underline
  const urlT = since(cues.url);
  const urlReveal = tween(urlT, 12);
  const urlLine = tween(urlT - 4, 14);
  const urlY = wordY + wordFont * 1.1 + 40;

  const fade = interpolate(since(scenes.outro.end), [-8, 0], [0, 1], {...clamp, easing: EXPO_IN});

  return (
    <AbsoluteFill style={{opacity: 1 - fade}}>
      {/* Spiral: the line wound into a groove, collapsing into the disc */}
      {impactT < 0 ? (
        <svg
          width={logoSize * 1.9}
          height={logoSize * 1.9}
          viewBox="0 0 100 100"
          style={{
            position: 'absolute',
            left: W / 2 - logoSize * 0.95,
            top: H / 2 - logoSize * 0.95,
            transform: `rotate(${-220 * (1 - wind)}deg) scale(${interpolate(wind, [0, 1], [1, 0.55])})`,
            overflow: 'visible',
          }}
        >
          <path
            d={SPIRAL}
            fill="none"
            stroke={colors.line}
            strokeWidth={1.6}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - wind}
            style={{filter: 'drop-shadow(0 0 3px rgba(29,185,84,0.8))'}}
          />
        </svg>
      ) : null}

      {/* Shockwaves */}
      {impactT >= 0
        ? [0, 4].map((d) => {
            const p = tween(impactT - d, 20);
            return (
              <div
                key={d}
                style={{
                  position: 'absolute',
                  left: W / 2,
                  top: logoCy,
                  width: logoSize,
                  height: logoSize,
                  marginLeft: -logoSize / 2,
                  marginTop: -logoSize / 2,
                  borderRadius: '50%',
                  border: `${interpolate(p, [0, 1], [10, 1])}px solid ${colors.line}`,
                  transform: `scale(${interpolate(p, [0, 1], [1, pick(4.5, 3.2)])})`,
                  opacity: impactT - d >= 0 ? 1 - p : 0,
                }}
              />
            );
          })
        : null}

      {impactT >= 0 ? (
        <div
          style={{
            position: 'absolute',
            left: W / 2 - logoSize / 2,
            top: logoCy - logoSize / 2,
            transform: `scale(${logoScale})`,
            filter: `drop-shadow(0 0 ${40 * (1 - logoPop) + 20}px rgba(29,185,84,0.45))`,
          }}
        >
          <Logo size={logoSize} grooves spin={impactT * 2.5} />
        </div>
      ) : null}

      {/* Wordmark in a slot */}
      {wordGap > 1 ? (
        <>
          <AbsoluteFill style={{clipPath: `inset(${wordY}px 0 ${H - wordY - wordGap}px 0)`}}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: wordY + (wordGap - wordFont * 1.1) / 2,
                height: wordFont * 1.1,
                lineHeight: `${wordFont * 1.1}px`,
                textAlign: 'center',
                fontFamily: DISPLAY,
                fontWeight: 800,
                fontSize: wordFont,
                letterSpacing: '-0.045em',
                color: colors.white,
              }}
            >
              {content.outro.wordmark}
            </div>
          </AbsoluteFill>
          {wordOpen < 0.98 ? (
            <>
              <Signal style={{left: 0, width: W, top: wordY - 2, opacity: 1 - wordOpen}} thickness={4} />
              <Signal style={{left: 0, width: W, top: wordY + wordGap - 2, opacity: 1 - wordOpen}} thickness={4} />
            </>
          ) : null}
        </>
      ) : null}

      {/* URL */}
      {urlT >= 0 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: urlY, display: 'flex', justifyContent: 'center'}}>
          <div style={{position: 'relative'}}>
            <div
              style={{
                fontFamily: MONO,
                fontSize: urlFont,
                fontWeight: 500,
                color: colors.white,
                letterSpacing: '0.01em',
                clipPath: `inset(0 ${(1 - urlReveal) * 100}% 0 0)`,
              }}
            >
              {content.outro.url}
            </div>
            <Signal style={{left: 0, width: `${urlLine * 100}%`, bottom: -urlFont * 0.45}} thickness={5} />
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
