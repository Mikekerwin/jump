/**
 * Enemy Component
 *
 * Renders the enemy launcher ball with squash/stretch morphing effect
 */

import React from 'react';
import { GROWTH_SCALE_PER_LEVEL } from '../config/gameConfig';

interface EnemyProps {
  x: number;
  y: number;
  scaleX?: number; // Squash/stretch animation on X axis
  scaleY?: number; // Squash/stretch animation on Y axis
  growthLevel?: number; // Growth level (each level scales by GROWTH_SCALE_PER_LEVEL)
  isHit?: boolean; // Whether enemy was just hit by player projectile
  onShoot?: () => void; // Handler for shooting when clicking/touching enemy
  ballSize?: number; // Responsive ball size (defaults to 80)
  cameraX?: number; // camera pan offset
}

export const Enemy = React.memo(React.forwardRef<HTMLDivElement, EnemyProps>(
  ({ x, y, scaleX = 1, scaleY = 1, growthLevel = 0, isHit = false, onShoot, ballSize = 80, cameraX = 0 }, ref) => {
    const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (onShoot) {
        onShoot();
      }
    };

    const growthScale = 1 + (growthLevel * GROWTH_SCALE_PER_LEVEL);
    const actualSize = ballSize * growthScale;
    const growthAmount = actualSize - ballSize;

    const centeredLeft = x - (growthAmount / 2) - cameraX;
    const centeredTop = y - growthAmount;

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
          // Transform via CSS variables: translate + scale with bottom-center origin
          top: 0,
          left: 0,
          backgroundColor: isHit ? '#4fc3f7' : 'red',
          boxShadow: isHit ? '0 0 15px #4fc3f7' : '0 0 15px red',
          transform: 'translate3d(var(--tx, 0px), var(--ty, 0px), 0) scale(var(--sx, 1), var(--sy, 1))',
          transformOrigin: '50% 100%',
          willChange: 'transform',
          transition: isHit
            ? 'none'
            : 'background-color 0.75s ease, box-shadow 0.25s ease',
          cursor: onShoot ? 'pointer' : 'default',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
          zIndex: 1000,
          // Per-frame CSS variable values
          ['--tx' as any]: `${centeredLeft}px`,
          ['--ty' as any]: `${centeredTop}px`,
          ['--sx' as any]: String(scaleX),
          ['--sy' as any]: String(scaleY),
        } as React.CSSProperties & Record<string, string>}
      />
    );
  }
));

Enemy.displayName = 'Enemy';
