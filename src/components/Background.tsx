/**
 * Background Component
 * Renders the starfield canvas
 */

import React, { useRef, useEffect } from 'react';
import { BackgroundStars } from '../systems/backgroundStars';

interface BackgroundProps {
  width: number;
  height: number;
  starsSystem: BackgroundStars;
}

export const Background: React.FC<BackgroundProps> = ({ width, height, starsSystem }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Render loop is handled by parent component
    // This component just provides the canvas reference
  }, []);

  // Expose render method to parent via canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Store context for external rendering
    (canvas as any).renderStars = () => {
      starsSystem.render(ctx);
    };
  }, [starsSystem]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        inset: 0,
      }}
    />
  );
};
