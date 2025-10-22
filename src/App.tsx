/**
 * Jump - A Reaction-Based Jumping Game
 * Main application component
 */

import React, { useEffect, useRef } from 'react';
import { useGameLoop } from './hooks/useGameLoop';
import { Player } from './components/Player';
import { Enemy } from './components/Enemy';
import { Laser } from './components/Laser';
import { PlayerProjectile } from './components/PlayerProjectile';
import { GameOver } from './components/GameOver';
import { ScoreDisplay } from './components/ScoreDisplay';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const laserRefs = useRef<(HTMLDivElement | null)[]>([]);

  const {
    score,
    gameOver,
    hitCount,
    enemyWasHit,
    playerState,
    lasers,
    enemyY,
    enemyScale,
    wasHit,
    playerProjectiles,
    dimensions,
    backgroundStars,
    handleJumpStart,
    handleJumpEnd,
    handleMouseMove,
    handleTouchMove,
    handleShoot,
    handleRestart,
  } = useGameLoop();

  /**
   * Render background stars
   */
  useEffect(() => {
    if (!canvasRef.current || !backgroundStars) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const renderLoop = () => {
      backgroundStars.render(ctx);
      if (!gameOver) {
        requestAnimationFrame(renderLoop);
      }
    };

    requestAnimationFrame(renderLoop);
  }, [backgroundStars, gameOver]);

  /**
   * Setup input controls
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 's' || e.key === 'S') {
        handleShoot(); // Shoot with 'S' key (score 200+)
      } else {
        handleJumpStart(); // Jump with any other key
      }
    };
    const handleKeyUp = () => handleJumpEnd();
    const handleMouseDown = () => handleJumpStart();
    const handleMouseUp = () => handleJumpEnd();
    const handleTouchStart = () => handleJumpStart();
    const handleTouchEnd = () => handleJumpEnd();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchmove', handleTouchMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [handleJumpStart, handleJumpEnd, handleMouseMove, handleTouchMove, handleShoot]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: '#000',
      }}
    >
      {/* Background Stars */}
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{
          position: 'absolute',
          inset: 0,
        }}
      />

      {!gameOver && (
        <>
          {/* Score Display */}
          <ScoreDisplay score={score} />

          {/* Hit Counter (Score 100+) */}
          {score >= 100 && !gameOver && (
            <div
              style={{
                position: 'absolute',
                top: '60px',
                left: '20px',
                color: '#4fc3f7',
                fontSize: '24px',
                fontFamily: 'monospace',
                textShadow: '0 0 10px #4fc3f7',
                zIndex: 100,
              }}
            >
              Hit: {hitCount} / 20
            </div>
          )}

          {/* Player Ball */}
          <Player playerState={playerState} isHit={wasHit} />

          {/* Enemy Launcher */}
          <Enemy
            x={dimensions.enemyX}
            y={enemyY}
            scale={enemyScale.scaleY}
            isHit={enemyWasHit}
          />

          {/* Lasers */}
          {lasers.map((laser, index) => (
            <Laser
              key={index}
              x={laser.x}
              y={laser.y}
              width={laser.width}
              ref={(el) => {
                laserRefs.current[index] = el;
              }}
            />
          ))}

          {/* Player Projectiles (Score 200+) */}
          {score >= 200 && playerProjectiles.map((projectile, index) => (
            <PlayerProjectile
              key={index}
              x={projectile.x}
              y={projectile.y}
            />
          ))}
        </>
      )}

      {gameOver && <GameOver onRestart={handleRestart} />}
    </div>
  );
};

export default App;
