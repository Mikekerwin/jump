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
    const { position, scaleX } = playerState;

    return (
      <div
        ref={ref}
        style={{
          position: 'absolute',
          width: `${BALL_SIZE}px`,
          height: `${BALL_SIZE}px`,
          borderRadius: '50%',
          top: `${position.y}px`,
          left: `${position.x}px`,
          backgroundColor: isHit ? 'red' : '#4fc3f7',
          boxShadow: isHit ? '0 0 15px red' : '0 0 15px #4fc3f7',
          transform: `scale(${scaleX})`,
          transition: 'transform 0.6s ease-out, background-color 0.75s ease, box-shadow 0.25s ease',
        }}
      />
    );
  }
);

Player.displayName = 'Player';
