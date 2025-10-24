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
  scale?: number;
  isHit?: boolean; // Whether enemy was just hit by player projectile
  onShoot?: () => void; // Handler for shooting when clicking/touching enemy
}

export const Enemy = React.memo(React.forwardRef<HTMLDivElement, EnemyProps>(
  ({ x, y, scale = 1, isHit = false, onShoot }, ref) => {
    const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault(); // Prevent default action
      e.stopPropagation(); // Prevent bubbling to window listeners (stops jump)
      if (onShoot) {
        onShoot();
      }
    };

    return (
      <div
        ref={ref}
        onClick={handleInteraction}
        onMouseDown={handleInteraction}
        onTouchStart={handleInteraction}
        style={{
          position: 'absolute',
          width: `${BALL_SIZE}px`,
          height: `${BALL_SIZE}px`,
          borderRadius: '50%',
          top: `${y}px`,
          left: `${x}px`,
          backgroundColor: isHit ? '#4fc3f7' : 'red', // Change to blue when hit
          boxShadow: isHit ? '0 0 15px #4fc3f7' : '0 0 15px red',
          transform: `scale(${scale})`,
          transition: 'transform 0.6s ease-out, background-color 0.25s ease, box-shadow 0.25s ease, top 0.1s linear',
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
