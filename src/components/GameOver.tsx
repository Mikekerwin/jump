/**
 * GameOver Component
 * Displays game over screen with restart functionality
 */

import React from 'react';

interface GameOverProps {
  onRestart: () => void;
  shootGameOver?: boolean;
}

export const GameOver: React.FC<GameOverProps> = ({ onRestart, shootGameOver }) => {
  return (
    <div
      onClick={onRestart}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: shootGameOver ? '#4fc3f7' : 'white',
        fontSize: '8rem',
        fontWeight: 'bold',
        fontFamily: 'Georgia, "Times New Roman", Times, serif',
        cursor: 'pointer',
        textShadow: shootGameOver ? '0 0 20px #4fc3f7' : 'none',
      }}
    >
      {shootGameOver ? 'SHOOT!' : 'JUMP!'}
    </div>
  );
};
