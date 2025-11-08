/**
 * Jump - A Reaction-Based Jumping Game
 * Main application component
 *
 * STABLE VERSION - Working Features:
 * - Intro animation with 3-jump sequence for enemy (no lasers during intro)
 * - Fixed hit/out scoring system (20 hits = 1 out)
 * - Fixed hit counter display (shows 19/20 then resets to 0/20)
 * - Handicap scaling: Getting an out makes YOU grow, opponent shrinks
 * - Out indicators on correct sides (player outs on left, enemy outs on right)
 * - Blue player projectiles properly count as 1 hit each
 * - Enemy lasers disabled until hover mode (after intro animation)
 * - No collision detection during intro animation
 */

import React, { useEffect, useRef, useMemo } from 'react';
import './App.css';
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
import { OutIndicators } from './components/OutIndicators';
import { useImagePreloader } from './hooks/useImagePreloader';
import {
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

  const { isLoading } = useImagePreloader(imagePaths, 3000); // Minimum 3 seconds

  const {
    score,
    gameOver,
    hitCount,
    enemyHits,
    enemyWasHit,
    playerState,
    lasers,
    enemyX,
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
    forestDustField,
    staticCloudSky,
    forestTreesBackground,
    transitioningGround,
    gradientOverlay,
    levelOverlayVisible,
    levelOverlaySubtitle,
    impactAmount,
    isShaking,
    isMuted,
    handleJumpStart,
    handleJumpEnd,
    handleMouseMove,
    testEnergy,
    handleShoot,
    handleRestart,
    handleToggleSound,
    handleTestTenOuts,
    cameraX,
  } = useGameLoop();

  // Keep latest cameraX available inside rAF loop without re-creating effect
  const cameraXRef = useRef<number>(0);
  useEffect(() => { cameraXRef.current = cameraX; }, [cameraX]);

  /**
   * Prevent default touch behaviors on document level (overscroll, pull-to-refresh)
   */
  useEffect(() => {
    const preventDefaultTouch = (e: TouchEvent) => {
      // Prevent default on all touches to stop overscroll and pull-to-refresh
      if (e.touches.length > 1) {
        // Always prevent multi-touch (pinch zoom, etc.)
        e.preventDefault();
      }
    };

    // Add passive: false to allow preventDefault
    document.addEventListener('touchstart', preventDefaultTouch, { passive: false });
    document.addEventListener('touchmove', preventDefaultTouch, { passive: false });

    return () => {
      document.removeEventListener('touchstart', preventDefaultTouch);
      document.removeEventListener('touchmove', preventDefaultTouch);
    };
  }, []);

  /**
   * Render progressive background system: clouds → forest transition at score 100
   */
  useEffect(() => {
    if (!canvasRef.current || !staticCloudSky || !forestTreesBackground || !transitioningGround || !gradientOverlay) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const renderLoop = () => {
      // Clear canvas
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // Apply camera pan for backgrounds
      ctx.save();
      // Use ref to avoid stale closure and restart churn
      ctx.translate(-cameraXRef.current, 0);

      // 1. Render static cloud sky (always present, doesn't scroll)
      staticCloudSky.render(ctx, dimensions.width, dimensions.height);

      // 2. Render forest trees scrolling background (scrolls in from right at score 100)
      forestTreesBackground.render(ctx, dimensions.width, dimensions.height);

      // 3. Render gradient overlay (black to transparent from bottom to top) - behind stars
      gradientOverlay.render(ctx, dimensions.width, dimensions.height);

      // 4. Render WebGL dust layer (composited via offscreen canvas)
      forestDustField?.render(ctx, dimensions.width, dimensions.height);

      // 5. Render transitioning ground (cloud ground + forest ground at score 100) - on top of everything
      transitioningGround.render(ctx, dimensions.width, dimensions.height, score);

      // Restore camera transform
      ctx.restore();

      if (!gameOver) {
        animationFrameId = requestAnimationFrame(renderLoop);
      }
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [forestDustField, staticCloudSky, forestTreesBackground, transitioningGround, gradientOverlay, gameOver, dimensions, score]);

  /**
   * Setup input controls
   */
  useEffect(() => {
    // Track if touch device to prevent mouse events from touch
    let isTouchDevice = false;

    // Track if currently touching/dragging the player ball
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

      // Prevent default browser behaviors (pull-to-refresh, overscroll, etc.)
      e.preventDefault();

      const touch = e.touches[0];
      const screenWidth = window.innerWidth;
      const touchX = touch.clientX;
      const touchY = touch.clientY;

      // Check if touching the ball itself (not a bigger area)
      const playerX = playerState.position.x;
      const playerY = playerState.position.y;
      const ballSize = dimensions.ballSize;
      const currentScale = 1 + playerGrowthLevel * GROWTH_SCALE_PER_LEVEL;
      const actualBallSize = ballSize * currentScale;

      // Calculate distance from touch to ball center
      const distX = Math.abs(touchX - playerX);
      const distY = Math.abs(touchY - playerY);
      const distanceToCenter = Math.sqrt(distX * distX + distY * distY);

      // Check if touching within the actual ball radius
      const ballRadius = actualBallSize / 2;
      const isTouchingBall = distanceToCenter <= ballRadius;

      if (isTouchingBall) {
        // Touching the ball = X-axis control only (Y continues bouncing)
        isTouchingPlayer = true;
        // Don't trigger jump when touching the ball itself
      } else if (touchX < screenWidth / 2) {
        // Left half of screen (not touching ball) = jump
        handleJumpStart();
      } else {
        // Right half of screen = shoot
        handleShoot();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Prevent default browser scrolling behavior
      e.preventDefault();

      if (!isTouchingPlayer) return;

      const touch = e.touches[0];

      // Only update X-axis - Y-axis continues its natural bounce
      // Use the player's current Y position instead of touch Y
      const syntheticEvent = {
        clientX: touch.clientX,
        clientY: playerState.position.y  // Keep Y at current player position
      } as MouseEvent;

      handleMouseMove(syntheticEvent);
    };

    const handleTouchEnd = () => {
      // When releasing the ball, don't trigger jump or fling
      // The ball continues bouncing naturally and stays at its X position
      if (isTouchingPlayer) {
        isTouchingPlayer = false;
        // Don't call handleJumpEnd() - we never started a jump when touching the ball
      } else {
        // If we were jumping (touched left side, not the ball), end the jump
        handleJumpEnd();
      }
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
  }, [handleJumpStart, handleJumpEnd, handleMouseMove, handleShoot, playerState.position, dimensions.ballSize, playerGrowthLevel]);

  return (
    <div
      className={isShaking ? 'shake' : undefined}
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: '#000',
        animation: isShaking ? 'screen-shake 200ms ease' : undefined,
        willChange: isShaking ? 'transform' : undefined,
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

      {/* Player Shadow - Always visible */}
      <Shadow
        x={playerState.position.x}
        characterY={playerState.position.y}
        floorY={dimensions.floorY}
        characterWidth={dimensions.ballSize * (1 + playerGrowthLevel * GROWTH_SCALE_PER_LEVEL)}
        baseSize={dimensions.ballSize}
        growthLevel={playerGrowthLevel}
        cameraX={cameraX}
      />

      {/* Player Ball - Always visible */}
      <Player
        playerState={playerState}
        isHit={wasHit}
        impactAmount={impactAmount}
        growthLevel={playerGrowthLevel}
        ballSize={dimensions.ballSize}
        cameraX={cameraX}
      />

      {/* Enemy Shadow - Always visible */}
      <Shadow
        x={enemyX}
        characterY={enemyY}
        floorY={dimensions.floorY}
        characterWidth={dimensions.ballSize * (1 + enemyGrowthLevel * GROWTH_SCALE_PER_LEVEL)}
        baseSize={dimensions.ballSize}
        growthLevel={enemyGrowthLevel}
        cameraX={cameraX}
      />

      {/* Enemy Launcher - Always visible */}
      <Enemy
        x={enemyX}
        y={enemyY}
        scaleX={enemyScale.scaleX}
        scaleY={enemyScale.scaleY}
        growthLevel={enemyGrowthLevel}
        isHit={enemyWasHit}
        onShoot={canShoot ? handleShoot : undefined}
        ballSize={dimensions.ballSize}
        cameraX={cameraX}
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

          {/* Test Button - 10 Outs */}
          <button
            onClick={handleTestTenOuts}
            style={{
              position: 'absolute',
              top: '150px',
              left: '20px',
              padding: '10px 20px',
              backgroundColor: '#ffc107',
              color: 'black',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: '14px',
              zIndex: 1000,
            }}
          >
            TEST: 10 Outs
          </button>

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
            </div>
          )}

          {/* Player Out Indicators */}
          {!gameOver && (
            <OutIndicators
              outs={playerOuts}
              maxOuts={10}
              color="#4fc3f7"
              position="left"
              isEnemy={false}
            />
          )}

          {/* Enemy Out Indicators */}
          {!gameOver && (
            <OutIndicators
              outs={enemyOuts}
              maxOuts={10}
              color="red"
              position="right"
              isEnemy={true}
            />
          )}

          {/* Energy Bar */}
          {!gameOver && <EnergyBar energy={energy} score={score} />}

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
              cameraX={cameraX}
            />
          ))}

          {/* Player Projectiles (After unlocking shooting) */}
          {canShoot && playerProjectiles.map((projectile, index) => (
            <PlayerProjectile
              key={index}
              x={projectile.x}
              y={projectile.y}
              cameraX={cameraX}
            />
          ))}
        </>
      )}

      {gameOver && <GameOver onRestart={handleRestart} shootGameOver={shootGameOver} />}

      {/* Level Overlay (always mounted for fade-in/out) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          color: 'white',
          textAlign: 'center',
          fontFamily: 'monospace',
          pointerEvents: 'none',
          opacity: levelOverlayVisible ? 1 : 0,
          transition: 'opacity 600ms ease',
          willChange: 'opacity',
          zIndex: 2000,
        }}
      >
        <div style={{ fontSize: '6rem', textShadow: '0 0 20px #fff' }}>Jump!</div>
        <div style={{ fontSize: '2.5rem', marginTop: '10px', opacity: 0.9 }}>{levelOverlaySubtitle}</div>
      </div>

      {/* Sound Toggle Button */}
      <SoundToggleButton isMuted={isMuted} onToggle={handleToggleSound} />

      {/* Fullscreen Toggle Button */}
      <FullscreenButton />
    </div>
  );
};

export default App;




