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
}

export const Player = React.forwardRef<HTMLDivElement, PlayerProps>(
  ({ playerState, isHit }, ref) => {
    const { position, scaleX, scaleY } = playerState;

    return (
      <div
        ref={ref}
        style={{
          position: 'absolute',
          width: `${BALL_SIZE}px`,
          height: `${BALL_SIZE}px`,
          borderRadius: '50%',
          backgroundColor: isHit ? 'red' : '#4fc3f7',
          transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scaleX}, ${scaleY})`,
          transition: isHit ? 'none' : 'background-color 0.75s ease',
        }}
      />
    );
  }
);

Player.displayName = 'Player';
