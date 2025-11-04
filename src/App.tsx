/**
 * Jump - A Reaction-Based Jumping Game
 * Main application component
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { useGameLoop } from './hooks/useGameLoop';
import { Player } from './components/Player';
import { Enemy } from './components/Enemy';
import { Laser } from './components/Laser';
import { PlayerProjectile } from './components/PlayerProjectile';
import { GameOver } from './components/GameOver';
import { ScoreDisplay } from './components/ScoreDisplay';
import { FullscreenButton } from './components/FullscreenButton';
import { SoundToggleButton } from './components/SoundToggleButton';
import { EnergyBar } from './components/EnergyBar';
import { Shadow } from './components/Shadow';
import LoadingScreen from './components/LoadingScreen';
import { useImagePreloader } from './hooks/useImagePreloader';
import {
  STARS_ENABLED,
  GROWTH_SCALE_PER_LEVEL,
  CLOUD_SKY_IMAGE_PATH,
  CLOUD_GROUND_IMAGE_PATH,
  TRANSITION_GROUND_IMAGE_PATH,
  FOREST_GROUND_IMAGE_PATH,
  FOREST_TREES_IMAGE_PATH
} from './config/gameConfig';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const laserRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Preload all game images - use useMemo to prevent array recreation on every render
  const imagePaths = useMemo(() => [
    CLOUD_SKY_IMAGE_PATH,
    CLOUD_GROUND_IMAGE_PATH,
    TRANSITION_GROUND_IMAGE_PATH,
    FOREST_GROUND_IMAGE_PATH,
    FOREST_TREES_IMAGE_PATH
  ], []);

  const { isLoading } = useImagePreloader(imagePaths, 5000); // Minimum 5 seconds

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
    staticCloudSky,
    forestTreesBackground,
    transitioningGround,
    gradientOverlay,
    isMuted,
    handleJumpStart,
    handleJumpEnd,
    handleMouseMove,
    testEnergy,
    handleShoot,
    handleRestart,
    handleToggleSound,
  } = useGameLoop();

  /**
   * Start forest background transition when score hits 100
   */
  useEffect(() => {
    if (score >= 100 && forestTreesBackground) {
      forestTreesBackground.startTransition();
    }
  }, [score, forestTreesBackground]);

  /**
   * Render progressive background system: clouds → forest transition at score 100
   */
  useEffect(() => {
    if (!canvasRef.current || !backgroundStars || !staticCloudSky || !forestTreesBackground || !transitioningGround || !gradientOverlay) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const renderLoop = () => {
      // Clear canvas
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // 1. Render static cloud sky (always present, doesn't scroll)
      staticCloudSky.render(ctx, dimensions.width, dimensions.height);

      // 2. Render forest trees scrolling background (scrolls in from right at score 100)
      forestTreesBackground.render(ctx, dimensions.width, dimensions.height);

      // 3. Render gradient overlay (black to transparent from bottom to top) - behind stars
      gradientOverlay.render(ctx, dimensions.width, dimensions.height);

      // 4. Render stars on top of gradient, behind ground (if enabled)
      if (STARS_ENABLED) {
        backgroundStars.render(ctx);
      }

      // 5. Render transitioning ground (cloud ground → forest ground at score 100) - on top of everything
      transitioningGround.render(ctx, dimensions.width, dimensions.height, score);

      if (!gameOver) {
        requestAnimationFrame(renderLoop);
      }
    };

    requestAnimationFrame(renderLoop);
  }, [backgroundStars, staticCloudSky, forestTreesBackground, transitioningGround, gradientOverlay, gameOver, dimensions, score]);

  /**
   * Setup input controls
   */
  useEffect(() => {
    // Track if touch device to prevent mouse events from touch
    let isTouchDevice = false;

    // Touch/swipe tracking for mobile fling mechanics
    let touchStartX = 0;
    let touchStartTime = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;
    let isTouchingPlayer = false;

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

    const handleTouchStart = (e: TouchEvent) => {
      isTouchDevice = true; // Mark as touch device

      const touch = e.touches[0];
      const screenWidth = window.innerWidth;
      const touchX = touch.clientX;

      touchStartX = touchX;
      touchStartTime = Date.now();
      lastTouchX = touchX;
      lastTouchY = touch.clientY;

      // Left half of screen = jump control
      if (touchX < screenWidth / 2) {
        // Check if touching near player position for fling control
        const playerX = playerState.position.x;
        const playerY = playerState.position.y;
        const ballSize = dimensions.ballSize;

        // Expand hit area for easier control
        const touchAreaSize = ballSize * 2;
        const distX = Math.abs(touchX - playerX);
        const distY = Math.abs(touch.clientY - playerY);

        if (distX < touchAreaSize && distY < touchAreaSize) {
          isTouchingPlayer = true;
        }

        handleJumpStart();
      }
      // Right half of screen = shoot control
      else {
        handleShoot();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTouchingPlayer) return;

      const touch = e.touches[0];
      lastTouchX = touch.clientX;
      lastTouchY = touch.clientY;

      // Update player horizontal position based on touch drag
      const deltaX = lastTouchX - touchStartX;

      // Create a synthetic mouse event to move the player
      const syntheticEvent = {
        clientX: touchStartX + deltaX,
        clientY: touch.clientY
      } as MouseEvent;

      handleMouseMove(syntheticEvent);
    };

    const handleTouchEnd = () => {
      const touchEndTime = Date.now();
      const touchDuration = touchEndTime - touchStartTime;

      // Calculate swipe velocity for fling
      if (isTouchingPlayer && touchDuration < 300) { // Fast swipe
        const deltaX = lastTouchX - touchStartX;
        const velocity = Math.abs(deltaX) / touchDuration; // pixels per ms

        // Apply fling based on swipe direction and speed
        // Faster swipe = more fling (up to 200px)
        const flingDistance = Math.min(Math.abs(deltaX) * velocity * 100, 200);
        const flingDirection = deltaX > 0 ? 1 : -1;

        console.log(`🎯 Fling! Distance: ${flingDistance}px, Direction: ${flingDirection > 0 ? 'RIGHT' : 'LEFT'}`);

        // Apply fling by adjusting player position
        const syntheticEvent = {
          clientX: touchStartX + (flingDirection * flingDistance),
          clientY: lastTouchY
        } as MouseEvent;

        handleMouseMove(syntheticEvent);
      }

      isTouchingPlayer = false;
      handleJumpEnd();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMoveWrapper);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMoveWrapper);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleJumpStart, handleJumpEnd, handleMouseMove, handleShoot, playerState.position, dimensions.ballSize]);

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
      {/* Loading Screen - Shows above everything until images are loaded */}
      <LoadingScreen isVisible={isLoading} />

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

          {/* Player Shadow */}
          <Shadow
            x={playerState.position.x}
            characterY={playerState.position.y}
            floorY={dimensions.floorY}
            characterWidth={dimensions.ballSize * (1 + playerGrowthLevel * GROWTH_SCALE_PER_LEVEL)}
            baseSize={dimensions.ballSize}
            growthLevel={playerGrowthLevel}
          />

          {/* Player Ball */}
          <Player
            playerState={playerState}
            isHit={wasHit}
            growthLevel={playerGrowthLevel}
            ballSize={dimensions.ballSize}
          />

          {/* Enemy Shadow */}
          <Shadow
            x={dimensions.enemyX}
            characterY={enemyY}
            floorY={dimensions.floorY}
            characterWidth={dimensions.ballSize * (1 + enemyGrowthLevel * GROWTH_SCALE_PER_LEVEL)}
            baseSize={dimensions.ballSize}
            growthLevel={enemyGrowthLevel}
          />

          {/* Enemy Launcher */}
          <Enemy
            x={dimensions.enemyX}
            y={enemyY}
            scaleX={enemyScale.scaleX}
            scaleY={enemyScale.scaleY}
            growthLevel={enemyGrowthLevel}
            isHit={enemyWasHit}
            onShoot={score >= 100 ? handleShoot : undefined}
            ballSize={dimensions.ballSize}
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

      {/* Sound Toggle Button */}
      <SoundToggleButton isMuted={isMuted} onToggle={handleToggleSound} />

      {/* Fullscreen Toggle Button */}
      <FullscreenButton />
    </div>
  );
};

export default App;
