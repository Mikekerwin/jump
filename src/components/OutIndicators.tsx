/**
 * OutIndicators Component
 *
 * Displays 10 circles that fill with player/enemy color as outs are scored
 */

import React from 'react';

interface OutIndicatorsProps {
  outs: number; // Current number of outs (0-10)
  maxOuts: number; // Maximum outs (10)
  color: string; // Color to fill circles with (#4fc3f7 for player, red for enemy)
  position: 'left' | 'right'; // Position on screen
  isEnemy?: boolean; // If true, makes circles 5 and 10 larger
}

export const OutIndicators: React.FC<OutIndicatorsProps> = ({
  outs,
  maxOuts,
  color,
  position,
  isEnemy = false,
}) => {
  const circles = Array.from({ length: maxOuts }, (_, index) => {
    const circleNumber = index + 1;
    const isFilled = circleNumber <= outs;

    // Make circles 5 and 10 slightly larger for enemy
    let circleSize = 5;
    if (isEnemy) {
      if (circleNumber === 5) circleSize = 6;
      if (circleNumber === 10) circleSize = 7;
    }

    return (
      <div
        key={index}
        style={{
          width: `${circleSize}px`,
          height: `${circleSize}px`,
          borderRadius: '50%',
          backgroundColor: isFilled ? color : 'transparent',
          border: `1px solid ${color}`,
          transition: 'background-color 0.3s ease, transform 0.2s ease',
          transform: isFilled ? 'scale(1.1)' : 'scale(1)',
        }}
      />
    );
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: '100px',
        [position]: '20px',
        display: 'flex',
        flexDirection: 'row', // Changed from column to row for horizontal layout
        gap: '4px', // Smaller gap between circles
        alignItems: 'center',
        zIndex: 100,
      }}
    >
      {circles}
    </div>
  );
};
