/**
 * Player Component
 * Renders the player ball with physics-based scaling
 */

import React from 'react';
import { PlayerState } from '../types/game';
import { GROWTH_SCALE_PER_LEVEL } from '../config/gameConfig';

interface PlayerProps {
  playerState: PlayerState;
  isHit?: boolean;
  growthLevel?: number; // Growth level (each level scales by GROWTH_SCALE_PER_LEVEL)
  ballSize?: number; // Responsive ball size (defaults to 80)
}

export const Player = React.forwardRef<HTMLDivElement, PlayerProps>(
  ({ playerState, isHit, growthLevel = 0, ballSize = 80 }, ref) => {
    const { position, scaleX, scaleY } = playerState;

    // Calculate actual size based on growth level using scale multiplier
    const growthScale = 1 + (growthLevel * GROWTH_SCALE_PER_LEVEL); // 1.0, 1.1, 1.2, 1.3, etc
    const actualSize = ballSize * growthScale;
    const growthAmount = actualSize - ballSize; // Calculate growth for centering

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
            ? 'none'
            : 'background-color 0.75s ease, box-shadow 0.25s ease'
        }}
      />
    );
  }
);

Player.displayName = 'Player';
