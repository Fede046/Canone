import React from 'react';
import {AbsoluteFill, Audio, staticFile} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {Backdrop, CodeField, Flashes, Grain, Hud, Vignette} from './components/Atmosphere';
import {Camera, Scene, SlitLines} from './components/Stage';
import {Build} from './scenes/Build';
import {Feature1, Feature2, Feature3} from './scenes/Features';
import {Intro} from './scenes/Intro';
import {Outro} from './scenes/Outro';
import {Tagline} from './scenes/Tagline';
import {Terminal} from './scenes/Terminal';
import {colors} from './theme';

export type ShowreelProps = {
  /** GIF mode: no audio, grain, motion blur, handheld drift or code texture; static glow → < 10 MB. */
  gif: boolean;
  /** Camera motion blur (render only; slows Studio playback). */
  motionBlur: boolean;
};

const Scenes: React.FC<{handheld: boolean}> = ({handheld}) => (
  <Camera handheld={handheld}>
    <Scene name="intro">
      <Intro />
    </Scene>
    <Scene name="tagline">
      <Tagline />
    </Scene>
    <Scene name="build">
      <Build />
    </Scene>
    <Scene name="feature1">
      <Feature1 />
    </Scene>
    <Scene name="feature2">
      <Feature2 />
    </Scene>
    <Scene name="feature3">
      <Feature3 />
    </Scene>
    <Scene name="terminal">
      <Terminal />
    </Scene>
    <Scene name="outro">
      <Outro />
    </Scene>
    <SlitLines />
  </Camera>
);

export const Showreel: React.FC<ShowreelProps> = ({gif, motionBlur}) => (
  <AbsoluteFill style={{background: colors.bg}}>
    <Backdrop still={gif} />
    {gif ? null : <CodeField />}
    {motionBlur && !gif ? (
      <CameraMotionBlur samples={6} shutterAngle={200}>
        <Scenes handheld={!gif} />
      </CameraMotionBlur>
    ) : (
      <Scenes handheld={!gif} />
    )}
    <Vignette />
    <Hud />
    <Flashes />
    {gif ? null : <Grain />}
    {gif ? null : <Audio src={staticFile('showreel.wav')} />}
  </AbsoluteFill>
);
