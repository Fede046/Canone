import React from 'react';
import {colors} from '../theme';

/** Archimedean spiral path centred on (50,50), used as vinyl grooves and for the outro build. */
export const spiralPath = (turns: number, rStart: number, rEnd: number, steps = 900) => {
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * turns * Math.PI * 2;
    const r = rStart + (rEnd - rStart) * t;
    d += `${i === 0 ? 'M' : 'L'}${(50 + Math.cos(a) * r).toFixed(2)},${(50 + Math.sin(a) * r).toFixed(2)} `;
  }
  return d;
};

const GROOVES = spiralPath(9, 14, 46);

/**
 * Project mark: beamed notes on a green disc. With `grooves`, the disc reads as a vinyl
 * record whose grooves spin (`spin` in degrees) while the notes stay upright.
 */
export const Logo: React.FC<{size: number; grooves?: boolean; spin?: number; style?: React.CSSProperties}> = ({
  size,
  grooves = false,
  spin = 0,
  style,
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{overflow: 'visible', ...style}}>
    <circle cx="50" cy="50" r="50" fill={colors.line} />
    {grooves ? (
      <path
        d={GROOVES}
        fill="none"
        stroke={colors.bg}
        strokeOpacity={0.16}
        strokeWidth={0.6}
        transform={`rotate(${spin} 50 50)`}
      />
    ) : null}
    <g fill={colors.bg}>
      <polygon points="38,31 73,23 73,32 38,40" />
      <rect x="38" y="33" width="5.5" height="34" rx="1.5" />
      <rect x="67.5" y="26" width="5.5" height="34" rx="1.5" />
      <ellipse cx="34" cy="67" rx="9.5" ry="7.5" transform="rotate(-20 34 67)" />
      <ellipse cx="63.5" cy="60" rx="9.5" ry="7.5" transform="rotate(-20 63.5 60)" />
    </g>
  </svg>
);
