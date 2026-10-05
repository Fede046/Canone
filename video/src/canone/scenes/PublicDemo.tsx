/**
 * Public video, 20–49 s: how it works.
 *   ① download once (offline, playlists, screen off) → ② tap MZ, CZ or FZ (real PlayerScreen.kt code)
 *   → the three Zones, each with the fast song ("84") and the calm one ("Celestial Citadel")
 *   → ③ it studies each song once (real HarmonyResult.kt code) + all six side by side.
 * Clear and legible: the app's black surfaces, purple accents, one idea per screen.
 */
import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {brand, publicContent} from '../content';
import {AirplaneIcon, Chip, CodeWindow, LockIcon, Phone, PlayingBars, PlaylistIcon, StepCaption, Tap, Words, useBeat} from '../kit';
import {C, EXPO_IN_OUT, EXPO_OUT, MONO, SANS, clamp, useLayout} from '../theme';
import {FPS, beatToFrame, timelines, typedChars, type SongExcerpt} from '../timeline';
import {AppTopBar, BottomBar, DownloadState, LockScreen, MiniPlayer, PlayerScreen, SongRow, StatusIcons} from '../ui';
import {CircleZone, Speller} from '../zones/CircleZone';
import {PALETTES, songs} from '../zones/data';
import {ForestZone} from '../zones/ForestZone';
import {MusicZone} from '../zones/MusicZone';

const tl = timelines.public;
const cues = tl.cues;
const sc = tl.scenes;
const content = publicContent;

/* ── ① Download once: offline, playlists, screen off ─────────────────────── */
const Basics: React.FC = () => {
  const {frame, since, p} = useBeat();
  const {W, H, u, vertical} = useLayout();
  const phoneW = vertical ? u * 47 : u * 36;
  const pu = phoneW / 100;
  const beat = frame / 15;
  const ring = interpolate(since(cues.download), [0, beatToFrame(cues.downloaded - cues.download)], [0, 1], clamp);
  const dl = beat < cues.download ? null : ring;
  const showLibrary = beat >= 43.5;
  const lockT = since(cues.screenOff - 0.5);
  const off = interpolate(lockT, [0, 6], [0, 1], clamp);
  const lock = interpolate(lockT, [8, 18], [0, 1], clamp);
  const airplane = p(cues.offline, 10);
  const plP = p(cues.playlists, 12);
  const libP = interpolate(since(43.5), [0, 10], [0, 1], {...clamp, easing: EXPO_OUT});
  const chips = [
    {label: content.basics.labels.offline, beat: cues.offline, icon: <AirplaneIcon size={u * 3} color={C.purple} />},
    {label: content.basics.labels.playlists, beat: cues.playlists, icon: <PlaylistIcon size={u * 3} color={C.purple} />},
    {label: content.basics.labels.background, beat: cues.screenOff, icon: <LockIcon size={u * 3} color={C.purple} />},
  ];
  const phoneX = vertical ? (W - phoneW) / 2 : W * 0.66 - phoneW / 2;
  const phoneY = vertical ? H * 0.25 : (H - phoneW * 2.08) / 2 + u * 2;
  const enter = p(sc.basics.start, 18);
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse 70% 70% at ${vertical ? '50% 60%' : '66% 50%'}, #1C0F33 0%, ${C.black} 70%)`}}>
      <div style={{position: 'absolute', left: vertical ? W * 0.07 : W * 0.07, top: vertical ? H * 0.07 : H * 0.2, width: vertical ? W * 0.86 : W * 0.44}}>
        <StepCaption step={content.basics.step} text={content.basics.caption} t={since(sc.basics.start + 0.25)} size={vertical ? u * 6.4 : u * 6} />
      </div>
      <div style={{position: 'absolute', left: vertical ? 0 : W * 0.07, right: vertical ? 0 : undefined, top: vertical ? H * 0.83 : H * 0.6, display: 'flex', gap: u * 2, justifyContent: vertical ? 'center' : 'flex-start', flexWrap: 'wrap'}}>
        {chips.map((c) => (
          <Chip key={c.label} size={u * 3.2} p={p(c.beat, 12)}>
            {c.icon}
            {c.label}
          </Chip>
        ))}
      </div>
      <div style={{position: 'absolute', left: phoneX, top: phoneY + (1 - enter) * u * 10, opacity: enter}}>
        <Phone width={phoneW} statusIcons={<StatusIcons u={pu} airplane={lock > 0 ? 0 : airplane} />} screen={C.black}>
          {/* Catalog (Sfoglia) */}
          <div style={{position: 'absolute', inset: 0, opacity: 1 - libP}}>
            <AppTopBar u={pu} />
            <div style={{position: 'absolute', top: pu * 28, left: 0, right: 0}}>
              {content.basics.library.map((t, i) => (
                <SongRow key={t} u={pu} title={t} seed={i + 1} right={<DownloadState u={pu} p={i === 0 ? dl : i === 2 ? 1 : null} />} />
              ))}
            </div>
            <BottomBar u={pu} active={2} />
            <Tap x={pu * 87} y={pu * 36} t={since(cues.download)} size={pu * 12} />
          </div>
          {/* Library with playlists */}
          {showLibrary ? (
            <div style={{position: 'absolute', inset: 0, opacity: libP}}>
              <AppTopBar u={pu} />
              <div style={{position: 'absolute', top: pu * 28, left: pu * 6, right: pu * 6, display: 'flex', gap: pu * 3}}>
                {content.basics.playlists.map((name, i) => (
                  <div key={name} style={{flex: 1, height: pu * 22, borderRadius: pu * 3, background: ['#A855F7', '#E879F9', '#7C3AED'][i], padding: pu * 2.5, fontSize: pu * 3.8, fontWeight: 750, color: '#12081F', display: 'flex', alignItems: 'flex-end', transform: `scale(${0.6 + 0.4 * plP})`, opacity: plP}}>
                    {name}
                  </div>
                ))}
              </div>
              <div style={{position: 'absolute', top: pu * 56, left: 0, right: 0}}>
                {content.basics.library.slice(0, 3).map((t, i) => (
                  <SongRow key={t} u={pu} title={t} seed={i + 1} active={i === 0} right={i === 0 ? <PlayingBars size={pu * 5} color={C.purple} frame={frame} /> : null} />
                ))}
              </div>
              <MiniPlayer u={pu} title={content.basics.nowPlaying.title} frame={frame} progress={0.2 + since(43.5) / 900} />
              <BottomBar u={pu} active={0} />
            </div>
          ) : null}
          {/* Screen off → lock screen with the media notification */}
          {off > 0 ? <div style={{position: 'absolute', inset: 0, background: '#000', opacity: off}} /> : null}
          {lock > 0 ? (
            <div style={{position: 'absolute', inset: 0, opacity: lock}}>
              <LockScreen u={pu} title={content.basics.nowPlaying.title} progress={0.28 + since(cues.screenOff) / 900} frame={frame} />
            </div>
          ) : null}
        </Phone>
      </div>
    </AbsoluteFill>
  );
};

/* ── ② Tap MZ, CZ or FZ ───────────────────────────────────────────────────── */
const TapZones: React.FC = () => {
  const {frame, since, p} = useBeat();
  const {W, H, u, vertical} = useLayout();
  const code = content.tap.code;
  const total = code.lines.reduce((a, l) => a + l.length, 0);
  const typed = typedChars(frame, cues.typing.tap, total);
  const glow = [0, 1, 2].map((i) => interpolate(since(cues.zoneLines[i]), [0, 5, 14], [0, 1, 0.25], clamp)) as [number, number, number];
  const current = cues.zoneLines.reduce((acc, b, i) => (frame >= beatToFrame(b) ? i : acc), -1);
  const highlight = current >= 0 ? [{line: current, p: p(cues.zoneLines[current], 8)}] : [];
  const phoneW = vertical ? u * 40 : u * 35;
  const pu = phoneW / 100;
  const phoneX = vertical ? (W - phoneW) / 2 : W * 0.21 - phoneW / 2;
  const phoneY = vertical ? H * 0.17 : (H - phoneW * 2.08) / 2 + u * 3;
  // Zoom into the phone screen right after the tap on MZ
  const zoom = interpolate(since(cues.fingerTap + 0.15), [0, 8], [0, 1], {...clamp, easing: EXPO_IN_OUT});
  const zoomScale = 1 + zoom * (Math.max(W / phoneW, H / (phoneW * 2.08)) * 1.05 - 1);
  const cx = phoneX + phoneW / 2;
  const cy = phoneY + phoneW * 1.04;
  const enter = p(sc.tap.start, 14);
  const fs = vertical ? u * 2.5 : u * 2.25;
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse 70% 70% at 40% 50%, #1C0F33 0%, ${C.black} 70%)`}}>
      <AbsoluteFill style={{transform: `translate(${(W / 2 - cx) * zoom}px, ${(H / 2 - cy) * zoom}px) scale(${zoomScale})`, transformOrigin: `${cx}px ${cy}px`}}>
        <div style={{position: 'absolute', left: vertical ? W * 0.07 : W * 0.42, top: vertical ? H * 0.06 : H * 0.17, width: vertical ? W * 0.86 : W * 0.52, opacity: 1 - zoom}}>
          <StepCaption step={content.tap.step} text={content.tap.caption} t={since(sc.tap.start + 0.25)} size={vertical ? u * 6.6 : u * 6} />
        </div>
        <div style={{position: 'absolute', left: vertical ? W * 0.04 : W * 0.42, top: vertical ? H * 0.63 : H * 0.36, opacity: enter * (1 - zoom), transform: `translateY(${(1 - enter) * u * 6}px)`}}>
          <CodeWindow kind="editor" title={code.file} lines={code.lines} typed={typed} fontSize={fs} width={vertical ? W * 0.92 : W * 0.53} firstLine={code.firstLine} highlight={highlight} wrap />
        </div>
        <div style={{position: 'absolute', left: phoneX, top: phoneY, opacity: enter}}>
          <Phone width={phoneW} statusIcons={<StatusIcons u={pu} />}>
            <PlayerScreen u={pu} title={content.basics.nowPlaying.title} progress={0.31 + since(sc.tap.start) / 1200} glow={glow} active={frame >= beatToFrame(cues.fingerTap) ? 0 : -1} />
            <Tap x={pu * 48.5} y={pu * 185} t={since(cues.fingerTap)} size={pu * 12} />
          </Phone>
        </div>
      </AbsoluteFill>
      {zoom > 0 ? <AbsoluteFill style={{background: '#05040A', opacity: interpolate(zoom, [0.6, 1], [0, 1], clamp)}} /> : null}
    </AbsoluteFill>
  );
};

/* ── The three Zones: fast song, then calm song ───────────────────────────── */
type ZoneKey = 'mz' | 'cz' | 'fz';
const excerptAt = (beat: number): SongExcerpt | undefined => (tl.songs as readonly SongExcerpt[]).find((e) => beat >= e.from && beat < e.to);

const ZoneCanvas: React.FC<{zone: ZoneKey; ex: SongExcerpt; frame: number; width: number; height: number; intro?: number; cx?: number}> = ({zone, ex, frame, width, height, intro, cx}) => {
  const song = songs[ex.song];
  const t = ex.at + (frame - beatToFrame(ex.from)) / FPS;
  if (zone === 'mz') return <MusicZone song={song} t={t} width={width} height={height} colors={PALETTES[ex.song]} opt={{intro}} cx={cx} />;
  if (zone === 'cz') return <CircleZone song={song} t={t} width={width} height={height} hud={false} cx={cx} />;
  const fast = ex.song === 'fast';
  return <ForestZone song={song} songStart={ex.at} frames={frame - beatToFrame(ex.from)} width={width} height={height} sky={fast ? 'dusk' : 'violet'} sunArc={fast ? 0.88 : 0.68} isSun={fast} seed={fast ? 3 : 8} />;
};

const ZoneShow: React.FC<{zone: ZoneKey}> = ({zone}) => {
  const {frame, since, p} = useBeat();
  const {W, H, u, vertical} = useLayout();
  const beat = frame / 15;
  const ex = excerptAt(beat);
  const win = sc[zone];
  if (!ex) return null;
  const info = brand.zones[zone];
  const songInfo = brand.songs[ex.song];
  const song = songs[ex.song];
  const t = ex.at + (frame - beatToFrame(ex.from)) / FPS;
  const exStart = since(ex.from);
  const firstOfZone = ex.from === win.start;
  const prev = (tl.songs as readonly SongExcerpt[]).find((e) => e.to === ex.from);
  // Cut into the excerpt: a bright slit wipes the new song in
  const wipe = interpolate(exStart, [0, 7], [0, 1], {...clamp, easing: EXPO_OUT});
  const label = p(ex.from + 0.15, 12);
  const title = p(win.start, 14);
  const intro = zone === 'mz' && ex.from === sc.mz.start ? exStart / FPS : undefined;
  const speller = new Speller(song.key);
  const ci = song.chordIndexAt(t);
  const chord = ci >= 0 && song.chords[ci].quality >= 0 ? speller.chordName(song.chords[ci].root, song.chords[ci].quality) : '';
  const extra =
    zone === 'cz'
      ? `${speller.keyName} · ${Math.round(song.bpm)} BPM${chord ? ` · ${chord}` : ''}`
      : zone === 'fz'
        ? ex.song === 'fast'
          ? '19:40'
          : '23:10'
        : null;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {!firstOfZone && wipe < 1 && prev ? (
        <AbsoluteFill>
          <ZoneCanvas zone={zone} ex={prev} frame={frame} width={W} height={H} cx={vertical ? 0.5 : 0.6} />
        </AbsoluteFill>
      ) : null}
      <AbsoluteFill style={{clipPath: firstOfZone ? undefined : `inset(0 ${(1 - wipe) * 100}% 0 0)`}}>
        <ZoneCanvas zone={zone} ex={ex} frame={frame} width={W} height={H} intro={intro} cx={vertical ? 0.5 : 0.6} />
      </AbsoluteFill>
      {!firstOfZone && wipe < 1 ? <div style={{position: 'absolute', top: 0, bottom: 0, left: wipe * W - 2, width: 4, background: C.white, boxShadow: `0 0 ${u * 3}px ${C.magenta}`}} /> : null}
      {/* Scrim for legibility */}
      <AbsoluteFill style={{background: vertical ? 'linear-gradient(180deg, rgba(0,0,0,0.65) 0%, transparent 22%, transparent 78%, rgba(0,0,0,0.6) 100%)' : 'linear-gradient(90deg, rgba(0,0,0,0.6) 0%, transparent 38%), linear-gradient(0deg, rgba(0,0,0,0.5) 0%, transparent 25%)'}} />
      {/* Zone title + caption */}
      <div style={{position: 'absolute', left: vertical ? W * 0.07 : W * 0.05, top: vertical ? H * 0.06 : H * 0.08, width: vertical ? W * 0.86 : W * 0.36}}>
        <div style={{display: 'flex', alignItems: 'center', gap: u * 2, opacity: title, transform: `translateY(${(1 - title) * u * 4}px)`}}>
          <div style={{fontFamily: SANS, fontWeight: 900, fontSize: u * 6, padding: `${u * 0.6}px ${u * 2}px`, borderRadius: u * 1.6, background: C.purple, color: C.black, letterSpacing: '0.02em', boxShadow: `0 0 ${u * 5}px ${C.purple}aa`}}>{info.short}</div>
          <div style={{fontFamily: SANS, fontWeight: 750, fontSize: u * 4.4, color: C.white}}>{info.name}</div>
        </div>
        <div style={{marginTop: u * 2.4}}>
          <Words text={content.zones[zone].caption} t={since(win.start + 0.4)} stagger={2} color={C.white} style={{fontFamily: SANS, fontWeight: 700, fontSize: vertical ? u * 6 : u * 4.8, letterSpacing: '-0.02em', lineHeight: 1.15, textShadow: '0 2px 20px rgba(0,0,0,0.6)'}} />
        </div>
      </div>
      {/* Song tag */}
      <div style={{position: 'absolute', left: vertical ? W * 0.07 : W * 0.05, bottom: vertical ? H * 0.06 : H * 0.08, display: 'flex', flexDirection: 'column', gap: u * 1.4, opacity: label, transform: `translateY(${(1 - label) * u * 3}px)`}}>
        <div style={{display: 'flex', alignItems: 'center', gap: u * 1.8, fontFamily: SANS}}>
          <PlayingBars size={u * 4} color={ex.song === 'fast' ? C.magenta : C.purpleLight} frame={ex.song === 'fast' ? frame * 1.6 : frame * 0.6} />
          <span style={{fontWeight: 850, fontSize: u * 5.2, color: C.white}}>{songInfo.tag}</span>
          <span style={{fontWeight: 500, fontSize: u * 3.6, color: C.text2}}>· {songInfo.title}</span>
        </div>
        {extra ? <div style={{fontFamily: zone === 'cz' ? MONO : SANS, fontSize: u * 2.9, color: C.purpleLight, fontWeight: 600}}>{zone === 'fz' ? `◷ ${extra}` : extra}</div> : null}
      </div>
    </AbsoluteFill>
  );
};

/* ── ③ It studies each song once + the six Zones side by side ─────────────── */
const Grid: React.FC = () => {
  const {frame, since, p} = useBeat();
  const {W, H, u, vertical} = useLayout();
  const code = content.grid.code;
  const total = code.lines.reduce((a, l) => a + l.length, 0);
  const typed = typedChars(frame, cues.typing.grid, total);
  const codeOut = interpolate(since(103.6), [0, 10], [1, 0], {...clamp, easing: EXPO_IN_OUT});
  const gridDim = interpolate(since(103.6), [0, 12], [0.28, 1], clamp);
  const enter = p(sc.grid.start, 16);
  // Cells: columns = zones, rows = songs (vertical: columns = songs, rows = zones)
  const zones: ZoneKey[] = ['mz', 'cz', 'fz'];
  const rows: ('fast' | 'calm')[] = ['fast', 'calm'];
  const gap = u * 1.4;
  const gridW = vertical ? W * 0.9 : W * 0.86;
  const cols = vertical ? 2 : 3;
  const nRows = vertical ? 3 : 2;
  const cellW = (gridW - gap * (cols - 1)) / cols;
  const cellH = vertical ? cellW * 1.15 : cellW * 0.5625;
  const gridH = cellH * nRows + gap * (nRows - 1);
  const gridX = (W - gridW) / 2;
  const gridY = vertical ? H * 0.2 : H * 0.24;
  const startAt = {fast: tl.songs[4].at + 3, calm: tl.songs[5].at + 4};
  const local = (frame - beatToFrame(sc.grid.start)) / FPS;
  const badges = [
    `${brand.songs.fast.title}: ${new Speller(songs.fast.key).keyName} · ${brand.songs.calm.title}: ${new Speller(songs.calm.key).keyName}`,
    `${new Speller(songs.fast.key).chordName(songs.fast.chords[songs.fast.chordIndexAt(startAt.fast)].root, songs.fast.chords[songs.fast.chordIndexAt(startAt.fast)].quality)}, ${new Speller(songs.calm.key).chordName(songs.calm.chords[songs.calm.chordIndexAt(startAt.calm)].root, songs.calm.chords[songs.calm.chordIndexAt(startAt.calm)].quality)} …`,
    `${Math.round(songs.fast.bpm)} BPM · ${Math.round(songs.calm.bpm)} BPM`,
  ];
  return (
    <AbsoluteFill style={{background: C.black}}>
      <div style={{position: 'absolute', left: W * 0.07, top: vertical ? H * 0.06 : H * 0.07, width: W * 0.86}}>
        <StepCaption step={content.grid.step} text={content.grid.caption} t={since(sc.grid.start + 0.25)} size={vertical ? u * 6.2 : u * 5.4} />
      </div>
      <div style={{position: 'absolute', left: gridX, top: gridY, width: gridW, height: gridH, opacity: enter * gridDim}}>
        {rows.map((song, r) =>
          zones.map((zone, z) => {
            const col = vertical ? r : z;
            const row = vertical ? z : r;
            const x = col * (cellW + gap);
            const y = row * (cellH + gap);
            const ex: SongExcerpt = {song, from: sc.grid.start, to: sc.grid.end, at: startAt[song]};
            const cw = Math.round(cellW);
            const ch = Math.round(cellH);
            return (
              <div key={`${song}${zone}`} style={{position: 'absolute', left: x, top: y, width: cw, height: ch, borderRadius: u * 1.4, overflow: 'hidden', boxShadow: '0 0 0 1px rgba(196,165,255,0.15)'}}>
                {zone === 'fz' ? (
                  <ForestZone song={songs[song]} songStart={ex.at} frames={frame - beatToFrame(sc.grid.start) + 60} width={cw} height={ch} sky={song === 'fast' ? 'dusk' : 'violet'} sunArc={song === 'fast' ? 0.88 : 0.42} isSun={song === 'fast'} seed={song === 'fast' ? 3 : 8} />
                ) : zone === 'mz' ? (
                  <MusicZone song={songs[song]} t={ex.at + local} width={cw} height={ch} colors={PALETTES[song]} />
                ) : (
                  <CircleZone song={songs[song]} t={ex.at + local} width={cw} height={ch} hud={false} opt={{labels: false}} />
                )}
                <div style={{position: 'absolute', left: u * 1.2, top: u * 1, display: 'flex', gap: u * 0.8, alignItems: 'center', fontFamily: SANS}}>
                  <span style={{fontWeight: 900, fontSize: u * 2.4, padding: `${u * 0.2}px ${u * 0.8}px`, borderRadius: u * 0.6, background: C.purple, color: C.black}}>{brand.zones[zone].short}</span>
                  <span style={{fontWeight: 700, fontSize: u * 2.4, color: C.white, textShadow: '0 1px 6px #000'}}>{brand.songs[song].tag}</span>
                </div>
              </div>
            );
          }),
        )}
      </div>
      {codeOut > 0 ? (
        <div style={{position: 'absolute', left: vertical ? W * 0.04 : W * 0.17, top: vertical ? H * 0.38 : H * 0.36, opacity: codeOut * enter, transform: `scale(${0.96 + 0.04 * codeOut})`}}>
          <CodeWindow kind="editor" title={code.file} lines={code.lines} typed={typed} fontSize={vertical ? u * 2.3 : u * 2.1} width={vertical ? W * 0.92 : W * 0.66} firstLine={code.firstLine} />
          <div style={{display: 'flex', flexDirection: 'column', gap: u * 1.1, marginTop: u * 2, alignItems: 'flex-start'}}>
            {badges.map((b, i) => (
              <Chip key={i} size={vertical ? u * 2.6 : u * 2.3} p={p(cues.gridBadges[i], 10)}>
                <span style={{fontFamily: MONO, color: C.purpleLight}}>{['key', 'chords', 'tempo'][i]}</span>
                {b}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const PublicDemo: React.FC = () => {
  const {frame} = useBeat();
  const beat = frame / 15;
  if (beat < sc.tap.start) return <Basics />;
  if (beat < sc.mz.start) return <TapZones />;
  if (beat < sc.cz.start) return <ZoneShow zone="mz" />;
  if (beat < sc.fz.start) return <ZoneShow zone="cz" />;
  if (beat < sc.grid.start) return <ZoneShow zone="fz" />;
  return <Grid />;
};

