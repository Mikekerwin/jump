/**
 * Laser Component
 * Renders a single laser projectile
 */

import React from 'react';
import { LASER_WIDTH, LASER_HEIGHT } from '../config/gameConfig';

interface LaserProps {
  x: number;
  y: number;
  width?: number; // Optional custom width
}

export const Laser = React.forwardRef<HTMLDivElement, LaserProps>(
  ({ x, y, width }, ref) => {
    const laserWidth = width || LASER_WIDTH;

    return (
      <div
        ref={ref}
        style={{
          position: 'absolute',
          width: `${laserWidth}px`,
          height: `${LASER_HEIGHT}px`,
          backgroundColor: 'red',
          boxShadow: '0 0 10px red',
          borderRadius: '50%',
          transform: `translate3d(${x}px, ${y}px, 0)`,
        }}
      />
    );
  }
);

Laser.displayName = 'Laser';
