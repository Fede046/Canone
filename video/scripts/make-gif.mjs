// Builds out/showreel-horizontal.gif for the README (silent, < 10 MB).
// 1. renders the "Showreel-GIF" composition (no grain/blur/audio, static glow) at half size
// 2. converts it with a 2-pass ffmpeg palette (small file, no banding)
// Requires ffmpeg on PATH.   Usage: node scripts/make-gif.mjs [width=960] [fps=15] [colors=96]
import {spawnSync} from 'node:child_process';
import {rmSync, statSync} from 'node:fs';

const width = Number(process.argv[2] ?? 960);
const fps = Number(process.argv[3] ?? 15);
const colors = Number(process.argv[4] ?? 96);
const source = 'out/.gif-source.mp4';
const output = 'out/showreel-horizontal.gif';
const remotionCli = 'node_modules/@remotion/cli/remotion-cli.js';

const run = (cmd, args) => {
  const res = spawnSync(cmd, args, {stdio: 'inherit'});
  if (res.error) {
    console.error(`Could not run ${cmd}: ${res.error.message}`);
    process.exit(1);
  }
  if (res.status !== 0) process.exit(res.status ?? 1);
};

run(process.execPath, [remotionCli, 'render', 'Showreel-GIF', source, '--codec=h264', '--crf=12', '--muted', `--scale=${width / 1920}`]);

const filter =
  `fps=${fps},split[a][b];` +
  `[a]palettegen=max_colors=${colors}:stats_mode=diff[p];` +
  `[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`;
run('ffmpeg', ['-y', '-loglevel', 'error', '-i', source, '-vf', filter, '-loop', '0', output]);
rmSync(source, {force: true});

const bytes = statSync(output).size;
const mb = bytes / 1e6;
console.log(`${output}: ${mb.toFixed(2)} MB = ${bytes} bytes (${width}px, ${fps}fps, ${colors} colours)`);
if (bytes >= 10e6) console.warn('Over 10 MB: try "node scripts/make-gif.mjs 800 12".');
