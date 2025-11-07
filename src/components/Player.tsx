/**
 * Player Component
 * Renders the player ball with physics-based scaling
 */

import React from 'react';
import { PlayerState } from '../types/game';
import { GROWTH_SCALE_PER_LEVEL } from '../config/gameConfig';

interface PlayerProps {
  playerState: PlayerState;
  isHit?: boolean;
  growthLevel?: number; // Growth level (each level scales by GROWTH_SCALE_PER_LEVEL)
  ballSize?: number; // Responsive ball size (defaults to 80)
  impactAmount?: number; // 0..1 temporary impact amount for width squash
  cameraX?: number; // camera pan offset
}

export const Player = React.forwardRef<HTMLDivElement, PlayerProps>(
  ({ playerState, isHit, growthLevel = 0, ballSize = 80, impactAmount = 0, cameraX = 0 }, ref) => {
    const { position, scaleX, scaleY } = playerState;

    // Calculate actual size based on growth level using scale multiplier
    const growthScale = 1 + (growthLevel * GROWTH_SCALE_PER_LEVEL); // 1.0, 1.1, 1.2, 1.3, etc
    const actualSize = ballSize * growthScale;
    const growthAmount = actualSize - ballSize; // Calculate growth for centering

    // Offset position to keep ball centered horizontally, but maintain floor contact
    const centeredLeft = position.x - (growthAmount / 2);
    // For Y: Move up by the full growthAmount to keep bottom edge at same floor level
    // (when ball grows, it expands equally in all directions from center, so we compensate)
    const centeredTop = position.y - growthAmount;

    // Apply width-only squash on impact with smooth blending
    // At impactAmount=1 -> X compressed to 0.75x, Y unchanged
    const clampedImpact = Math.max(-1, Math.min(1, impactAmount));
    const impactScaleX = 1 - 0.25 * clampedImpact; // negative -> slight widen; positive -> compress
    const impactScaleY = 1; // keep height unchanged for side-hit look

    return (
      <div
        ref={ref}
        style={{
          position: 'absolute',
          width: `${actualSize}px`,
          height: `${actualSize}px`,
          borderRadius: '50%',
          // Use CSS variables to compose translate + scale in a single transform
          // Position element from (0,0) using translate; keep bottom-center as origin for squash/stretch
          top: 0,
          left: 0,
          backgroundColor: isHit ? 'red' : '#4fc3f7',
          boxShadow: isHit ? '0 0 15px red' : '0 0 15px #4fc3f7',
          transform: 'translate3d(var(--tx, 0px), var(--ty, 0px), 0) scale(var(--sx, 1), var(--sy, 1))',
          transformOrigin: '50% 100%',
          willChange: 'transform',
          transition: isHit
            ? 'none'
            : 'background-color 0.75s ease, box-shadow 0.25s ease',
          zIndex: 1000, // Above loading screen and UI
          // Set CSS custom properties for this frame
          ['--tx' as any]: `${centeredLeft - cameraX}px`,
          ['--ty' as any]: `${centeredTop}px`,
          ['--sx' as any]: String(scaleX * impactScaleX),
          ['--sy' as any]: String(scaleY * impactScaleY),
        } as React.CSSProperties & Record<string, string>}
      />
    );
  }
);

Player.displayName = 'Player';
