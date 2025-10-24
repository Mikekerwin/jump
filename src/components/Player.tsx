/**
 * Player Component
 * Renders the player ball with physics-based scaling
 */

import React from 'react';
import { PlayerState } from '../types/game';
import { BALL_SIZE } from '../config/gameConfig';

interface PlayerProps {
  playerState: PlayerState;
  isHit?: boolean;
  growthLevel?: number; // 0-4 for size growth (each level adds 20px)
}

export const Player = React.forwardRef<HTMLDivElement, PlayerProps>(
  ({ playerState, isHit, growthLevel = 0 }, ref) => {
    const { position, scaleX, scaleY } = playerState;

    // Calculate actual size based on growth level
    const growthAmount = growthLevel * 20; // 0, 20, 40, 60, 80
    const actualSize = BALL_SIZE + growthAmount; // 80, 100, 120, 140, 160

    // Offset position to keep ball centered as it grows
    const centeredLeft = position.x - (growthAmount / 2);
    const centeredTop = position.y - (growthAmount / 2);

    return (
      <div
        ref={ref}
        style={{
          position: 'absolute',
          width: `${actualSize}px`,
          height: `${actualSize}px`,
          borderRadius: '50%',
          top: `${centeredTop}px`,
          left: `${centeredLeft}px`,
          backgroundColor: isHit ? 'red' : '#4fc3f7',
          boxShadow: isHit ? '0 0 15px red' : '0 0 15px #4fc3f7',
          transform: `scale(${scaleX}, ${scaleY})`,
          transition: isHit
            ? 'width .65s ease, height .65s ease'
            : 'background-color 0.75s ease, box-shadow 0.25s ease, width .65s ease, height .65s ease'
        }}
      />
    );
  }
);

Player.displayName = 'Player';
