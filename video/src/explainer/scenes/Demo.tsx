import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {Logo} from '../../components/Logo';
import {DISPLAY, EXPO_IN_OUT, EXPO_OUT, springAt, tween, useLayout} from '../../theme';
import {content} from '../content';
import {AirplaneIcon, CheckIcon, clamp, CodeWindow, DownloadIcon, pal, PauseIcon, Phone, PlayIcon, useSceneTime, wave, Words} from '../kit';
import {beatToFrame, timeline, typedChars} from '../timeline';

const {cues, scenes} = timeline;
const STEP_STARTS = [scenes.step1.start, scenes.step2.start, scenes.step3.start];
const PUSH = 6; // half-length of the push transition, frames
export const DEMO_LEAD = 8; // the paper panel slides up during the 8 frames before step 1

/* Shared geometry for both formats. */
const useGeo = () => {
  const {W, H, pick, vertical} = useLayout();
  return {
    W,
    H,
    vertical,
    pick,
    captionTop: pick(145, 250),
    captionFont: pick(92, 80),
    code: vertical ? {left: 45, top: 570, width: W - 90, font: 27} : {left: 500, top: 420, width: 1360, font: 30},
    phone: vertical ? {left: (W - 380) / 2, top: 1000, width: 380} : {left: 110, top: 300, width: 330},
  };
};

/* ── Step indicator ① ② ③ ─────────────────────────────────────────────── */
const Pills: React.FC<{pos: number}> = ({pos}) => {
  const {pick, vertical} = useLayout();
  const size = pick(46, 56);
  return (
    <div
      style={{
        position: 'absolute',
        top: pick(70, 150),
        left: vertical ? 0 : 120,
        right: vertical ? 0 : undefined,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 0,
      }}
    >
      {[0, 1, 2].map((i) => {
        const active = Math.max(0, 1 - Math.abs(pos - i));
        const done = pos >= i;
        return (
          <React.Fragment key={i}>
            {i > 0 ? (
              <div style={{width: pick(70, 90), height: 4, background: pal.paper.line, position: 'relative'}}>
                <div style={{position: 'absolute', inset: 0, background: pal.green, transformOrigin: 'left', transform: `scaleX(${Math.min(1, Math.max(0, pos - (i - 1)))})`}} />
              </div>
            ) : null}
            <div
              style={{
                width: size,
                height: size,
                borderRadius: '50%',
                background: done ? pal.green : pal.paper.card,
                border: `3px solid ${done ? pal.green : pal.paper.line}`,
                color: done ? pal.black : pal.paper.dim,
                fontFamily: DISPLAY,
                fontWeight: 800,
                fontSize: size * 0.48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: `scale(${1 + active * 0.18})`,
              }}
            >
              {i + 1}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ── Step panels ──────────────────────────────────────────────────────── */
const Caption: React.FC<{i: number}> = ({i}) => {
  const {since} = useSceneTime('step1', DEMO_LEAD);
  const g = useGeo();
  return (
    <div
      style={{
        position: 'absolute',
        top: g.captionTop,
        left: g.vertical ? 50 : 120,
        right: g.vertical ? 50 : 120,
        display: 'flex',
        justifyContent: g.vertical ? 'center' : 'flex-start',
      }}
    >
      <Words
        text={content.steps[i].caption}
        t={since(STEP_STARTS[i] + cues.stepCaption)}
        stagger={2}
        duration={10}
        color={pal.paper.ink}
        style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: g.captionFont, letterSpacing: '-0.035em', lineHeight: 1.08, justifyContent: g.vertical ? 'center' : 'flex-start'}}
        highlight={['offline']}
        highlightColor="#13924A"
      />
    </div>
  );
};

const Step1: React.FC = () => {
  const {since, global} = useSceneTime('step1', DEMO_LEAD);
  const g = useGeo();
  const s = content.steps[0];
  const cmd = s.terminal.command;
  const installed = since(cues.installed);
  const pop = springAt(installed, {damping: 11, mass: 0.6});
  const enter = springAt(since(scenes.step1.start), {damping: 18});
  const u = g.phone.width / 100;
  return (
    <>
      <Caption i={0} />
      <div style={{position: 'absolute', left: g.phone.left, top: g.phone.top, transform: `translateY(${(1 - enter) * 120}px)`, opacity: enter}}>
        <Phone width={g.phone.width}>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: u * 6, padding: `${u * 10}px ${u * 7}px`}}>
            {new Array(12).fill(0).map((_, k) => {
              const target = k === 5;
              return (
                <div key={k} style={{aspectRatio: '1', borderRadius: u * 5, position: 'relative', background: target ? 'transparent' : pal.paper.line, border: target ? `2px dashed ${pal.paper.line}` : undefined}}>
                  {target && installed >= 0 ? (
                    <>
                      <div style={{position: 'absolute', inset: -u * 6, borderRadius: '50%', border: `3px solid ${pal.green}`, transform: `scale(${1 + tween(installed, 18) * 1.4})`, opacity: 1 - tween(installed, 18)}} />
                      <div style={{position: 'absolute', inset: 0, transform: `scale(${pop})`}}>
                        <Logo size={(g.phone.width - u * 14 - u * 18) / 4} />
                      </div>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Phone>
      </div>
      <div style={{position: 'absolute', left: g.code.left, top: g.vertical ? g.code.top : g.code.top + 40, opacity: enter, transform: `translateY(${(1 - enter) * 80}px)`}}>
        <CodeWindow
          kind="terminal"
          title={s.terminal.title}
          lines={[cmd]}
          prompt={s.terminal.prompt}
          typed={typedChars(global, cues.typing.step1, cmd.length)}
          fontSize={g.code.font * 1.35}
          width={g.code.width}
          done={{text: s.terminal.done, p: tween(installed, 10)}}
          highlightLines={[0]}
          highlightP={tween(installed, 10)}
          cursorBlink={installed < 0 && Math.floor(global / 8) % 2 === 0}
        />
      </div>
    </>
  );
};

const Step2: React.FC = () => {
  const {since, global} = useSceneTime('step1', DEMO_LEAD);
  const g = useGeo();
  const s = content.steps[1];
  const ed = s.editor;
  const total = ed.lines.reduce((a, l) => a + l.length, 0);
  const tap = since(cues.tap);
  const prog = interpolate(global, [beatToFrame(cues.tap) + 2, beatToFrame(cues.downloadDone)], [0, 1], {...clamp, easing: EXPO_IN_OUT});
  const done = springAt(since(cues.downloadDone), {damping: 11});
  const u = g.phone.width / 100;
  const covers = ['#1DB954', '#0F7A3A', '#7BE0A5'];
  return (
    <>
      <Caption i={1} />
      <div style={{position: 'absolute', left: g.phone.left, top: g.phone.top}}>
        <Phone width={g.phone.width}>
          <div style={{padding: `${u * 6}px ${u * 7}px`}}>
            <div style={{width: u * 40, height: u * 5, borderRadius: u * 2, background: pal.paper.ink, opacity: 0.85, marginBottom: u * 8}} />
            {covers.map((c, r) => {
              const target = r === 1;
              return (
                <div key={r} style={{display: 'flex', alignItems: 'center', gap: u * 4, marginBottom: u * 7, position: 'relative'}}>
                  <div style={{width: u * 18, height: u * 18, borderRadius: u * 3, background: c, flexShrink: 0}} />
                  <div style={{flex: 1}}>
                    <div style={{width: '80%', height: u * 3.2, borderRadius: u, background: pal.paper.ink, opacity: 0.8}} />
                    <div style={{marginTop: u * 2.4, width: '50%', height: u * 2.6, borderRadius: u, background: pal.paper.dim, opacity: 0.4}} />
                  </div>
                  <div style={{width: u * 14, height: u * 14, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    {target && tap >= 0 ? (
                      <>
                        <div style={{position: 'absolute', inset: -u * 4, borderRadius: '50%', background: 'rgba(29,185,84,0.25)', transform: `scale(${tween(tap, 14) * 1.6})`, opacity: 1 - tween(tap, 14)}} />
                        <svg width={u * 14} height={u * 14} viewBox="0 0 40 40" style={{position: 'absolute'}}>
                          <circle cx="20" cy="20" r="16" fill="none" stroke={pal.paper.line} strokeWidth="4" />
                          <circle cx="20" cy="20" r="16" fill="none" stroke={pal.green} strokeWidth="4" strokeLinecap="round" strokeDasharray={100.5} strokeDashoffset={100.5 * (1 - prog)} transform="rotate(-90 20 20)" />
                        </svg>
                        {done > 0.01 ? (
                          <div style={{position: 'absolute', inset: u * 1.5, borderRadius: '50%', background: pal.green, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${done})`}}>
                            <CheckIcon size={u * 8} color={pal.black} strokeWidth={3} />
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <DownloadIcon size={u * 9} color={target ? pal.paper.ink : pal.paper.dim} strokeWidth={2.2} />
                    )}
                  </div>
                  {/* finger */}
                  {target ? (
                    <div
                      style={{
                        position: 'absolute',
                        right: u * 1,
                        top: u * 2,
                        width: u * 12,
                        height: u * 12,
                        borderRadius: '50%',
                        background: 'rgba(11,16,13,0.18)',
                        border: '3px solid rgba(255,255,255,0.9)',
                        boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
                        opacity: interpolate(tap, [-8, -2, 6, 12], [0, 1, 1, 0], clamp),
                        transform: `translate(${interpolate(tap, [-8, 0], [u * 10, 0], clamp)}px, ${interpolate(tap, [-8, 0], [u * 14, 0], clamp)}px) scale(${tap >= 0 && tap < 4 ? 0.85 : 1})`,
                      }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </Phone>
      </div>
      <div style={{position: 'absolute', left: g.code.left, top: g.code.top}}>
        <CodeWindow
          kind="editor"
          title={ed.file}
          lines={ed.lines}
          typed={typedChars(global, cues.typing.step2, total)}
          fontSize={g.code.font}
          width={g.code.width}
          highlightLines={ed.highlightLines}
          highlightP={tween(since(cues.highlight2), 10)}
        />
      </div>
    </>
  );
};

const Step3: React.FC = () => {
  const {since, global} = useSceneTime('step1', DEMO_LEAD);
  const g = useGeo();
  const s = content.steps[2];
  const ed = s.editor;
  const total = ed.lines.reduce((a, l) => a + l.length, 0);
  const air = tween(since(cues.airplane), 8);
  const badge = since(cues.airplane);
  const play = since(cues.play);
  const playing = play >= 0;
  const life = interpolate(play, [0, 12], [0, 1], {...clamp, easing: EXPO_OUT});
  const u = g.phone.width / 100;
  return (
    <>
      <Caption i={2} />
      <div style={{position: 'absolute', left: g.phone.left, top: g.phone.top}}>
        <Phone width={g.phone.width} airplane={air} dark>
          <div style={{padding: `${u * 6}px ${u * 8}px`, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <div
              style={{
                width: u * 78,
                height: u * 78,
                borderRadius: u * 5,
                background: `linear-gradient(140deg, ${pal.green}, #0B3D20)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: playing ? '0 0 60px rgba(29,185,84,0.35)' : undefined,
              }}
            >
              <Logo size={u * 44} grooves spin={playing ? play * 3 : 0} />
            </div>
            <div style={{alignSelf: 'flex-start', marginTop: u * 7, fontSize: u * 7, fontWeight: 800, color: '#fff'}}>{s.nowPlaying}</div>
            <div style={{alignSelf: 'flex-start', marginTop: u * 2.5, width: u * 34, height: u * 2.8, borderRadius: u, background: '#fff', opacity: 0.3}} />
            <svg width={u * 84} height={u * 22} style={{marginTop: u * 3, overflow: 'visible'}}>
              <g transform={`translate(0 ${u * 11})`}>
                <path d={wave(u * 84, u * 9, global * 0.25, Math.max(0.04, life))} fill="none" stroke={pal.green} strokeWidth={u * 1.1} strokeLinecap="round" />
              </g>
            </svg>
            <div style={{width: '100%', height: u * 1.3, borderRadius: u, background: 'rgba(255,255,255,0.15)', marginTop: u * 2}}>
              <div style={{width: `${interpolate(play, [0, 120], [4, 30], clamp)}%`, height: '100%', borderRadius: u, background: pal.green}} />
            </div>
            <div
              style={{
                marginTop: u * 7,
                width: u * 20,
                height: u * 20,
                borderRadius: '50%',
                background: playing ? pal.green : '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: `scale(${playing ? 1 + 0.25 * Math.exp(-play / 3) : 1})`,
                boxShadow: playing ? '0 0 30px rgba(29,185,84,0.6)' : undefined,
              }}
            >
              {playing ? <PauseIcon size={u * 10} color={pal.black} /> : <PlayIcon size={u * 10} color={pal.black} />}
            </div>
          </div>
          {/* Airplane-mode badge pops, then flies to the status bar */}
          {badge >= 0 && badge < 22 ? (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '40%',
                width: u * 34,
                height: u * 34,
                marginLeft: -u * 17,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.95)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: `translate(${interpolate(badge, [12, 22], [0, u * 30], clamp)}px, ${interpolate(badge, [12, 22], [0, -u * 75], clamp)}px) scale(${springAt(badge, {damping: 12}) * interpolate(badge, [12, 22], [1, 0.15], clamp)})`,
              }}
            >
              <AirplaneIcon size={u * 20} color={pal.black} />
            </div>
          ) : null}
        </Phone>
      </div>
      <div style={{position: 'absolute', left: g.code.left, top: g.code.top + (g.vertical ? 0 : 60)}}>
        <CodeWindow
          kind="editor"
          title={ed.file}
          lines={ed.lines}
          typed={typedChars(global, cues.typing.step3, total)}
          fontSize={g.code.font}
          width={g.code.width}
          highlightLines={ed.highlightLines}
          highlightP={tween(since(cues.highlight3), 10)}
          token={ed.highlightToken}
        />
      </div>
    </>
  );
};

export const Demo: React.FC = () => {
  const {global} = useSceneTime('step1', DEMO_LEAD);
  const {W} = useLayout();
  const f = (b: number) => beatToFrame(b);
  const pos = interpolate(global, [f(STEP_STARTS[1]) - PUSH, f(STEP_STARTS[1]) + PUSH, f(STEP_STARTS[2]) - PUSH, f(STEP_STARTS[2]) + PUSH], [0, 1, 1, 2], {
    ...clamp,
    easing: EXPO_IN_OUT,
  });
  const panels = [Step1, Step2, Step3];
  return (
    <AbsoluteFill style={{background: pal.paper.bg, fontFamily: DISPLAY}}>
      {/* soft green glow, top-right */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 50% 40% at 85% 10%, rgba(29,185,84,0.10) 0%, transparent 70%)'}} />
      {panels.map((Panel, i) => {
        const x = (i - pos) * W;
        if (Math.abs(x) >= W) return null;
        return (
          <AbsoluteFill key={i} style={{transform: `translateX(${x}px)`}}>
            <Panel />
          </AbsoluteFill>
        );
      })}
      <Pills pos={pos} />
    </AbsoluteFill>
  );
};
