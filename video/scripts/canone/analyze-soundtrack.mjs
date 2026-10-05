// Runs the Music Zone analysis (the app's, see analysis.mjs) on the finished soundtracks, so the
// MZ figure behind the value phrase and the ending reacts to the music you actually hear.
// → src/canone/data/soundtrack.json   (run after make-music.mjs)
//
//   node scripts/canone/analyze-soundtrack.mjs
import {writeFileSync} from 'node:fs';
import {analyzeMusicZone, decodeMono, MZ} from './analysis.mjs';

const out = {};
for (const audience of ['public', 'dev']) {
  const mz = analyzeMusicZone(decodeMono(`public/canone/${audience}.wav`, 48000), 48000);
  const bands = [];
  const cumulative = [];
  for (let f = 0; f < mz.frames; f++) {
    for (let b = 0; b < MZ.BAND_COUNT; b++) bands.push(Math.round(255 * mz.energyAtFrame(b, f)));
    cumulative.push(Math.round(mz.cumulative[f] * 1000) / 1000);
  }
  out[audience] = {
    mz: {from: 0, frames: mz.frames, bands, cumulative, onsets: mz.onsets.map((o) => [o.frame, Math.round(o.strength * 1000) / 1000]), figureChanges: mz.figureChanges},
  };
  console.log(`${audience}: ${mz.frames} frames, ${mz.onsets.length} strong hits`);
}
writeFileSync('src/canone/data/soundtrack.json', JSON.stringify(out));
console.log('→ src/canone/data/soundtrack.json');
