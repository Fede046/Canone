import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {CircleZone} from './zones/CircleZone';
import {PALETTES, songs} from './zones/data';
import {ForestZone} from './zones/ForestZone';
import {MusicZone} from './zones/MusicZone';

/** Development aid: the three Zones side by side, fast row and calm row. */
export const ZonesTest: React.FC = () => {
  const f = useCurrentFrame();
  const w = 640;
  const h = 540;
  const tf = 62.37 + f / 30;
  const tc = 192.57 + f / 30;
  return (
    <AbsoluteFill style={{display: 'grid', gridTemplateColumns: 'repeat(3, 640px)', gridTemplateRows: 'repeat(2, 540px)'}}>
      <MusicZone song={songs.fast} t={tf} width={w} height={h} colors={PALETTES.fast} />
      <CircleZone song={songs.fast} t={tf} width={w} height={h} />
      <ForestZone song={songs.fast} songStart={62.37} frames={f} width={w} height={h} sky="dusk" sunArc={0.85} isSun />
      <MusicZone song={songs.calm} t={tc} width={w} height={h} colors={PALETTES.calm} />
      <CircleZone song={songs.calm} t={tc} width={w} height={h} />
      <ForestZone song={songs.calm} songStart={192.57} frames={f} width={w} height={h} sky="violet" sunArc={0.4} />
    </AbsoluteFill>
  );
};
