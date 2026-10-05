/**
 * Mock-ups of the app and of the admin panel, in the app's black and purple.
 * Labels are the real (Italian) ones, data are placeholders: no real users, keys or projects.
 */
import React from 'react';
import {interpolate} from 'remotion';
import {
  AirplaneIcon,
  CheckIcon,
  CloudIcon,
  Cover,
  DownloadIcon,
  LibraryIcon,
  Logo,
  PauseIcon,
  PlayIcon,
  PlayingBars,
  PlaylistIcon,
  RepeatIcon,
  ShuffleIcon,
  SkipIcon,
  TimerIcon,
} from './kit';
import {C, MONO, SANS, clamp} from './theme';

/* ── App ─────────────────────────────────────────────────────────────────── */
export const AppTopBar: React.FC<{u: number; title?: string}> = ({u, title = 'Canone'}) => (
  <div style={{position: 'absolute', top: u * 12, left: 0, right: 0, height: u * 14, display: 'flex', alignItems: 'center', padding: `0 ${u * 6}px`, gap: u * 3}}>
    <div style={{fontSize: u * 7, fontWeight: 800, letterSpacing: '-0.02em', flex: 1}}>{title}</div>
    {[0, 1, 2].map((i) => (
      <div key={i} style={{width: u * 5.5, height: u * 5.5, borderRadius: '50%', border: `${u * 0.6}px solid ${C.text2}`, opacity: 0.8}} />
    ))}
  </div>
);

export const BottomBar: React.FC<{u: number; active: 0 | 1 | 2}> = ({u, active}) => {
  const items = [
    {label: 'Libreria', Icon: LibraryIcon},
    {label: 'Playlist', Icon: PlaylistIcon},
    {label: 'Sfoglia', Icon: CloudIcon},
  ];
  return (
    <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: u * 19, background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'space-around', paddingBottom: u * 3}}>
      {items.map(({label, Icon}, i) => (
        <div key={label} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u * 1, color: i === active ? C.purple : C.text2, fontSize: u * 3.4, fontWeight: 600}}>
          <Icon size={u * 6.5} color={i === active ? C.purple : C.text2} />
          {label}
        </div>
      ))}
    </div>
  );
};

export const SongRow: React.FC<{u: number; title: string; artist?: string; seed: number; right?: React.ReactNode; active?: boolean; style?: React.CSSProperties}> = ({
  u,
  title,
  artist = 'Demo Artist',
  seed,
  right,
  active,
  style,
}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: u * 4, padding: `${u * 2.6}px ${u * 6}px`, ...style}}>
    <Cover seed={seed} size={u * 13} radius={0.14} />
    <div style={{flex: 1, minWidth: 0}}>
      <div style={{fontSize: u * 4.6, fontWeight: 650, color: active ? C.purple : C.white, whiteSpace: 'nowrap'}}>{title}</div>
      <div style={{fontSize: u * 3.6, color: C.text2, marginTop: u * 0.6}}>{artist}</div>
    </div>
    {right}
  </div>
);

/** Download state: 0 = icon, 0..1 = ring, 1 = check (like DownloadStatusIcon). */
export const DownloadState: React.FC<{u: number; p: number | null}> = ({u, p}) => {
  const s = u * 7.5;
  if (p === null) return <DownloadIcon size={s} color={C.text2} />;
  if (p >= 1) {
    return (
      <div style={{width: s, height: s, borderRadius: '50%', background: C.purple, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <CheckIcon size={s * 0.7} color={C.black} strokeWidth={3} />
      </div>
    );
  }
  return (
    <svg width={s} height={s} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9.5" fill="none" stroke={C.surface3} strokeWidth="2.6" />
      <circle cx="12" cy="12" r="9.5" fill="none" stroke={C.purple} strokeWidth="2.6" strokeDasharray={`${59.7 * p} 60`} transform="rotate(-90 12 12)" strokeLinecap="round" />
    </svg>
  );
};

export const ZoneButtonsRow: React.FC<{u: number; glow?: [number, number, number]; active?: number}> = ({u, glow = [0, 0, 0], active = -1}) => (
  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${u * 5}px`}}>
    <ShuffleIcon size={u * 6} color={C.purple} />
    <RepeatIcon size={u * 6} color={C.text2} />
    <TimerIcon size={u * 6} color={C.text2} />
    {['MZ', 'CZ', 'FZ'].map((z, i) => (
      <div
        key={z}
        style={{
          fontSize: u * 4.4,
          fontWeight: 800,
          letterSpacing: '0.04em',
          padding: `${u * 1}px ${u * 2}px`,
          borderRadius: u * 2,
          color: active === i || glow[i] > 0.5 ? C.white : C.text2,
          background: `rgba(168,85,247,${0.85 * Math.max(glow[i], active === i ? 1 : 0)})`,
          boxShadow: glow[i] > 0 ? `0 0 ${u * 6 * glow[i]}px ${C.purple}` : undefined,
          transform: `scale(${1 + 0.15 * glow[i]})`,
        }}
      >
        {z}
      </div>
    ))}
  </div>
);

export const PlayerScreen: React.FC<{u: number; title: string; artist?: string; progress: number; playing?: boolean; glow?: [number, number, number]; active?: number}> = ({
  u,
  title,
  artist = 'Demo Artist',
  progress,
  playing = true,
  glow,
  active,
}) => (
  <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${C.purpleDeep} 0%, ${C.black} 62%)`}}>
    <div style={{position: 'absolute', top: u * 22, left: u * 9, right: u * 9}}>
      <Cover seed={1} size={u * 82} radius={0.05} style={{boxShadow: '0 30px 60px rgba(0,0,0,0.5)'}} />
      <div style={{marginTop: u * 9, fontSize: u * 6.4, fontWeight: 800}}>{title}</div>
      <div style={{fontSize: u * 4.2, color: C.text2, marginTop: u * 1}}>{artist}</div>
      <div style={{marginTop: u * 6, height: u * 1.1, borderRadius: u, background: C.surface3}}>
        <div style={{width: `${progress * 100}%`, height: '100%', borderRadius: u, background: C.white, position: 'relative'}}>
          <div style={{position: 'absolute', right: -u * 1.6, top: -u * 1.1, width: u * 3.3, height: u * 3.3, borderRadius: '50%', background: C.white}} />
        </div>
      </div>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: u * 12, marginTop: u * 7}}>
        <SkipIcon size={u * 9} color={C.white} back />
        <div style={{width: u * 17, height: u * 17, borderRadius: '50%', background: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          {playing ? <PauseIcon size={u * 8} color={C.black} /> : <PlayIcon size={u * 8} color={C.black} />}
        </div>
        <SkipIcon size={u * 9} color={C.white} />
      </div>
    </div>
    <div style={{position: 'absolute', left: u * 4, right: u * 4, bottom: u * 13}}>
      <ZoneButtonsRow u={u} glow={glow} active={active} />
    </div>
  </div>
);

export const MiniPlayer: React.FC<{u: number; title: string; frame: number; progress: number}> = ({u, title, frame, progress}) => (
  <div style={{position: 'absolute', left: u * 3, right: u * 3, bottom: u * 21, height: u * 15, borderRadius: u * 3, background: C.surface3, display: 'flex', alignItems: 'center', gap: u * 3, padding: `0 ${u * 3}px`, overflow: 'hidden'}}>
    <Cover seed={1} size={u * 10} radius={0.12} />
    <div style={{flex: 1, fontSize: u * 4.2, fontWeight: 650}}>{title}</div>
    <PlayingBars size={u * 5} color={C.purple} frame={frame} />
    <PauseIcon size={u * 7} color={C.white} />
    <div style={{position: 'absolute', left: 0, bottom: 0, height: u * 0.6, width: `${progress * 100}%`, background: C.purple}} />
  </div>
);

export const LockScreen: React.FC<{u: number; title: string; progress: number; frame: number}> = ({u, title, progress, frame}) => (
  <div style={{position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 30%, #1A0F2E 0%, #050408 70%)`}}>
    <div style={{position: 'absolute', top: u * 26, width: '100%', textAlign: 'center', fontSize: u * 20, fontWeight: 300, letterSpacing: '-0.03em'}}>9:41</div>
    <div style={{position: 'absolute', top: u * 66, left: u * 5, right: u * 5, borderRadius: u * 5, background: 'rgba(42,37,54,0.85)', padding: u * 4.5, display: 'flex', flexDirection: 'column', gap: u * 3.5}}>
      <div style={{display: 'flex', alignItems: 'center', gap: u * 3.5}}>
        <Cover seed={1} size={u * 13} radius={0.14} />
        <div style={{flex: 1}}>
          <div style={{fontSize: u * 4.4, fontWeight: 700}}>{title}</div>
          <div style={{fontSize: u * 3.4, color: C.text2}}>Canone</div>
        </div>
        <PlayingBars size={u * 5} color={C.purple} frame={frame} />
      </div>
      <div style={{height: u * 0.9, borderRadius: u, background: C.outline}}>
        <div style={{width: `${progress * 100}%`, height: '100%', borderRadius: u, background: C.white}} />
      </div>
      <div style={{display: 'flex', justifyContent: 'center', gap: u * 12, alignItems: 'center'}}>
        <SkipIcon size={u * 7} color={C.white} back />
        <PauseIcon size={u * 8} color={C.white} />
        <SkipIcon size={u * 7} color={C.white} />
      </div>
    </div>
  </div>
);

export const HomeScreen: React.FC<{u: number; appP: number}> = ({u, appP}) => (
  <div style={{position: 'absolute', inset: 0, background: `radial-gradient(circle at 30% 20%, #2A1A4A 0%, #0B0A10 70%)`}}>
    <div style={{position: 'absolute', top: u * 22, left: u * 8, right: u * 8, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', rowGap: u * 9, columnGap: u * 6}}>
      {Array.from({length: 12}, (_, i) => {
        const isApp = i === 5;
        const s = isApp ? interpolate(appP, [0, 1], [0, 1], clamp) : 1;
        return (
          <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u * 1.6}}>
            {isApp ? (
              <div style={{transform: `scale(${s})`, filter: `drop-shadow(0 0 ${u * 4 * s}px ${C.purple})`}}>
                <Logo size={u * 15} />
              </div>
            ) : (
              <div style={{width: u * 15, height: u * 15, borderRadius: u * 4, background: 'rgba(255,255,255,0.07)'}} />
            )}
            <div style={{fontSize: u * 3, color: isApp ? C.white : 'transparent', opacity: s, fontWeight: 600}}>{isApp ? 'Canone' : '.'}</div>
          </div>
        );
      })}
    </div>
  </div>
);

export const StatusIcons: React.FC<{u: number; airplane?: number}> = ({u, airplane = 0}) => (
  <>
    {airplane > 0 ? (
      <span style={{opacity: airplane, transform: `scale(${0.6 + 0.4 * airplane})`, display: 'flex'}}>
        <AirplaneIcon size={u * 5.2} color={C.purple} />
      </span>
    ) : null}
    <svg width={u * 5.5} height={u * 5.5} viewBox="0 0 24 24">
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={2 + i * 5.5} y={18 - i * 5} width={4} height={4 + i * 5} rx={1} fill={C.white} opacity={airplane > 0.5 ? 0.25 : 1} />
      ))}
    </svg>
    <div style={{width: u * 7, height: u * 3.4, borderRadius: u, border: `${u * 0.4}px solid ${C.white}`, padding: u * 0.4}}>
      <div style={{width: '70%', height: '100%', background: C.white, borderRadius: u * 0.4}} />
    </div>
  </>
);

/* ── Browser + admin panel ───────────────────────────────────────────────── */
export const Browser: React.FC<{width: number; height: number; url: string; s: number; children: React.ReactNode; style?: React.CSSProperties}> = ({width, height, url, s, children, style}) => (
  <div style={{width, height, borderRadius: s * 0.9, overflow: 'hidden', background: '#0F0D15', boxShadow: `0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(196,165,255,0.14), 0 0 80px ${C.purple}1c`, fontFamily: SANS, color: C.white, ...style}}>
    <div style={{height: s * 2.6, display: 'flex', alignItems: 'center', gap: s * 0.5, padding: `0 ${s}px`, background: '#1A1722'}}>
      {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
        <div key={c} style={{width: s * 0.6, height: s * 0.6, borderRadius: '50%', background: c, opacity: 0.9}} />
      ))}
      <div style={{marginLeft: s, flex: 1, height: s * 1.6, borderRadius: s * 0.8, background: '#0F0D15', display: 'flex', alignItems: 'center', padding: `0 ${s * 0.8}px`, fontFamily: MONO, fontSize: s * 0.82, color: C.text2}}>
        <span style={{color: C.purpleLight}}>http://</span>
        {url}
      </div>
    </div>
    <div style={{position: 'relative', height: height - s * 2.6}}>{children}</div>
  </div>
);

export const PanelShell: React.FC<{s: number; title: string; tabs: readonly string[]; active: number; children?: React.ReactNode}> = ({s, title, tabs, active, children}) => (
  <div style={{position: 'absolute', inset: 0, background: '#0F0D15'}}>
    <div style={{display: 'flex', alignItems: 'center', gap: s * 2, padding: `${s * 1.2}px ${s * 1.6}px`, borderBottom: `1px solid ${C.surface3}`}}>
      <div style={{fontSize: s * 1.25, fontWeight: 750, flex: 1}}>{title}</div>
      {tabs.map((t, i) => (
        <div key={t} style={{fontSize: s * 0.95, fontWeight: 650, padding: `${s * 0.4}px ${s * 0.9}px`, borderRadius: s * 0.6, color: i === active ? C.white : C.text2, background: i === active ? `${C.purple}44` : 'transparent', border: `1px solid ${i === active ? C.purple : 'transparent'}`}}>
          {t}
        </div>
      ))}
    </div>
    <div style={{position: 'absolute', top: s * 4, left: s * 1.6, right: s * 1.6, bottom: s * 1.2}}>{children}</div>
  </div>
);

export const Card: React.FC<{s: number; title?: string; children: React.ReactNode; style?: React.CSSProperties}> = ({s, title, children, style}) => (
  <div style={{background: C.surface, borderRadius: s * 0.8, padding: s * 1.2, border: `1px solid ${C.surface3}`, ...style}}>
    {title ? <div style={{fontSize: s * 1.05, fontWeight: 700, marginBottom: s * 0.9}}>{title}</div> : null}
    {children}
  </div>
);

export const Field: React.FC<{s: number; label: string; value: string; typed: number; focus?: boolean}> = ({s, label, value, typed, focus}) => (
  <div style={{marginBottom: s * 0.8}}>
    <div style={{fontSize: s * 0.75, color: C.text2, marginBottom: s * 0.3}}>{label}</div>
    <div style={{height: s * 2, borderRadius: s * 0.5, background: '#0B0A10', border: `1px solid ${focus ? C.purple : C.surface3}`, display: 'flex', alignItems: 'center', padding: `0 ${s * 0.7}px`, fontSize: s * 0.9}}>
      {value.slice(0, Math.round(value.length * typed))}
      {focus ? <span style={{width: 2, height: s * 1.1, background: C.purple, marginLeft: 2}} /> : null}
    </div>
  </div>
);

export const Button: React.FC<{s: number; label: string; press?: number; danger?: boolean; style?: React.CSSProperties}> = ({s, label, press = 0, style}) => (
  <div
    style={{
      height: s * 2.2,
      borderRadius: s * 0.6,
      background: C.purple,
      color: C.black,
      fontWeight: 750,
      fontSize: s * 0.95,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: `scale(${1 - 0.06 * Math.sin(Math.PI * Math.min(1, Math.max(0, press)))})`,
      boxShadow: `0 0 ${s * 1.5 * press}px ${C.purple}`,
      ...style,
    }}
  >
    {label}
  </div>
);
