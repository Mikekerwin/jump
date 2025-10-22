/**
 * GameOver Component
 * Displays game over screen with restart functionality
 */

import React from 'react';

interface GameOverProps {
  onRestart: () => void;
}

export const GameOver: React.FC<GameOverProps> = ({ onRestart }) => {
  return (
    <div
      onClick={onRestart}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        fontSize: '8rem',
        fontWeight: 'bold',
        cursor: 'pointer',
      }}
    >
      JUMP!
    </div>
  );
};
