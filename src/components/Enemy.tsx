/**
 * Enemy Component
 *
 * Renders the enemy launcher ball with squash/stretch morphing effect
 */

import React from 'react';
import { BALL_SIZE } from '../config/gameConfig';


interface EnemyProps {
  x: number;
  y: number;
  scale?: number;
  isHit?: boolean; // Whether enemy was just hit by player projectile
}

export const Enemy = React.memo(React.forwardRef<HTMLDivElement, EnemyProps>(
  ({ x, y, scale = 1, isHit = false }, ref) => {
    // Note: The actual size of the enemy is now controlled by its growth level in the physics system.
    // The `BALL_SIZE` here is just the base size. The transform `scale` handles the visual growth.
    // However, for simplicity, we'll let the internal physics size dictate collisions, and just render the base ball.
    return (
      <div
        ref={ref}
        style={{
          position: 'absolute',
          width: `${BALL_SIZE}px`,
          height: `${BALL_SIZE}px`,
          borderRadius: '50%',
          top: `${y}px`,
          left: `${x}px`,
          backgroundColor: isHit ? '#4fc3f7' : 'red', // Change to blue when hit
          boxShadow: isHit ? '0 0 15px #4fc3f7' : '0 0 15px red',
          transform: `scale(${scale})`,
          transition: 'transform 0.6s ease-out, background-color 0.25s ease, box-shadow 0.25s ease, top 0.1s linear',
        }}
      />
    );
  }
));


Enemy.displayName = 'Enemy';
