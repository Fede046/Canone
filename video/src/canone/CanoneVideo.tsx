/**
 * The two CANONE videos (public / dev), horizontal or vertical: the layout adapts to the size.
 * Scene windows come from the shared timeline (timeline.ts), texts from content.ts,
 * the soundtrack from public/canone/<audience>.wav (scripts/canone/make-music.mjs).
 */
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {Grain} from '../components/Atmosphere';
import type {Audience} from './content';
import {TimelineProvider} from './kit';
import {ColdIris, DevCold, PublicCold} from './scenes/Cold';
import {DevSetup} from './scenes/DevSetup';
import {DevZones} from './scenes/DevZones';
import {PublicDemo} from './scenes/PublicDemo';
import {Reveal} from './scenes/Reveal';
import {Closing, Vision} from './scenes/Warm';
import {beatToFrame, timelines} from './timeline';

/** A window of the timeline: [from.start, to.end) in beats, with an optional lead-in in frames. */
const Seg: React.FC<{audience: Audience; from: number; to: number; lead?: number; name: string; children: React.ReactNode}> = ({audience, from, to, lead = 0, name, children}) => {
  const start = beatToFrame(from) - lead;
  const end = beatToFrame(to);
  return (
    <Sequence from={start} durationInFrames={end - start} name={name}>
      <TimelineProvider audience={audience} sceneStart={start}>
        {children}
      </TimelineProvider>
    </Sequence>
  );
};

export type CanoneProps = {audience: Audience; grain: boolean};

export const CanoneVideo: React.FC<CanoneProps> = ({audience, grain}) => {
  const tl = timelines[audience];
  const s = tl.scenes;
  const lastSetup = audience === 'public' ? (timelines.public.scenes.grid.end as number) : (timelines.dev.scenes.fzA.end as number);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Audio src={staticFile(`canone/${audience}.wav`)} />
      <Seg audience={audience} from={0} to={s.name.start} name="cold">
        <ColdIris>{audience === 'public' ? <PublicCold /> : <DevCold />}</ColdIris>
      </Seg>
      <Seg audience={audience} from={s.name.start} to={s.value.end} name="name + value">
        <Reveal />
      </Seg>
      {audience === 'public' ? (
        <Seg audience={audience} from={s.value.end} to={lastSetup} name="how it works">
          <PublicDemo />
        </Seg>
      ) : (
        <>
          <Seg audience={audience} from={timelines.dev.scenes.clone.start} to={timelines.dev.scenes.phone.end} name="setup">
            <DevSetup />
          </Seg>
          <Seg audience={audience} from={timelines.dev.scenes.pipeline.start} to={timelines.dev.scenes.fzA.end} name="how the Zones work">
            <DevZones />
          </Seg>
        </>
      )}
      <Seg audience={audience} from={s.vision.start} to={s.vision.end} lead={12} name="vision">
        <Vision />
      </Seg>
      <Seg audience={audience} from={s.closing.start} to={s.closing.end} name="closing">
        <Closing />
      </Seg>
      {grain ? <Grain /> : null}
    </AbsoluteFill>
  );
};
