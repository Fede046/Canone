import React from 'react';
import {AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Grain} from '../components/Atmosphere';
import {EXPO_IN_OUT, useLayout} from '../theme';
import {clamp} from './kit';
import {ColdBackdrop, ColdIris, Consequences, Problem, Question} from './scenes/Cold';
import {Demo, DEMO_LEAD} from './scenes/Demo';
import {Solution} from './scenes/Solution';
import {Closing, CLOSING_LEAD, Vision, VISION_LEAD} from './scenes/Warm';
import {beatToFrame, timeline, type SceneName} from './timeline';

const {scenes} = timeline;
const COLD_FADE = 10;

type Enter = 'none' | 'fade' | 'up' | 'sunrise';

/**
 * A scene window. `lead` starts the Sequence that many frames before the scene's beat so the
 * incoming scene can reveal itself (enter) over the outgoing one and land exactly on the beat.
 */
const Scene: React.FC<{
  from: SceneName;
  to?: SceneName;
  lead?: number;
  enter?: Enter;
  fadeOut?: number;
  children: React.ReactNode;
}> = ({from, to = from, lead = 0, enter = 'none', fadeOut = 0, children}) => {
  const start = beatToFrame(scenes[from].start) - lead;
  const end = beatToFrame(scenes[to].end);
  return (
    <Sequence from={start} durationInFrames={end - start} name={from === to ? from : `${from}…${to}`}>
      <Reveal enter={enter} lead={lead} duration={end - start} fadeOut={fadeOut}>
        {children}
      </Reveal>
    </Sequence>
  );
};

const Reveal: React.FC<{enter: Enter; lead: number; duration: number; fadeOut: number; children: React.ReactNode}> = ({
  enter,
  lead,
  duration,
  fadeOut,
  children,
}) => {
  const f = useCurrentFrame();
  const {W, H} = useLayout();
  const p = lead ? interpolate(f, [0, lead + 2], [0, 1], {...clamp, easing: EXPO_IN_OUT}) : 1;
  const out = fadeOut ? interpolate(f, [duration - fadeOut, duration], [1, 0], clamp) : 1;
  const style: React.CSSProperties = {opacity: out};
  if (enter === 'fade') style.opacity = out * p;
  if (enter === 'up') {
    style.transform = `translateY(${(1 - p) * H}px)`;
    style.borderRadius = `${(1 - p) * 60}px ${(1 - p) * 60}px 0 0`;
    style.overflow = 'hidden';
  }
  if (enter === 'sunrise') style.clipPath = `circle(${p * Math.hypot(W, H)}px at 50% 100%)`;
  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
};

export type ExplainerProps = {grain: boolean};

export const Explainer: React.FC<ExplainerProps> = ({grain}) => (
  <AbsoluteFill style={{background: '#000'}}>
    {/* 0–15 s · question → problem → consequences (cold), closed by an iris */}
    <Sequence from={0} durationInFrames={beatToFrame(scenes.name.start)} name="cold">
      <ColdIris>
        <ColdBackdrop />
        <Scene from="question" fadeOut={COLD_FADE}>
          <Question />
        </Scene>
        <Scene from="problem" fadeOut={COLD_FADE}>
          <Problem />
        </Scene>
        <Scene from="consequences">
          <Consequences />
        </Scene>
      </ColdIris>
    </Sequence>

    {/* 15–20 s · name + value phrase (the drop) */}
    <Scene from="name" to="value">
      <Solution />
    </Scene>

    {/* 20–33 s · how it works */}
    <Scene from="step1" to="step3" lead={DEMO_LEAD} enter="up">
      <Demo />
    </Scene>

    {/* 33–38 s · vision */}
    <Scene from="vision" lead={VISION_LEAD} enter="sunrise">
      <Vision />
    </Scene>

    {/* 38–40 s · closing */}
    <Scene from="closing" lead={CLOSING_LEAD} enter="fade">
      <Closing />
    </Scene>

    {grain ? <Grain /> : null}
    <Audio src={staticFile('explainer.wav')} />
  </AbsoluteFill>
);
