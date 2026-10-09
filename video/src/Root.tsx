import React from 'react';
import {Composition, Still} from 'remotion';
import {CanoneVideo, type CanoneProps} from './canone/CanoneVideo';
import {FPS as CANONE_FPS, beatToFrame as canoneFrames, timelines as canone} from './canone/timeline';
import {Thumbnail} from './canone/Thumbnail';
import {ZonesTest} from './canone/ZonesTest';
import {Explainer} from './explainer/Explainer';
import {TOTAL_FRAMES as EXPLAINER_FRAMES} from './explainer/timeline';
import {Showreel, type ShowreelProps} from './Showreel';
import {timeline, TOTAL_FRAMES} from './timeline';

const showreel = {component: Showreel, durationInFrames: TOTAL_FRAMES, fps: timeline.fps};
const full: ShowreelProps = {gif: false, motionBlur: true};
const publicProps: CanoneProps = {audience: 'public', grain: false};
const devProps: CanoneProps = {audience: 'dev', grain: false};
const explainer = {component: Explainer, durationInFrames: EXPLAINER_FRAMES, fps: timeline.fps, defaultProps: {grain: true}};

export const RemotionRoot: React.FC = () => (
  <>
    {/* ── Explainer (40 s, elevator pitch, non-technical audience) ── */}
    <Composition id="Explainer-Horizontal" {...explainer} width={1920} height={1080} />
    <Composition id="Explainer-Vertical" {...explainer} width={1080} height={1920} />

    {/* ── Canone (current app): public and developer explainers ── */}
    <Composition id="Canone-Public-Horizontal" component={CanoneVideo} durationInFrames={canoneFrames(canone.public.totalBeats)} fps={CANONE_FPS} width={1920} height={1080} defaultProps={publicProps} />
    <Composition id="Canone-Public-Vertical" component={CanoneVideo} durationInFrames={canoneFrames(canone.public.totalBeats)} fps={CANONE_FPS} width={1080} height={1920} defaultProps={publicProps} />
    <Composition id="Canone-Dev-Horizontal" component={CanoneVideo} durationInFrames={canoneFrames(canone.dev.totalBeats)} fps={CANONE_FPS} width={1920} height={1080} defaultProps={devProps} />
    <Composition id="Canone-Dev-Vertical" component={CanoneVideo} durationInFrames={canoneFrames(canone.dev.totalBeats)} fps={CANONE_FPS} width={1080} height={1920} defaultProps={devProps} />
    {/* YouTube thumbnail of the developer video (npx remotion still Canone-Thumbnail out/canone-thumbnail.png) */}
    <Still id="Canone-Thumbnail" component={Thumbnail} width={1280} height={720} defaultProps={{t: 66}} />
    {/* development aid: the three Zones, fast and calm */}
    <Composition id="Canone-ZonesTest" component={ZonesTest} durationInFrames={300} fps={30} width={1920} height={1080} />

    {/* ── Showreel (15 s teaser) ── */}
    <Composition id="Showreel-Vertical" {...showreel} width={1080} height={1920} defaultProps={full} />
    <Composition id="Showreel-Horizontal" {...showreel} width={1920} height={1080} defaultProps={full} />
    <Composition id="Showreel-GIF" {...showreel} width={1920} height={1080} defaultProps={{gif: true, motionBlur: false}} />
  </>
);
