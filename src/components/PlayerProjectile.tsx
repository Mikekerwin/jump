/**
 * Player Projectile Component
 * Renders a blue laser shot from the player ball
 */

import React from 'react';
import { PLAYER_PROJECTILE_WIDTH, PLAYER_PROJECTILE_HEIGHT } from '../config/gameConfig';

interface PlayerProjectileProps {
  x: number;
  y: number;
  cameraX?: number;
}

export const PlayerProjectile = React.forwardRef<HTMLDivElement, PlayerProjectileProps>(
  ({ x, y, cameraX = 0 }, ref) => {
  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${PLAYER_PROJECTILE_WIDTH}px`,
        height: `${PLAYER_PROJECTILE_HEIGHT}px`,
        backgroundColor: '#4fc3f7', // Blue color matching player
        boxShadow: '0 0 10px #4fc3f7',
        transform: `translate3d(${x - cameraX}px, ${y}px, 0)`,
        willChange: 'transform',
        zIndex: 1000,
      }}
    />
  );
  }
);

PlayerProjectile.displayName = 'PlayerProjectile';
