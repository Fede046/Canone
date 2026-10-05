/**
 * Developer video, 52–74.5 s: the parenthesis "( How the Zones work )".
 * A giant "(" opens the aside, a ")" closes it. Every number on screen comes from the analysis of
 * the real songs, computed with the app's own algorithm (scripts/canone/analysis.mjs).
 *   pipeline: file → MediaCodec → mono → FFT → bytes on disk (no RECORD_AUDIO in the manifest)
 *   MZ: the symmetric curve and its parameters, new figure on the first big hit after 8 s
 *   CZ: chroma vs the 24 Krumhansl-Kessler key profiles, chords as the cheapest (Viterbi) path
 *   FZ: one energy curve per song, with its calm / middle / energetic states
 */
import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {brand, devContent} from '../content';
import {Chip, CodeWindow, MicOffIcon, StepCaption, useBeat} from '../kit';
import {C, EXPO_IN_OUT, EXPO_OUT, MONO, SANS, SERIF_ITALIC, clamp, useLayout} from '../theme';
import {FPS, beatToFrame, timelines, typedChars, type SongExcerpt} from '../timeline';
import {CircleZone, Speller} from '../zones/CircleZone';
import {CALM, ENERGETIC, FIGURE_SEQUENCE, MIDDLE, PALETTES, songs, type Song} from '../zones/data';
import {MusicZone} from '../zones/MusicZone';

const tl = timelines.dev;
const cues = tl.cues;
const sc = tl.scenes;
const D = devContent;
const ex0 = tl.songs[0] as SongExcerpt; // "84" from 114 to 142
const songT = (ex: SongExcerpt, frame: number) => ex.at + (frame - beatToFrame(ex.from)) / FPS;
const STATE_COLORS = ['#4C3B6E', C.purple, C.magenta];

/* ── The parentheses ─────────────────────────────────────────────────────── */
const Parens: React.FC = () => {
  const {since} = useBeat();
  const {W, H, u, vertical} = useLayout();
  const open = interpolate(since(cues.parenOpen), [0, 16], [0, 1], {...clamp, easing: EXPO_OUT});
  const close = interpolate(since(cues.parenClose), [0, 10], [0, 1], {...clamp, easing: EXPO_OUT});
  const h = H * (vertical ? 0.9 : 0.86);
  const w = vertical ? u * 6 : u * 7;
  const top = (H - h) / 2;
  const path = (left: boolean) => (left ? `M ${w} 0 Q ${-w * 0.6} ${h / 2} ${w} ${h}` : `M 0 0 Q ${w * 1.6} ${h / 2} 0 ${h}`);
  const len = h * 1.15;
  return (
    <>
      <svg width={w} height={h} style={{position: 'absolute', left: W * (vertical ? 0.01 : 0.015), top, overflow: 'visible'}}>
        <path d={path(true)} fill="none" stroke={C.purpleLight} strokeWidth={u * 0.5} strokeLinecap="round" strokeDasharray={`${len * open} ${len}`} style={{filter: `drop-shadow(0 0 ${u}px ${C.purple})`}} />
      </svg>
      <svg width={w} height={h} style={{position: 'absolute', right: W * (vertical ? 0.01 : 0.015), top, overflow: 'visible'}}>
        <path d={path(false)} fill="none" stroke={C.purpleLight} strokeWidth={u * 0.5} strokeLinecap="round" strokeDasharray={`${len * close} ${len}`} style={{filter: `drop-shadow(0 0 ${u}px ${C.purple})`}} />
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: vertical ? H * 0.025 : H * 0.035, textAlign: 'center', fontFamily: MONO, fontSize: u * 2.4, letterSpacing: '0.18em', color: C.purpleLight, opacity: open, textTransform: 'uppercase'}}>
        ( {D.zonesLabel}
        <span style={{opacity: close}}> )</span>
      </div>
    </>
  );
};

const Caption: React.FC<{text: string; at: number}> = ({text, at}) => {
  const {since} = useBeat();
  const {W, H, u, vertical} = useLayout();
  return (
    <div style={{position: 'absolute', left: W * 0.08, right: W * 0.08, top: vertical ? H * 0.065 : H * 0.095}}>
      <StepCaption text={text} t={since(at)} size={vertical ? u * 5.2 : u * 4.8} />
    </div>
  );
};

/* ── Pipeline ────────────────────────────────────────────────────────────── */
const Pipeline: React.FC = () => {
  const {frame, since, p} = useBeat();
  const {W, H, u, vertical} = useLayout();
  const steps = D.pipeline.steps;
  const typed = typedChars(frame, cues.typing.pipeline, D.pipeline.code.lines[0].length);
  const nodeW = vertical ? W * 0.56 : W * 0.142;
  const nodeH = vertical ? u * 8 : u * 10;
  const gapX = vertical ? 0 : (W * 0.8 - nodeW * 5) / 4;
  const gapY = vertical ? u * 3.2 : 0;
  const x0 = vertical ? (W - nodeW) / 2 : W * 0.1;
  const y0 = vertical ? H * 0.17 : H * 0.28;
  const pulse = ((frame % 30) / 30);
  return (
    <AbsoluteFill>
      <Caption text={D.pipeline.caption} at={sc.pipeline.start + 0.5} />
      {steps.map((label, i) => {
        const lit = p(cues.pipelineSteps[i], 10);
        const x = x0 + (vertical ? 0 : i * (nodeW + gapX));
        const y = y0 + (vertical ? i * (nodeH + gapY) : 0);
        return (
          <React.Fragment key={label}>
            <div style={{position: 'absolute', left: x, top: y, width: nodeW, height: nodeH, borderRadius: u * 1.6, border: `2px solid ${lit > 0.5 ? C.purple : C.surface3}`, background: lit > 0.5 ? `${C.purple}26` : C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: i === 1 || i === 3 ? MONO : SANS, fontWeight: 700, fontSize: vertical ? u * 3.8 : u * 3, color: lit > 0.5 ? C.white : C.text2, boxShadow: lit > 0 ? `0 0 ${u * 4 * lit}px ${C.purple}66` : undefined, transform: `scale(${0.94 + 0.06 * lit})`}}>
              {label}
            </div>
            {i < steps.length - 1 ? (
              <div
                style={{
                  position: 'absolute',
                  left: vertical ? x + nodeW / 2 - 1 : x + nodeW + u * 0.6,
                  top: vertical ? y + nodeH + u * 0.5 : y + nodeH / 2 - 1,
                  width: vertical ? 2 : gapX - u * 1.2,
                  height: vertical ? gapY - u * 1 : 2,
                  background: p(cues.pipelineSteps[i + 1], 8) > 0.5 ? C.purpleLight : C.surface3,
                }}
              >
                {p(cues.pipelineSteps[i + 1], 8) > 0.5 ? (
                  <div style={{position: 'absolute', left: vertical ? -u * 0.6 : pulse * (gapX - u * 1.2) - u * 0.6, top: vertical ? pulse * (gapY - u) - u * 0.6 : -u * 0.6, width: u * 1.2, height: u * 1.2, borderRadius: '50%', background: C.magenta}} />
                ) : null}
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
      <div style={{position: 'absolute', left: vertical ? W * 0.08 : W * 0.1, top: vertical ? H * 0.6 : H * 0.48, width: vertical ? W * 0.84 : W * 0.5, opacity: p(cues.typing.pipeline.start - 0.4, 10)}}>
        <CodeWindow kind="editor" title={D.pipeline.code.file} lines={D.pipeline.code.lines} typed={typed} firstLine={D.pipeline.code.firstLine} fontSize={vertical ? u * 2.6 : u * 2.5} width="100%" wrap highlight={[{line: 0, p: p(cues.typing.pipeline.end + 0.3, 10)}]} />
      </div>
      <div style={{position: 'absolute', left: vertical ? W * 0.08 : W * 0.64, top: vertical ? H * 0.76 : H * 0.48, width: vertical ? W * 0.84 : W * 0.28, opacity: p(cues.manifest, 12), transform: `translateY(${(1 - p(cues.manifest, 12)) * u * 3}px)`}}>
        <div style={{fontFamily: MONO, fontSize: vertical ? u * 2.6 : u * 2.2, color: C.text2, marginBottom: u * 1.2}}>AndroidManifest.xml</div>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: u * 0.9}}>
          {D.pipeline.manifest.map((m) => (
            <span key={m} style={{fontFamily: MONO, fontSize: vertical ? u * 2.3 : u * 1.9, padding: `${u * 0.4}px ${u * 1}px`, borderRadius: u * 0.8, background: C.surface2, color: C.text2}}>
              {m}
            </span>
          ))}
        </div>
        <div style={{marginTop: u * 1.6}}>
          <Chip size={vertical ? u * 2.8 : u * 2.3} color={C.magenta} p={p(cues.manifest + 0.6, 10)}>
            <MicOffIcon size={u * 2.8} color={C.magenta} />
            {D.pipeline.noMic}
          </Chip>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ── Music Zone ──────────────────────────────────────────────────────────── */
const Bar: React.FC<{label: string; from: string; value: number; shown: number; u: number; vertical: boolean}> = ({label, from, value, shown, u, vertical}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: u * 1.6, fontFamily: MONO, fontSize: vertical ? u * 3 : u * 2.3, opacity: shown}}>
    <span style={{width: u * 3, color: C.purpleLight, fontWeight: 700}}>{label}</span>
    <span style={{width: vertical ? u * 15 : u * 12, color: C.text2, whiteSpace: 'nowrap'}}>← {from}</span>
    <div style={{flex: 1, height: u * 1.4, borderRadius: u, background: C.surface3}}>
      <div style={{width: `${Math.min(1, value) * 100}%`, height: '100%', borderRadius: u, background: `linear-gradient(90deg, ${C.purple}, ${C.magenta})`}} />
    </div>
  </div>
);

const MusicZoneExplained: React.FC = () => {
  const {frame, since, p} = useBeat();
  const {W, H, u, vertical} = useLayout();
  const song = songs.fast;
  const t = songT(ex0, frame);
  const inB = frame >= beatToFrame(sc.mzB.start);
  const size = Math.round(vertical ? W * 0.8 : H * 0.7);
  const shape = song.shapeAt(t);
  const mids = song.smoothed(1, 3, t);
  const highs = song.smoothed(4, 5, t);
  const bass = song.smoothed(0, 0, t);
  const k = shape.morph < 0.5 ? shape.fromK : shape.toK;
  const leftX = vertical ? W * 0.08 : W * 0.08;
  const leftY = vertical ? H * 0.21 + size + u * 4 : H * 0.34;
  const leftW = vertical ? W * 0.84 : W * 0.44;
  // Strong hits around now, and the 8-second rule
  const changeAt = song.figureStart(shape.index);
  const winA = t - 9;
  const winB = t + 1.5;
  const toX = (s: number) => ((s - winA) / (winB - winA)) * leftW;
  const hits = song.onsets().filter(([f]) => f / FPS >= winA && f / FPS <= winB);
  const prevChange = shape.index > 0 ? song.figureStart(shape.index - 1) : changeAt;
  const ruleFrom = shape.morph < 1 && t - changeAt < 3 ? prevChange : changeAt;
  const flash = interpolate(t - changeAt, [0, 0.2, 1.2], [0, 1, 0], clamp);
  return (
    <AbsoluteFill>
      <Caption text={inB ? D.mz.b.caption : D.mz.a.caption} at={inB ? sc.mzB.start + 0.3 : sc.mzA.start + 0.3} />
      <div style={{position: 'absolute', left: vertical ? (W - size) / 2 : W * 0.55, top: vertical ? H * 0.21 : H * 0.24, width: size, height: size, borderRadius: u * 3, overflow: 'hidden', boxShadow: `0 0 0 1px ${C.purple}44, 0 30px 80px rgba(0,0,0,0.6)`, opacity: p(sc.mzA.start, 12)}}>
        <MusicZone song={song} t={t} width={size} height={size} colors={PALETTES.fast} opt={{intro: since(sc.mzA.start) / FPS + 1}} />
        <div style={{position: 'absolute', left: u * 2, top: u * 1.6, fontFamily: MONO, fontSize: u * 2.6, color: C.white, fontWeight: 700}}>
          k = {k}
          <span style={{color: C.text2, fontWeight: 500}}> · {brand.songs.fast.title}</span>
        </div>
      </div>
      <div style={{position: 'absolute', left: leftX, top: leftY, width: leftW}}>
        {!inB ? (
          <>
            <div style={{fontFamily: SERIF_ITALIC, fontSize: vertical ? u * 5.4 : u * 4.4, color: C.white, opacity: p(sc.mzA.start + 0.5, 12), whiteSpace: 'nowrap'}}>{D.mz.formula}</div>
            <div style={{display: 'flex', flexDirection: 'column', gap: u * 1.8, marginTop: u * 4}}>
              <Bar label="a" from={D.mz.params[0].from} value={mids} shown={p(116.5, 10)} u={u} vertical={vertical} />
              <Bar label="b" from={D.mz.params[1].from} value={highs} shown={p(117.2, 10)} u={u} vertical={vertical} />
              <Bar label="r" from={D.mz.params[2].from} value={bass} shown={p(117.9, 10)} u={u} vertical={vertical} />
            </div>
            <div style={{marginTop: u * 3, fontFamily: SANS, fontSize: vertical ? u * 3 : u * 2.3, color: C.text2, opacity: p(118.6, 10)}}>
              {`k lobes, ${'360°'}/k symmetry — any a, b keep it exact`}
            </div>
          </>
        ) : (
          <>
            <div style={{display: 'flex', gap: u * 1.2}}>
              {D.mz.sequence.map((n, i) => {
                const cur = shape.index % FIGURE_SEQUENCE.length === i;
                return (
                  <div key={i} style={{width: vertical ? u * 7 : u * 4.6, height: vertical ? u * 7 : u * 4.6, borderRadius: u, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontWeight: 800, fontSize: vertical ? u * 3.4 : u * 2.4, background: cur ? C.purple : C.surface2, color: cur ? C.black : C.text2, boxShadow: cur ? `0 0 ${u * 3}px ${C.purple}` : undefined}}>
                    {n}
                  </div>
                );
              })}
            </div>
            <svg width={leftW} height={u * 16} style={{marginTop: u * 4, overflow: 'visible'}}>
              <line x1={0} y1={u * 9} x2={leftW} y2={u * 9} stroke={C.surface3} strokeWidth={2} />
              <rect x={toX(ruleFrom)} y={u * 2} width={Math.max(0, toX(ruleFrom + 8) - toX(ruleFrom))} height={u * 3} rx={u * 0.6} fill={`${C.purple}33`} stroke={C.purple} />
              <text x={toX(ruleFrom) + u} y={u * 4.2} fill={C.purpleLight} fontFamily={MONO} fontSize={u * 2}>
                ≥ 8 s
              </text>
              {hits.map(([f, s]) => {
                const x = toX(f / FPS);
                const isChange = Math.abs(f / FPS - changeAt) < 0.05;
                return <line key={f} x1={x} y1={u * 9 - u * 3.5 * s} x2={x} y2={u * 9 + u * 3.5 * s} stroke={isChange ? C.magenta : C.text2} strokeWidth={isChange ? 4 : 2} />;
              })}
              <line x1={toX(t)} y1={0} x2={toX(t)} y2={u * 14} stroke={C.white} strokeWidth={2.5} />
              {flash > 0 ? (
                <text x={toX(changeAt)} y={u * 15.5} fill={C.magenta} fontFamily={SANS} fontWeight={800} fontSize={u * 2.4} textAnchor="middle" opacity={flash}>
                  {D.mz.hit} → k = {shape.toK}
                </text>
              ) : null}
            </svg>
          </>
        )}
      </div>
    </AbsoluteFill>
  );
};

/* ── Circle Zone ─────────────────────────────────────────────────────────── */
const CircleZoneExplained: React.FC = () => {
  const {frame, since, p} = useBeat();
  const {W, H, u, vertical} = useLayout();
  const song = songs.fast;
  const t = songT(ex0, frame);
  const inB = frame >= beatToFrame(sc.czB.start);
  const size = Math.round(vertical ? W * 0.8 : H * 0.7);
  const speller = new Speller(song.key);
  const leftX = W * 0.08;
  const leftY = vertical ? H * 0.21 + size + u * 4 : H * 0.3;
  const leftW = vertical ? W * 0.84 : W * 0.44;
  // Key sweep: one candidate after the other, ending on the best one
  const ranked = [...song.keyScores].sort((a, b) => a.score - b.score);
  const sweep = interpolate(since(cues.keySweep.start), [0, beatToFrame(cues.keySweep.end - cues.keySweep.start)], [0, 1], {...clamp, easing: EXPO_IN_OUT});
  const idx = Math.min(ranked.length - 1, Math.floor(sweep * ranked.length));
  const found = p(cues.keyFound, 10);
  const cand = found > 0 ? ranked[ranked.length - 1] : ranked[idx];
  const profile = (cand.minor ? [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17] : [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]).map((_, pc, arr) => arr[((pc - cand.tonic) % 12 + 12) % 12] / 6.35);
  const candName = new Speller({tonic: cand.tonic, minor: cand.minor}).keyName;
  const chartH = vertical ? u * 26 : u * 24;
  const barW = leftW / 12;
  // Viterbi lattice (part B): the chords of the last 5 s, one column every 0.25 s
  const typed = typedChars(frame, cues.typing.cz, D.cz.code.lines.reduce((a, l) => a + l.length, 0));
  const span = 5;
  const cols = 20;
  const recent = song.chords.filter((c) => c.quality >= 0 && c.start > t - span - 4 && c.start <= t);
  const labels = Array.from(new Set(recent.map((c) => `${c.root}:${c.quality}`))).slice(-5);
  const rowOf = (c: {root: number; quality: number}) => labels.indexOf(`${c.root}:${c.quality}`);
  const draw = interpolate(since(cues.viterbi.start), [0, beatToFrame(cues.viterbi.end - cues.viterbi.start)], [0, 1], clamp);
  const latH = vertical ? u * 24 : u * 20;
  return (
    <AbsoluteFill>
      <Caption text={inB ? D.cz.b.caption : D.cz.a.caption} at={inB ? sc.czB.start + 0.3 : sc.czA.start + 0.3} />
      <div style={{position: 'absolute', left: vertical ? (W - size) / 2 : W * 0.55, top: vertical ? H * 0.21 : H * 0.24, width: size, height: size, borderRadius: u * 3, overflow: 'hidden', boxShadow: `0 0 0 1px ${C.purple}44, 0 30px 80px rgba(0,0,0,0.6)`, opacity: p(sc.czA.start, 12)}}>
        <CircleZone song={song} t={t} width={size} height={size} />
      </div>
      <div style={{position: 'absolute', left: leftX, top: leftY, width: leftW}}>
        {!inB ? (
          <>
            <svg width={leftW} height={chartH + u * 6} style={{overflow: 'visible', opacity: p(sc.czA.start + 0.5, 12)}}>
              {song.chroma.map((v, pc) => (
                <g key={pc}>
                  <rect x={pc * barW + barW * 0.15} y={chartH - v * chartH} width={barW * 0.7} height={v * chartH} rx={u * 0.4} fill={`${C.purple}aa`} />
                  <rect x={pc * barW + barW * 0.1} y={chartH - profile[pc] * chartH} width={barW * 0.8} height={profile[pc] * chartH} rx={u * 0.4} fill="none" stroke={found > 0 ? C.magenta : C.purpleLight} strokeWidth={2} strokeDasharray={found > 0 ? undefined : '5 4'} opacity={since(cues.keySweep.start) >= 0 ? 1 : 0} />
                  <text x={pc * barW + barW / 2} y={chartH + u * 3.4} fill={C.text2} fontFamily={MONO} fontSize={vertical ? u * 2.2 : u * 1.7} textAnchor="middle">
                    {speller.name(pc)}
                  </text>
                </g>
              ))}
            </svg>
            <div style={{display: 'flex', alignItems: 'center', gap: u * 2, marginTop: u * 2, fontFamily: SANS, opacity: since(cues.keySweep.start) >= 0 ? 1 : 0}}>
              <span style={{fontSize: vertical ? u * 4.4 : u * 3.4, fontWeight: 800, color: found > 0 ? C.white : C.text2}}>{candName}</span>
              <span style={{fontFamily: MONO, fontSize: vertical ? u * 2.8 : u * 2.2, color: C.purpleLight}}>r = {cand.score.toFixed(2)}</span>
              <span style={{fontFamily: MONO, fontSize: vertical ? u * 2.4 : u * 1.8, color: C.text2}}>{found > 0 ? '' : `${idx + 1} / 24`}</span>
              {found > 0 ? (
                <Chip size={vertical ? u * 2.6 : u * 2.1} p={found}>
                  {D.cz.keyLabel}
                </Chip>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <CodeWindow kind="editor" title={D.cz.code.file} lines={D.cz.code.lines} typed={typed} firstLine={D.cz.code.firstLine} fontSize={vertical ? u * 2.4 : u * 2.1} width="100%" wrap highlight={[{line: 1, p: p(cues.typing.cz.end, 10)}]} />
            <svg width={leftW} height={latH + u * 4} style={{marginTop: u * 3, overflow: 'visible'}}>
              {labels.map((l, r) => {
                const [root, q] = l.split(':').map(Number);
                return (
                  <text key={l} x={0} y={(r + 0.5) * (latH / Math.max(1, labels.length)) + u * 0.8} fill={C.text2} fontFamily={MONO} fontSize={vertical ? u * 2.4 : u * 1.8}>
                    {speller.chordName(root, q)}
                  </text>
                );
              })}
              {Array.from({length: cols}, (_, ci) => {
                const ct = t - span + (ci / (cols - 1)) * span;
                const cur = song.chords[song.chordIndexAt(ct)];
                const x = u * 8 + (ci / (cols - 1)) * (leftW - u * 9);
                return labels.map((_, r) => {
                  const on = cur && rowOf(cur) === r;
                  const y = (r + 0.5) * (latH / Math.max(1, labels.length));
                  return <circle key={`${ci}-${r}`} cx={x} cy={y} r={on ? u * 0.9 : u * 0.45} fill={on ? C.purpleLight : C.surface3} opacity={on ? 0.9 : 0.8} />;
                });
              })}
              <path
                d={Array.from({length: cols}, (_, ci) => {
                  const ct = t - span + (ci / (cols - 1)) * span;
                  const cur = song.chords[song.chordIndexAt(ct)];
                  const r = cur ? Math.max(0, rowOf(cur)) : 0;
                  const x = u * 8 + (ci / (cols - 1)) * (leftW - u * 9);
                  const y = (r + 0.5) * (latH / Math.max(1, labels.length));
                  return `${ci ? 'L' : 'M'}${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke={C.magenta}
                strokeWidth={u * 0.5}
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray={`${draw} 1`}
                style={{filter: `drop-shadow(0 0 ${u}px ${C.magenta})`}}
              />
            </svg>
          </>
        )}
      </div>
    </AbsoluteFill>
  );
};

/* ── Firewatch Zone ──────────────────────────────────────────────────────── */
const EnergyChart: React.FC<{song: Song; width: number; height: number; draw: number}> = ({song, width, height, draw}) => {
  const {values, states} = song.energyCurve;
  const from = 0;
  const to = values.length;
  const n = to - from;
  const x = (i: number) => ((i - from) / (n - 1)) * width;
  const y = (v: number) => height - v * height;
  const shown = from + Math.floor(n * draw);
  return (
    <svg width={width} height={height} style={{overflow: 'visible'}}>
      {[0.36, 0.66].map((th) => (
        <line key={th} x1={0} x2={width} y1={y(th)} y2={y(th)} stroke={C.surface3} strokeWidth={1.5} strokeDasharray="6 6" />
      ))}
      {Array.from({length: Math.max(0, shown - from)}, (_, k) => {
        const i = from + k;
        return <rect key={i} x={x(i)} y={y(values[i])} width={Math.max(1, width / n + 0.5)} height={height - y(values[i])} fill={STATE_COLORS[states[i]]} opacity={0.85} />;
      })}
    </svg>
  );
};

const FirewatchExplained: React.FC = () => {
  const {since, p} = useBeat();
  const {W, H, u, vertical} = useLayout();
  const draw = interpolate(since(cues.energyCurves.start), [0, beatToFrame(cues.energyCurves.end - cues.energyCurves.start)], [0, 1], {...clamp, easing: EXPO_IN_OUT});
  const chartW = vertical ? W * 0.84 : W * 0.8;
  const chartH = vertical ? H * 0.16 : H * 0.17;
  return (
    <AbsoluteFill>
      <Caption text={D.fz.a.caption} at={sc.fzA.start + 0.3} />
      <div style={{position: 'absolute', left: (W - chartW) / 2, top: vertical ? H * 0.21 : H * 0.27, display: 'flex', gap: u * 1.4, alignItems: 'center', fontFamily: SANS, flexWrap: 'wrap'}}>
        {D.fz.signals.map((s, i) => (
          <Chip key={s} size={vertical ? u * 2.6 : u * 2.2} p={p(sc.fzA.start + 0.6 + i * 0.4, 10)}>
            {s}
          </Chip>
        ))}
        <span style={{color: C.text2, fontSize: u * 3, opacity: p(sc.fzA.start + 1.8, 10)}}>→</span>
        {D.fz.states.map((s, i) => (
          <span key={s} style={{display: 'inline-flex', alignItems: 'center', gap: u * 0.6, fontSize: vertical ? u * 2.6 : u * 2.1, color: C.text2, opacity: p(sc.fzA.start + 2, 10)}}>
            <span style={{width: u * 1.6, height: u * 1.6, borderRadius: u * 0.4, background: STATE_COLORS[i]}} />
            {s}
          </span>
        ))}
      </div>
      {(['fast', 'calm'] as const).map((id, i) => (
        <div key={id} style={{position: 'absolute', left: (W - chartW) / 2, top: (vertical ? H * 0.32 : H * 0.38) + i * (chartH + (vertical ? u * 14 : u * 11))}}>
          <div style={{display: 'flex', alignItems: 'baseline', gap: u * 1.6, fontFamily: SANS, marginBottom: u * 1.2}}>
            <span style={{fontWeight: 800, fontSize: vertical ? u * 3.6 : u * 2.8, color: C.white}}>{brand.songs[id].title}</span>
            <span style={{fontSize: vertical ? u * 2.6 : u * 2, color: C.text2}}>{brand.songs[id].tag}</span>
            <span style={{marginLeft: 'auto'}}>
              <Chip size={vertical ? u * 2.5 : u * 2.1} color={id === 'fast' ? C.magenta : C.purpleLight} p={p(cues.fzStats + i * 0.5, 10)}>
                {D.fz.stat[id]}
              </Chip>
            </span>
          </div>
          <EnergyChart song={songs[id]} width={chartW} height={chartH} draw={draw} />
        </div>
      ))}
    </AbsoluteFill>
  );
};

export const DevZones: React.FC = () => {
  const {frame} = useBeat();
  const {W, H} = useLayout();
  const beat = frame / 15;
  const body = beat < sc.mzA.start ? <Pipeline /> : beat < sc.czA.start ? <MusicZoneExplained /> : beat < sc.fzA.start ? <CircleZoneExplained /> : <FirewatchExplained />;
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse 80% 70% at 50% 55%, #120822 0%, #05040A 75%)`}}>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0, opacity: 0.18}}>
        {Array.from({length: 40}, (_, i) => (
          <line key={i} x1={(i * W) / 40} y1={0} x2={(i * W) / 40} y2={H} stroke={C.purpleDeep} strokeWidth={1} />
        ))}
      </svg>
      {body}
      <Parens />
    </AbsoluteFill>
  );
};

export {CALM, ENERGETIC, MIDDLE};
