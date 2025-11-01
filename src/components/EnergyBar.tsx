/**
 * Energy Bar Component
 * Displays player energy level with color gradient
 * Green (100-50%) → Yellow (50-25%) → Red (25-0%)
 */

import React from 'react';

interface EnergyBarProps {
  energy: number; // 0-100
}

export const EnergyBar: React.FC<EnergyBarProps> = ({ energy }) => {
  // Calculate color based on energy level
  const getColor = () => {
    if (energy >= 50) {
      // Green to Yellow (100% → 50%)
      const ratio = (energy - 50) / 50; // 1.0 at 100%, 0.0 at 50%
      return `rgb(${Math.round(255 * (1 - ratio))}, 255, 0)`;
    } else {
      // Yellow to Red (50% → 0%)
      const ratio = energy / 50; // 1.0 at 50%, 0.0 at 0%
      return `rgb(255, ${Math.round(255 * ratio)}, 0)`;
    }
  };

  const barColor = getColor();

  return (
    <div
      style={{
        position: 'absolute',
        left: '20px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '30px',
        height: '300px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '15px',
        overflow: 'hidden',
        zIndex: 100,
      }}
    >
      {/* Fill bar (grows from bottom) */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: `${energy}%`,
          backgroundColor: barColor,
          transition: 'height 0.3s ease, background-color 0.3s ease',
          boxShadow: `0 0 10px ${barColor}`,
        }}
      />

      {/* Energy percentage text */}
      <div
        style={{
          position: 'absolute',
          top: '-25px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold',
          textShadow: '0 0 5px black',
          whiteSpace: 'nowrap',
        }}
      >
        {Math.round(energy)}%
      </div>
    </div>
  );
};
