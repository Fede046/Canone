/**
 * YouTube thumbnail (1280×720) for the developer video: the real Music Zone of "84" on the right,
 * logo, wordmark and a short headline on the left. Rendered as a still:
 *   npx remotion still Canone-Thumbnail out/canone-thumbnail.png
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Logo, Wordmark} from './kit';
import {C, MONO, SANS} from './theme';
import {PALETTES, songs} from './zones/data';
import {MusicZone} from './zones/MusicZone';

export type ThumbnailProps = {t: number};

export const Thumbnail: React.FC<ThumbnailProps> = ({t}) => (
  <AbsoluteFill style={{background: C.cold.bg}}>
    {/* The Zone, as the app draws it */}
    <div style={{position: 'absolute', right: 0, top: 0, width: 820, height: 720}}>
      <MusicZone song={songs.fast} t={t} width={820} height={720} colors={PALETTES.fast} cx={0.56} />
    </div>
    {/* Fade into the dark text side */}
    <AbsoluteFill style={{background: `linear-gradient(90deg, ${C.cold.bg} 34%, rgba(7,6,11,0.7) 50%, rgba(7,6,11,0) 68%)`}} />

    <div style={{position: 'absolute', left: 72, top: 0, bottom: 0, width: 640, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 34}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 22}}>
        <Logo size={92} />
        <Wordmark size={88} />
      </div>
      <div style={{fontFamily: SANS, fontWeight: 900, fontSize: 104, lineHeight: 0.95, letterSpacing: '-0.035em', color: C.white}}>
        See every
        <br />
        <span style={{color: C.purpleLight}}>beat.</span>
      </div>
      <div style={{display: 'flex', gap: 12}}>
        {['Android', 'Kotlin', 'On-device'].map((label) => (
          <div
            key={label}
            style={{fontFamily: MONO, fontWeight: 500, fontSize: 24, color: C.text2, padding: '8px 16px', borderRadius: 999, border: `1.5px solid ${C.outline}`, background: 'rgba(23,20,31,0.8)'}}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  </AbsoluteFill>
);
