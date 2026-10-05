/**
 * Developer video, 20–52 s: SETUP. Real commands and real lines from the repository;
 * every mock-up uses placeholder data (no real users, keys, projects or paths).
 *   ① clone + Firebase config file  ② build and install  ③ start the admin panel
 *   ④ Firebase key in Settings      ⑤ create a user      ⑥ upload an MP3, loudness evened out
 *   ⑦ on the phone: log in, download, play offline
 */
import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {devContent} from '../content';
import {Chip, CodeWindow, FileIcon, FolderIcon, Phone, StepCaption, Tap, useBeat} from '../kit';
import {C, EXPO_IN_OUT, EXPO_OUT, MONO, SANS, clamp, useLayout} from '../theme';
import {beatToFrame, timelines, typedChars} from '../timeline';
import {AppTopBar, BottomBar, Browser, Button, Card, DownloadState, Field, HomeScreen, MiniPlayer, PanelShell, SongRow, StatusIcons} from '../ui';

const tl = timelines.dev;
const cues = tl.cues;
const sc = tl.scenes;
const S = devContent.setup;
const STEPS = ['clone', 'install', 'panel', 'key', 'users', 'upload', 'phone'] as const;
type Step = (typeof STEPS)[number];

const Frame: React.FC<{step: Step; children: React.ReactNode}> = ({step, children}) => {
  const {since} = useBeat();
  const {W, H, u, vertical} = useLayout();
  const idx = STEPS.indexOf(step);
  const info = S[step];
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse 80% 70% at 60% 60%, #170B2B 0%, ${C.black} 70%)`}}>
      <div style={{position: 'absolute', left: W * 0.06, top: vertical ? H * 0.035 : H * 0.06, display: 'flex', alignItems: 'center', gap: u * 2}}>
        <span style={{fontFamily: MONO, fontSize: u * 2.4, letterSpacing: '0.3em', color: C.purpleLight, fontWeight: 700}}>{devContent.setupLabel}</span>
        <div style={{display: 'flex', gap: u * 0.8}}>
          {STEPS.map((s, i) => (
            <div key={s} style={{width: i === idx ? u * 3.2 : u * 1.1, height: u * 1.1, borderRadius: u, background: i <= idx ? C.purple : C.surface3}} />
          ))}
        </div>
      </div>
      <div style={{position: 'absolute', left: W * 0.06, top: vertical ? H * 0.07 : H * 0.12, width: W * (vertical ? 0.88 : 0.86)}}>
        <StepCaption step={info.step} text={info.caption} t={since(sc[step].start + 0.25)} size={vertical ? u * 5.8 : u * 5.2} />
      </div>
      {children}
    </AbsoluteFill>
  );
};

const enterStyle = (p: number, u: number): React.CSSProperties => ({opacity: p, transform: `translateY(${(1 - p) * u * 5}px)`});

/* ① */
const Clone: React.FC = () => {
  const {frame, since, p} = useBeat();
  const {W, H, u, vertical} = useLayout();
  const c = S.clone;
  const typed = typedChars(frame, cues.typing.clone, c.command.length);
  const tree = p(cues.cloneDone + 0.5, 14);
  const drop = interpolate(since(cues.configDrop), [0, 16], [0, 1], {...clamp, easing: EXPO_OUT});
  const rows: {label: string; depth: number; file?: boolean; hot?: boolean}[] = [
    {label: c.tree[0], depth: 0},
    {label: c.tree[1], depth: 1},
    {label: c.tree[2], depth: 2, file: true, hot: true},
    {label: c.tree[3], depth: 1},
    {label: c.tree[4], depth: 1},
  ];
  return (
    <Frame step="clone">
      <div style={{position: 'absolute', left: W * 0.06, top: vertical ? H * 0.2 : H * 0.33, ...enterStyle(p(sc.clone.start, 14), u)}}>
        <CodeWindow
          kind="terminal"
          title="Terminal"
          lines={[c.command]}
          prompt={c.prompt}
          typed={typed}
          fontSize={vertical ? u * 2.3 : u * 2.6}
          width={vertical ? W * 0.88 : W * 0.5}
          wrap
          output={c.output.map((text, i) => ({text, p: p(cues.cloneDone + i * 0.5, 8)}))}
        />
      </div>
      <div style={{position: 'absolute', left: vertical ? W * 0.06 : W * 0.6, top: vertical ? H * 0.42 : H * 0.33, width: vertical ? W * 0.88 : W * 0.34, ...enterStyle(tree, u)}}>
        <div style={{background: C.surface, borderRadius: u * 1.6, padding: u * 2.8, border: `1px solid ${C.surface3}`, fontFamily: MONO, fontSize: vertical ? u * 3.4 : u * 2.9, color: C.text2}}>
          {rows.map((r, i) => {
            const hot = r.hot ? drop : 1;
            if (r.hot && drop <= 0) return null;
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: u * 1.2,
                  padding: `${u * 0.7}px ${u * 1}px`,
                  marginLeft: r.depth * u * 3.4,
                  borderRadius: u * 0.8,
                  color: r.hot ? C.white : C.text2,
                  background: r.hot ? `${C.purple}33` : 'transparent',
                  border: r.hot ? `1px solid ${C.purple}` : '1px solid transparent',
                  opacity: hot,
                  transform: r.hot ? `translateX(${(1 - drop) * u * 20}px)` : undefined,
                }}
              >
                {r.file ? <FileIcon size={u * 3} color={C.purple} /> : <FolderIcon size={u * 3} color={C.text2} />}
                {r.label}
              </div>
            );
          })}
          <div style={{marginTop: u * 1.6, opacity: drop}}>
            <Chip size={vertical ? u * 3 : u * 2.6}>{c.configNote}</Chip>
          </div>
        </div>
      </div>
    </Frame>
  );
};

/* ② */
const Install: React.FC = () => {
  const {frame, since, p} = useBeat();
  const {W, H, u, vertical} = useLayout();
  const c = S.install;
  const typed = typedChars(frame, cues.typing.install, c.command.length);
  const phoneW = vertical ? u * 36 : u * 32;
  return (
    <Frame step="install">
      <div style={{position: 'absolute', left: W * 0.06, top: vertical ? H * 0.2 : H * 0.36, ...enterStyle(p(sc.install.start, 14), u)}}>
        <CodeWindow
          kind="terminal"
          title="Terminal"
          lines={[c.command]}
          prompt={c.prompt}
          typed={typed}
          fontSize={vertical ? u * 3 : u * 3}
          width={vertical ? W * 0.88 : W * 0.52}
          output={[
            {text: c.output[0], p: p(52.5, 8)},
            {text: c.output[1], p: p(53.2, 8)},
            {text: c.output[2], p: p(cues.installDone, 8), color: C.purpleLight},
          ]}
        />
      </div>
      <div style={{position: 'absolute', left: vertical ? (W - phoneW) / 2 : W * 0.68, top: vertical ? H * 0.42 : (H - phoneW * 2.08) / 2 + u * 7, ...enterStyle(p(52, 16), u)}}>
        <Phone width={phoneW} statusIcons={<StatusIcons u={phoneW / 100} />}>
          <HomeScreen u={phoneW / 100} appP={interpolate(since(cues.appIcon), [0, 12], [0, 1], {...clamp, easing: EXPO_OUT})} />
        </Phone>
      </div>
    </Frame>
  );
};

/* ③ */
const PanelStart: React.FC = () => {
  const {frame, since, p} = useBeat();
  const {W, H, u, vertical} = useLayout();
  const c = S.panel;
  const total = c.commands.reduce((a, l) => a + l.length, 0);
  const typed = typedChars(frame, cues.typing.panel, total);
  const browser = interpolate(since(cues.browser), [0, 18], [0, 1], {...clamp, easing: EXPO_OUT});
  const bw = vertical ? W * 0.88 : W * 0.42;
  const bh = vertical ? H * 0.3 : H * 0.5;
  return (
    <Frame step="panel">
      <div style={{position: 'absolute', left: W * 0.06, top: vertical ? H * 0.2 : H * 0.33, ...enterStyle(p(sc.panel.start, 14), u)}}>
        <CodeWindow
          kind="terminal"
          title="Terminal"
          lines={c.commands}
          prompt={c.prompt}
          typed={typed}
          fontSize={vertical ? u * 2.8 : u * 2.6}
          width={vertical ? W * 0.88 : W * 0.46}
          output={[{text: c.output, p: p(cues.panelReady, 8), color: C.purpleLight}]}
        />
        <div style={{marginTop: u * 2}}>
          <Chip size={vertical ? u * 3 : u * 2.6} p={p(cues.typing.panel.end, 10)}>
            {c.needs}
          </Chip>
        </div>
      </div>
      {browser > 0 ? (
        <div style={{position: 'absolute', left: vertical ? W * 0.06 : W * 0.53, top: vertical ? H * 0.58 : H * 0.33, opacity: browser, transform: `translateX(${(1 - browser) * u * 10}px)`}}>
          <Browser width={bw} height={bh} url={c.url} s={vertical ? u * 2.4 : u * 2.2}>
            <PanelShell s={vertical ? u * 2.4 : u * 2.2} title={S.panelUi.title} tabs={S.panelUi.tabs} active={0} />
          </Browser>
        </div>
      ) : null}
    </Frame>
  );
};

/** The admin panel, big, for steps ④ ⑤ ⑥. */
const PanelBrowser: React.FC<{tab: number; children: React.ReactNode; enter: number; narrow?: boolean}> = ({tab, children, enter, narrow}) => {
  const {W, H, u, vertical} = useLayout();
  const bw = vertical ? W * 0.9 : narrow ? W * 0.55 : W * 0.6;
  const bh = vertical ? H * 0.5 : H * 0.64;
  const s = vertical ? u * 2.8 : u * 2.5;
  return (
    <div style={{position: 'absolute', left: vertical ? W * 0.05 : W * 0.06, top: vertical ? H * 0.2 : H * 0.29, ...enterStyle(enter, u)}}>
      <Browser width={bw} height={bh} url={S.panel.url} s={s}>
        <PanelShell s={s} title={S.panelUi.title} tabs={S.panelUi.tabs} active={tab}>
          {children}
        </PanelShell>
      </Browser>
    </div>
  );
};

/* ④ */
const KeyStep: React.FC = () => {
  const {since, p} = useBeat();
  const {W, H, u, vertical} = useLayout();
  const c = S.key;
  const s = vertical ? u * 2.8 : u * 2.5;
  const drag = interpolate(since(cues.keyDrag), [0, 18], [0, 1], {...clamp, easing: EXPO_IN_OUT});
  const press = interpolate(since(cues.keyConnected - 1), [0, 8], [0, 1], clamp);
  const ok = p(cues.keyConnected, 10);
  return (
    <Frame step="key">
      <PanelBrowser tab={2} enter={p(sc.key.start, 14)}>
        <Card s={s} title={c.section}>
          <div style={{display: 'flex', alignItems: 'center', gap: s, fontSize: s * 0.9, marginBottom: s}}>
            <span style={{color: C.text2}}>Stato</span>
            <span style={{padding: `${s * 0.2}px ${s * 0.7}px`, borderRadius: s, fontWeight: 700, background: ok > 0.5 ? C.purple : C.surface3, color: ok > 0.5 ? C.black : C.text2}}>{ok > 0.5 ? c.status : 'Non connesso'}</span>
            {ok > 0 ? <span style={{color: C.text2, opacity: ok}}>Progetto Firebase: <b style={{color: C.white}}>{c.project}</b></span> : null}
          </div>
          <div style={{height: s * 4, borderRadius: s * 0.6, border: `${Math.max(1, s * 0.08)}px dashed ${drag > 0.9 ? C.purple : C.outline}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', fontSize: s * 0.85, color: C.text2}}>
            {drag < 0.9 ? 'File JSON delle credenziali' : null}
            <div style={{position: 'absolute', left: '50%', top: '50%', transform: `translate(${-50 + (1 - drag) * 160}%, ${-50 + (1 - drag) * 120}%) rotate(${(1 - drag) * 8}deg)`, opacity: interpolate(since(cues.keyDrag), [-4, 2], [0, 1], clamp), display: 'flex', alignItems: 'center', gap: s * 0.5, padding: `${s * 0.4}px ${s * 0.8}px`, borderRadius: s * 0.5, background: C.surface3, border: `1px solid ${C.purple}`, fontFamily: MONO, fontSize: s * 0.85, color: C.white}}>
              <FileIcon size={s * 1.1} color={C.purple} />
              {c.file}
            </div>
          </div>
          <Button s={s} label={c.button} press={press} style={{marginTop: s, width: s * 9}} />
        </Card>
      </PanelBrowser>
      <div style={{position: 'absolute', left: vertical ? W * 0.05 : W * 0.7, top: vertical ? H * 0.74 : H * 0.45, width: vertical ? W * 0.9 : W * 0.25, display: 'flex', flexDirection: 'column', gap: u * 1.6, alignItems: 'flex-start'}}>
        <Chip size={vertical ? u * 3 : u * 2.6} p={p(cues.keyConnected + 1, 12)}>
          {c.note}
        </Chip>
      </div>
    </Frame>
  );
};

/* ⑤ */
const UsersStep: React.FC = () => {
  const {since, p} = useBeat();
  const {W, H, u, vertical} = useLayout();
  const c = S.users;
  const s = vertical ? u * 2.8 : u * 2.5;
  const press = interpolate(since(cues.userCreate), [0, 8], [0, 1], clamp);
  const row = p(cues.userCreate + 0.5, 12);
  const fill = (i: number) => interpolate(since(cues.userFields[i]), [0, 12], [0, 1], clamp);
  const focus = cues.userFields.reduce((acc, b, i) => (since(b) >= 0 ? i : acc), -1);
  return (
    <Frame step="users">
      <PanelBrowser tab={1} enter={p(sc.users.start, 14)}>
        <div style={{display: 'flex', gap: s, flexDirection: vertical ? 'column' : 'row'}}>
          <Card s={s} title="Nuovo utente" style={{flex: 1}}>
            {c.fields.map((f, i) => (
              <Field key={f.label} s={s} label={f.label} value={f.value} typed={fill(i)} focus={focus === i && since(cues.userCreate) < 0} />
            ))}
            <Button s={s} label={c.button} press={press} />
          </Card>
          <Card s={s} title="Utenti registrati" style={{flex: 1}}>
            <div style={{display: 'grid', gridTemplateColumns: '1.4fr 1fr', fontSize: s * 0.78, color: C.text2, gap: s * 0.6}}>
              <span>Username</span>
              <span>Limite / Oggi</span>
              {row > 0 ? (
                <>
                  <span style={{color: C.white, fontWeight: 650, opacity: row}}>{c.fields[0].value}</span>
                  <span style={{opacity: row}}>
                    <span style={{padding: `${s * 0.1}px ${s * 0.5}px`, borderRadius: s, background: `${C.purple}33`, color: C.purpleLight, fontWeight: 700}}>5 / 0</span>
                  </span>
                </>
              ) : null}
            </div>
          </Card>
        </div>
      </PanelBrowser>
      <div style={{position: 'absolute', left: vertical ? W * 0.05 : W * 0.7, top: vertical ? H * 0.74 : H * 0.45}}>
        <Chip size={vertical ? u * 3 : u * 2.6} p={p(cues.userFields[1] + 0.5, 12)}>
          {c.note}
        </Chip>
      </div>
    </Frame>
  );
};

/* ⑥ */
const UploadStep: React.FC = () => {
  const {frame, since, p} = useBeat();
  const {W, H, u, vertical} = useLayout();
  const c = S.upload;
  const s = vertical ? u * 2.8 : u * 2.5;
  const drop = interpolate(since(cues.mp3Drop), [0, 14], [0, 1], {...clamp, easing: EXPO_OUT});
  const fill = (i: number) => interpolate(since(86.5 + i * 0.6), [0, 10], [0, 1], clamp);
  const press = interpolate(since(88.5), [0, 8], [0, 1], clamp);
  const typed = typedChars(frame, cues.typing.upload, c.code.lines[0].length);
  const lvl = interpolate(since(cues.loudness), [0, 18], [0, 1], {...clamp, easing: EXPO_IN_OUT});
  const meterW = vertical ? W * 0.88 : W * 0.3;
  const toX = (lufs: number) => ((lufs + 30) / 24) * meterW; // −30 … −6 LUFS
  const level = -23 + 9 * lvl;
  return (
    <Frame step="upload">
      <PanelBrowser tab={0} enter={p(sc.upload.start, 14)} narrow>
        <Card s={s} title="Nuova canzone">
          <div style={{height: s * 4.2, borderRadius: s * 0.6, border: `${Math.max(1, s * 0.08)}px dashed ${drop > 0.9 ? C.purple : C.outline}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: s * 0.6, fontSize: s * 0.85, color: drop > 0.9 ? C.white : C.text2, fontFamily: drop > 0.9 ? MONO : SANS}}>
            {drop > 0.9 ? (
              <>
                <FileIcon size={s * 1.2} color={C.purple} />
                {c.file}
              </>
            ) : (
              c.drop
            )}
          </div>
          <div style={{display: 'flex', gap: s, marginTop: s}}>
            {c.fields.map((f, i) => (
              <div key={f.label} style={{flex: 1}}>
                <Field s={s} label={f.label} value={f.value} typed={fill(i)} />
              </div>
            ))}
          </div>
          <Button s={s} label={c.button} press={press} />
        </Card>
      </PanelBrowser>
      <div style={{position: 'absolute', left: vertical ? W * 0.05 : W * 0.64, top: vertical ? H * 0.72 : H * 0.36, width: vertical ? W * 0.9 : W * 0.32, ...enterStyle(p(cues.typing.upload.start - 0.5, 12), u)}}>
        <CodeWindow kind="editor" title={c.code.file} lines={c.code.lines} typed={typed} firstLine={c.code.firstLine} fontSize={vertical ? u * 2.4 : u * 2.2} width="100%" wrap highlight={[{line: 0, p: p(cues.typing.upload.end, 10)}]} />
        <div style={{marginTop: u * 3, opacity: p(cues.loudness - 0.5, 10)}}>
          <div style={{position: 'relative', width: meterW, height: u * 2.2, borderRadius: u, background: `linear-gradient(90deg, ${C.surface3}, ${C.purpleDeep}, ${C.purple})`}}>
            <div style={{position: 'absolute', left: toX(-14) - 1, top: -u * 1.2, width: 2, height: u * 4.6, background: C.purpleLight}} />
            <div style={{position: 'absolute', left: toX(level) - u * 1.3, top: -u * 0.2, width: u * 2.6, height: u * 2.6, borderRadius: '50%', background: C.white, boxShadow: `0 0 ${u * 2}px ${C.purple}`}} />
          </div>
          <div style={{position: 'relative', height: u * 4, marginTop: u * 1, fontFamily: MONO, fontSize: vertical ? u * 2.6 : u * 1.9}}>
            <span style={{position: 'absolute', left: toX(-23), transform: 'translateX(-50%)', color: C.text2}}>{c.meter[0]}</span>
            <span style={{position: 'absolute', left: toX(-14), transform: 'translateX(-50%)', color: C.purpleLight, fontWeight: 700}}>{c.meter[1]}</span>
          </div>
        </div>
      </div>
    </Frame>
  );
};

/* ⑦ */
const PhoneStep: React.FC = () => {
  const {frame, since, p} = useBeat();
  const {W, H, u, vertical} = useLayout();
  const c = S.phone;
  const phoneW = vertical ? u * 44 : u * 34;
  const pu = phoneW / 100;
  const beat = frame / 15;
  const loggedIn = beat >= cues.login + 0.6;
  const ring = interpolate(since(cues.downloadPhone), [0, beatToFrame(1.5)], [0, 1], clamp);
  const library = beat >= cues.offlinePhone - 0.4;
  const libP = interpolate(since(cues.offlinePhone - 0.4), [0, 8], [0, 1], clamp);
  const typedUser = interpolate(since(sc.phone.start + 0.3), [0, 10], [0, 1], clamp);
  return (
    <Frame step="phone">
      <div style={{position: 'absolute', left: vertical ? (W - phoneW) / 2 : W * 0.62 - phoneW / 2, top: vertical ? H * 0.22 : (H - phoneW * 2.08) / 2 + u * 7, ...enterStyle(p(sc.phone.start, 14), u)}}>
        <Phone width={phoneW} statusIcons={<StatusIcons u={pu} airplane={library ? libP : 0} />}>
          {!loggedIn ? (
            <div style={{position: 'absolute', inset: 0}}>
              <AppTopBar u={pu} />
              <div style={{position: 'absolute', top: pu * 40, left: pu * 9, right: pu * 9, display: 'flex', flexDirection: 'column', gap: pu * 4}}>
                <div style={{fontSize: pu * 6, fontWeight: 800}}>Sfoglia</div>
                {[
                  ['Username', c.login.user, typedUser],
                  ['Password', '••••••', interpolate(since(sc.phone.start + 1), [0, 8], [0, 1], clamp)],
                ].map(([l, v, t]) => (
                  <div key={l as string}>
                    <div style={{fontSize: pu * 3.4, color: C.text2, marginBottom: pu * 1.2}}>{l as string}</div>
                    <div style={{height: pu * 11, borderRadius: pu * 2.4, background: C.surface2, display: 'flex', alignItems: 'center', padding: `0 ${pu * 3}px`, fontSize: pu * 4.4}}>{(v as string).slice(0, Math.round((v as string).length * (t as number)))}</div>
                  </div>
                ))}
                <div style={{height: pu * 11, borderRadius: pu * 6, background: C.purple, color: C.black, fontWeight: 800, fontSize: pu * 4.4, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: pu * 2}}>{c.login.button}</div>
              </div>
              <Tap x={pu * 50} y={pu * 100} t={since(cues.login)} size={pu * 12} />
              <BottomBar u={pu} active={2} />
            </div>
          ) : !library ? (
            <div style={{position: 'absolute', inset: 0}}>
              <AppTopBar u={pu} />
              <div style={{position: 'absolute', top: pu * 27, left: pu * 6, right: pu * 6, display: 'flex', justifyContent: 'space-between', fontSize: pu * 3.6, color: C.text2}}>
                <span style={{color: C.white, fontWeight: 700}}>{c.login.user}</span>
                <span style={{color: C.purpleLight, fontWeight: 700}}>{c.quota}</span>
              </div>
              <div style={{position: 'absolute', top: pu * 36, left: 0, right: 0}}>
                {c.songs.map((t, i) => (
                  <SongRow key={t} u={pu} title={t} seed={i + 1} right={<DownloadState u={pu} p={i === 0 ? (since(cues.downloadPhone) < 0 ? null : ring) : null} />} />
                ))}
              </div>
              <Tap x={pu * 87} y={pu * 44} t={since(cues.downloadPhone)} size={pu * 12} />
              <BottomBar u={pu} active={2} />
            </div>
          ) : (
            <div style={{position: 'absolute', inset: 0, opacity: libP}}>
              <AppTopBar u={pu} />
              <div style={{position: 'absolute', top: pu * 28, left: 0, right: 0}}>
                {c.songs.map((t, i) => (
                  <SongRow key={t} u={pu} title={t} seed={i + 1} active={i === 0} />
                ))}
              </div>
              <MiniPlayer u={pu} title={c.songs[0]} frame={frame} progress={0.1 + since(cues.offlinePhone) / 600} />
              <BottomBar u={pu} active={0} />
            </div>
          )}
        </Phone>
      </div>
      <div style={{position: 'absolute', left: vertical ? W * 0.06 : W * 0.06, top: vertical ? H * 0.84 : H * 0.4, display: 'flex', flexDirection: vertical ? 'row' : 'column', flexWrap: 'wrap', gap: u * 1.6, alignItems: 'flex-start', width: vertical ? W * 0.88 : W * 0.34}}>
        {['Accedi', 'download', 'offline ✈'].map((label, i) => (
          <Chip key={label} size={vertical ? u * 3 : u * 3} p={p([cues.login, cues.downloadPhone, cues.offlinePhone][i], 10)}>
            {label}
          </Chip>
        ))}
      </div>
    </Frame>
  );
};

export const DevSetup: React.FC = () => {
  const {frame} = useBeat();
  const beat = frame / 15;
  if (beat < sc.install.start) return <Clone />;
  if (beat < sc.panel.start) return <Install />;
  if (beat < sc.key.start) return <PanelStart />;
  if (beat < sc.users.start) return <KeyStep />;
  if (beat < sc.upload.start) return <UsersStep />;
  if (beat < sc.phone.start) return <UploadStep />;
  return <PhoneStep />;
};

