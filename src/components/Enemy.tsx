/**
 * Enemy Component
 *
 * Renders the enemy launcher ball with squash/stretch morphing effect
 */

import React from 'react';
import { BALL_SIZE } from '../config/gameConfig';


interface EnemyProps {
  x: number;
  y: number;
  scaleX?: number; // Squash/stretch animation on X axis
  scaleY?: number; // Squash/stretch animation on Y axis
  growthLevel?: number; // 0-4 for size growth (each level adds 25px)
  isHit?: boolean; // Whether enemy was just hit by player projectile
  onShoot?: () => void; // Handler for shooting when clicking/touching enemy
}

export const Enemy = React.memo(React.forwardRef<HTMLDivElement, EnemyProps>(
  ({ x, y, scaleX = 1, scaleY = 1, growthLevel = 0, isHit = false, onShoot }, ref) => {
    const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault(); // Prevent default action
      e.stopPropagation(); // Prevent bubbling to window listeners (stops jump)
      if (onShoot) {
        onShoot();
      }
    };

    // Calculate actual size based on growth level (25% per level)
    const growthAmount = growthLevel * 25; // 0, 25, 50, 75, 100
    const actualSize = BALL_SIZE + growthAmount; // 80, 105, 130, 155, 180

    // Offset position to keep ball centered as it grows
    const centeredLeft = x - (growthAmount / 2);
    const centeredTop = y - (growthAmount / 2);

    return (
      <div
        ref={ref}
        onClick={handleInteraction}
        onMouseDown={handleInteraction}
        onTouchStart={handleInteraction}
        style={{
          position: 'absolute',
          width: `${actualSize}px`,
          height: `${actualSize}px`,
          borderRadius: '50%',
          top: `${centeredTop}px`,
          left: `${centeredLeft}px`,
          backgroundColor: isHit ? '#4fc3f7' : 'red', // Change to blue when hit
          boxShadow: isHit ? '0 0 15px #4fc3f7' : '0 0 15px red',
          transform: `scale(${scaleX}, ${scaleY})`,
          transition: isHit
            ? 'width .65s ease, height .65s ease'
            : 'background-color 0.75s ease, box-shadow 0.25s ease, width .65s ease, height .65s ease',
          cursor: onShoot ? 'pointer' : 'default',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
        }}
      />
    );
  }
));


Enemy.displayName = 'Enemy';
