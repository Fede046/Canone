import React from 'react';

type P = {size: number; color: string; strokeWidth?: number; style?: React.CSSProperties};

const Stroke: React.FC<P & {children: React.ReactNode}> = ({size, color, strokeWidth = 2, style, children}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {children}
  </svg>
);

export const Play: React.FC<P> = ({size, color, style}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill={color} />
  </svg>
);

export const Pause: React.FC<P> = ({size, color, style}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
    <rect x="6" y="5" width="4" height="14" rx="1.2" fill={color} />
    <rect x="14" y="5" width="4" height="14" rx="1.2" fill={color} />
  </svg>
);

export const Skip: React.FC<P & {back?: boolean}> = ({size, color, back}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{transform: back ? undefined : 'scaleX(-1)'}}>
    <rect x="5" y="5" width="2.6" height="14" rx="1" fill={color} />
    <path d="M19 6.2v11.6a.8.8 0 0 1-1.25.66L9.6 12.66a.8.8 0 0 1 0-1.32l8.15-5.8A.8.8 0 0 1 19 6.2z" fill={color} />
  </svg>
);

export const Shuffle: React.FC<P> = (p) => (
  <Stroke {...p}>
    <path d="M16 3h5v5" />
    <path d="M4 20L21 3" />
    <path d="M21 16v5h-5" />
    <path d="M15 15l6 6" />
    <path d="M4 4l5 5" />
  </Stroke>
);

export const Moon: React.FC<P> = (p) => (
  <Stroke {...p}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </Stroke>
);

export const Check: React.FC<P> = (p) => (
  <Stroke {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Stroke>
);
