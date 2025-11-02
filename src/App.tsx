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
import { FullscreenButton } from './components/FullscreenButton';
import { EnergyBar } from './components/EnergyBar';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const laserRefs = useRef<(HTMLDivElement | null)[]>([]);

  const {
    score,
    gameOver,
    hitCount,
    enemyHits,
    enemyWasHit,
    playerState,
    lasers,
    enemyY,
    enemyScale,
    wasHit,
    playerProjectiles,
    energy,
    canShoot,
    playerOuts,
    enemyOuts,
    shootGameOver,
    playerGrowthLevel,
    enemyGrowthLevel,
    dimensions,
    backgroundStars,
    scrollingBackground,
    handleJumpStart,
    handleJumpEnd,
    handleMouseMove,
    testEnergy,
    handleShoot,
    handleRestart,
  } = useGameLoop();

  /**
   * Render scrolling background and stars
   */
  useEffect(() => {
    if (!canvasRef.current || !backgroundStars || !scrollingBackground) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const renderLoop = () => {
      // Clear canvas
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // Render scrolling background first (behind stars)
      scrollingBackground.render(ctx, dimensions.width, dimensions.height);

      // Render stars on top
      backgroundStars.render(ctx);

      if (!gameOver) {
        requestAnimationFrame(renderLoop);
      }
    };

    requestAnimationFrame(renderLoop);
  }, [backgroundStars, scrollingBackground, gameOver, dimensions]);

  /**
   * Setup input controls
   */
  useEffect(() => {
    // Track if touch device to prevent mouse events from touch
    let isTouchDevice = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 's' || e.key === 'S') {
        handleShoot(); // Shoot with 'S' key (score 100+)
      } else {
        handleJumpStart(); // Jump with any other key
      }
    };
    const handleKeyUp = () => handleJumpEnd();

    const handleMouseDown = () => {
      if (!isTouchDevice) handleJumpStart();
    };
    const handleMouseUp = () => {
      if (!isTouchDevice) handleJumpEnd();
    };
    const handleMouseMoveWrapper = (e: MouseEvent) => {
      // Only track mouse position on non-touch devices
      if (!isTouchDevice) handleMouseMove(e);
    };

    const handleTouchStart = () => {
      isTouchDevice = true; // Mark as touch device
      handleJumpStart();
    };
    const handleTouchEnd = () => handleJumpEnd();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMoveWrapper);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    // Note: touchmove is NOT added - on touch devices, player doesn't follow finger position

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMoveWrapper);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleJumpStart, handleJumpEnd, handleMouseMove, handleShoot]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: '#000',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
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
          {/* Test Button - Fill Energy */}
          {!canShoot && (
            <button
              onClick={testEnergy}
              style={{
                position: 'absolute',
                top: '100px',
                left: '20px',
                padding: '10px 20px',
                backgroundColor: '#ff5252',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: '14px',
                zIndex: 1000,
                textShadow: '0 0 5px rgba(255, 82, 82, 0.5)',
              }}
            >
              TEST: Fill Energy
            </button>
          )}

          {/* Score Display */}
          <ScoreDisplay score={score} />

          {/* Player Hit Counter (Shows after unlocking shooting) */}
          {canShoot && !gameOver && (
            <div
              style={{
                position: 'absolute',
                top: '60px',
                left: '20px',
                color: '#4fc3f7',
                fontSize: '20px',
                fontFamily: 'monospace',
                textShadow: '0 0 10px #4fc3f7',
                zIndex: 100,
              }}
            >
              <div>Hit: {hitCount} / 20</div>
              <div style={{ marginTop: '5px' }}>Outs: {playerOuts} / 10</div>
            </div>
          )}

          {/* Enemy Hit Counter (Always visible) */}
          {!gameOver && (
            <div
              style={{
                position: 'absolute',
                top: '60px',
                right: '20px',
                color: '#ff5252',
                fontSize: '20px',
                fontFamily: 'monospace',
                textShadow: '0 0 10px #ff5252',
                zIndex: 100,
              }}
            >
              <div>Hit: {enemyHits} / 20</div>
              <div style={{ marginTop: '5px' }}>Outs: {enemyOuts} / 10</div>
            </div>
          )}

          {/* Energy Bar */}
          {!gameOver && <EnergyBar energy={energy} />}

          {/* Player Ball */}
          <Player playerState={playerState} isHit={wasHit} growthLevel={playerGrowthLevel} />

          {/* Enemy Launcher */}
          <Enemy
            x={dimensions.enemyX}
            y={enemyY}
            scaleX={enemyScale.scaleX}
            scaleY={enemyScale.scaleY}
            growthLevel={enemyGrowthLevel}
            isHit={enemyWasHit}
            onShoot={score >= 100 ? handleShoot : undefined}
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

          {/* Player Projectiles (After unlocking shooting) */}
          {canShoot && playerProjectiles.map((projectile, index) => (
            <PlayerProjectile
              key={index}
              x={projectile.x}
              y={projectile.y}
            />
          ))}
        </>
      )}

      {gameOver && <GameOver onRestart={handleRestart} shootGameOver={shootGameOver} />}

      {/* Fullscreen Toggle Button */}
      <FullscreenButton />
    </div>
  );
};

export default App;
