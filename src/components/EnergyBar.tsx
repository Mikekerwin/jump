/**
 * Energy Bar Component
 * Displays player energy level with color gradient
 * Fully Green at 80% → Yellow at 50% → Fully Red at 20%
 */

import React from 'react';

interface EnergyBarProps {
  energy: number; // 0-100
  score: number;
}

export const EnergyBar: React.FC<EnergyBarProps> = ({ energy, score }) => {
  // Calculate color based on energy level
  const getColor = () => {
    if (energy >= 80) {
      // Fully green at 80% or above
      return `rgb(0, 255, 0)`;
    } else if (energy <= 20) {
      // Fully red at 20% or below
      return `rgb(255, 0, 0)`;
    } else if (energy > 50) {
      // Green to Yellow (80% → 50%)
      const ratio = (energy - 50) / 30; // 1.0 at 80%, 0.0 at 50%
      return `rgb(${Math.round(255 * (1 - ratio))}, 255, 0)`;
    } else {
      // Yellow to Red (50% → 20%)
      const ratio = (energy - 20) / 30; // 1.0 at 50%, 0.0 at 20%
      return `rgb(255, ${Math.round(255 * ratio)}, 0)`;
    }
  };

  const barColor = getColor();
  const barText = score < 100 ? 'Fill Up!' : (energy > 50 ? 'Shoot!' : 'Jump!');

  return (
    <div
      style={{
        position: 'absolute',
        left: '20px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '30px',
        height: '300px',
        zIndex: 100,
      }}
    >
      {/* Bar container with clipping */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '15px',
          overflow: 'hidden',
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
      </div>

      {/* Current energy level marker line with text (outside clipping) */}
      <div
        style={{
          position: 'absolute',
          bottom: `${energy}%`,
          left: 0,
          width: '30px',
          height: '2px',
          backgroundColor: 'white',
          boxShadow: '0 0 5px rgba(255, 255, 255, 0.8)',
          transition: 'bottom 0.3s ease',
        }}
      >
        {/* Line extending out to the right */}
        <div
          style={{
            position: 'absolute',
            top: '-1px',
            left: '100%',
            width: '20px',
            height: '2px',
            backgroundColor: 'white',
            boxShadow: '0 0 5px rgba(255, 255, 255, 0.8)',
          }}
        />
        {/* Text label */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 'calc(100% + 25px)',
            transform: 'translateY(-50%)',
            color: 'white',
            fontSize: '16px',
            fontWeight: 'bold',
            textShadow: '0 0 8px black',
            whiteSpace: 'nowrap',
          }}
        >
          {barText}
        </div>
      </div>

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
