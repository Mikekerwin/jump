/**
 * ScoreDisplay Component
 * Renders the current score
 */

import React from 'react';

interface ScoreDisplayProps {
  score: number;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        width: '100%',
        textAlign: 'center',
        fontSize: '2rem',
        fontWeight: 'bold',
        color: 'white',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      Jumps: {score}
    </div>
  );
};
