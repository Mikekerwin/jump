/**
 * useGameLoop Hook
 *
 * Main game loop that orchestrates all game systems
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { PlayerPhysics } from '../systems/playerPhysics';
import { LaserPhysics } from '../systems/laserPhysics';
import { AudioManager, setupAudioUnlock } from '../systems/audioManager';
import { BackgroundStars } from '../systems/backgroundStars';
import { ScrollingBackground } from '../systems/scrollingBackground';
import { PlayerState, LaserState, PlayerProjectile } from '../types/game';
import {
  BALL_SIZE,
  HITBOX_SIZE,
  PLAYER_X_POSITION,
  FLOOR_Y_POSITION,
  ENEMY_X_POSITION,
  SCORE_UPDATE_INTERVAL,
  PLAYER_PROJECTILE_SPEED,
  PLAYER_PROJECTILE_WIDTH,
  PLAYER_PROJECTILE_HEIGHT,
  ENEMY_WIDTH_GROWTH_PER_CYCLE,
  ENEMY_HEIGHT_GROWTH_PER_CYCLE,
  LEVEL_2_SCORE_THRESHOLD,
  LEVEL_3_SCORE_THRESHOLD,
  ENEMY_HITS_FOR_GROWTH,
  MAX_GROWTH_CYCLES,
  MAX_OUTS,
  HITS_PER_OUT,
  BACKGROUND_IMAGE_PATH,
} from '../config/gameConfig';

export const useGameLoop = () => {
  // Game state
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [playerState, setPlayerState] = useState<PlayerState>({
    position: { x: 0, y: 0 },
    velocity: 0,
    scaleX: 1,
    scaleY: 1,
    bounceOffsetX: 0,
    bounceOffsetY: 0,
    hasJumped: false,
    isHolding: false,
    holdStartTime: 0,
  });
  const [lasers, setLasers] = useState<LaserState[]>([]);
  const [enemyY, setEnemyY] = useState(0);
  const [enemyScale, setEnemyScale] = useState({ scaleX: 1, scaleY: 1 });
  const [numLasers, setNumLasers] = useState(1);
  const [wasHit, setWasHit] = useState(false);
  const [playerProjectiles, setPlayerProjectiles] = useState<PlayerProjectile[]>([]);
  const [hitCount, setHitCount] = useState(0);
  const [enemyWasHit, setEnemyWasHit] = useState(false);
  const [enemyGrowthLevel, setEnemyGrowthLevel] = useState(0);
  const enemyGrowthLevelRef = useRef(enemyGrowthLevel);
  const [animatedEnemyGrowthLevel, setAnimatedEnemyGrowthLevel] = useState(0); // Smoothly animated growth for rendering
  const [energy, setEnergy] = useState(0); // Energy bar (0-100) - fills on jump, drains on shoot
  const energyRef = useRef(energy); // Ref for immediate access in game loop
  const [canShoot, setCanShoot] = useState(false); // Player can shoot once energy reaches 100
  const [enemyHits, setEnemyHits] = useState(0); // Track enemy hits on player
  const [playerGrowthLevel, setPlayerGrowthLevel] = useState(0); // Track player growth from enemy hits
  const playerGrowthLevelRef = useRef(playerGrowthLevel); // Ref for immediate access in game loop
  const [animatedPlayerGrowthLevel, setAnimatedPlayerGrowthLevel] = useState(0); // Smoothly animated growth for rendering
  const [playerOuts, setPlayerOuts] = useState(0); // Track player outs (0-10)
  const [enemyOuts, setEnemyOuts] = useState(0); // Track enemy outs (0-10)
  const [shootGameOver, setShootGameOver] = useState(false); // Special game over when player reaches 10 outs

  // Game systems
  const playerPhysicsRef = useRef<PlayerPhysics | null>(null);
  const laserPhysicsRef = useRef<LaserPhysics | null>(null);
  const audioManagerRef = useRef<AudioManager | null>(null);
  const backgroundStarsRef = useRef<BackgroundStars | null>(null);
  const scrollingBackgroundRef = useRef<ScrollingBackground | null>(null);

  const scoreRef = useRef(0);
  const gameOverRef = useRef(false); // Immediate game over flag

  const dimensionsRef = useRef({
    width: window.innerWidth,
    height: window.innerHeight,
    centerY: window.innerHeight * FLOOR_Y_POSITION - HITBOX_SIZE / 2,
    playerStartX: window.innerWidth * PLAYER_X_POSITION - BALL_SIZE / 2,
    enemyX: window.innerWidth * ENEMY_X_POSITION - BALL_SIZE,
  });

  // Initialize
  useEffect(() => {
    const dims = dimensionsRef.current;

    playerPhysicsRef.current = new PlayerPhysics(
      dims.playerStartX,
      dims.centerY,
      dims.centerY
    );

    laserPhysicsRef.current = new LaserPhysics(
      dims.width,
      dims.height,
      dims.centerY,
      dims.enemyX
    );

    audioManagerRef.current = new AudioManager();
    const cleanupAudio = setupAudioUnlock(audioManagerRef.current);

    backgroundStarsRef.current = new BackgroundStars(dims.width, dims.height);
    scrollingBackgroundRef.current = new ScrollingBackground(BACKGROUND_IMAGE_PATH);

    setPlayerState(playerPhysicsRef.current.getState());
    setLasers(laserPhysicsRef.current.getLasers());
    setEnemyY(laserPhysicsRef.current.getEnemyY());

    return () => {
      cleanupAudio();
      audioManagerRef.current?.dispose();
    };
  }, []);

  // Update score display
  useEffect(() => {
    const interval = setInterval(() => {
      setScore(scoreRef.current);
    }, SCORE_UPDATE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Keep refs in sync with state
  useEffect(() => {
    enemyGrowthLevelRef.current = enemyGrowthLevel;
  }, [enemyGrowthLevel]);

  useEffect(() => {
    energyRef.current = energy;
  }, [energy]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const dims = dimensionsRef.current;
      dims.width = window.innerWidth;
      dims.height = window.innerHeight;
      dims.centerY = window.innerHeight * FLOOR_Y_POSITION - HITBOX_SIZE / 2;
      dims.playerStartX = window.innerWidth * PLAYER_X_POSITION - BALL_SIZE / 2;
      dims.enemyX = window.innerWidth * ENEMY_X_POSITION - BALL_SIZE;

      playerPhysicsRef.current?.updateCenterY(dims.centerY);
      laserPhysicsRef.current?.updateDimensions(dims.width, dims.height, dims.centerY, dims.enemyX);
      backgroundStarsRef.current?.updateDimensions(dims.width, dims.height);
      scrollingBackgroundRef.current?.updateDimensions(dims.width, dims.height);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Main game loop
  useEffect(() => {
    if (gameOver) return;
    let animationFrameId: number;

    const loop = () => {
      // Don't update anything if game is over
      if (gameOverRef.current) return;

      scrollingBackgroundRef.current?.update();
      backgroundStarsRef.current?.update();
      laserPhysicsRef.current?.updateLaserCount(scoreRef.current);
      setNumLasers(laserPhysicsRef.current?.getNumLasers() || 1);

      const newPlayerState = playerPhysicsRef.current?.update();
      if (newPlayerState) {
        // NOTE: Player growth scaling disabled to preserve bounce animation
        // const growthScale = 1 + (playerGrowthLevelRef.current * 0.25);
        // newPlayerState.scaleX = growthScale;
        // newPlayerState.scaleY = growthScale;

        setPlayerState(newPlayerState);
        if (playerPhysicsRef.current?.shouldPlayBounceSound()) {
          const volume = playerPhysicsRef.current.getBounceVolume();
          audioManagerRef.current?.playBounce(volume);
        }
      }

      // Smoothly interpolate animated growth levels towards target growth levels
      setAnimatedPlayerGrowthLevel(prev => {
        const target = playerGrowthLevelRef.current;
        const diff = target - prev;
        // Smooth lerp with 0.1 factor - completes in ~0.65s
        return Math.abs(diff) < 0.01 ? target : prev + diff * 0.1;
      });

      setAnimatedEnemyGrowthLevel(prev => {
        const target = enemyGrowthLevelRef.current;
        const diff = target - prev;
        // Smooth lerp with 0.1 factor - completes in ~0.65s
        return Math.abs(diff) < 0.01 ? target : prev + diff * 0.1;
      });

      const laserUpdate = laserPhysicsRef.current?.update(
        scoreRef.current,
        newPlayerState?.position || { x: 0, y: 0 },
        playerPhysicsRef.current?.hasPlayerJumped() || false
      );

      if (laserUpdate && laserPhysicsRef.current) {
        const previousScore = scoreRef.current;
        scoreRef.current += laserUpdate.scoreChange;

        // Add energy for each laser jumped over (1 point = 1 energy)
        if (laserUpdate.scoreChange > 0) {
          setEnergy(prev => {
            const newEnergy = Math.min(100, prev + laserUpdate.scoreChange);
            // Unlock shooting once energy reaches 100 for the first time
            if (newEnergy >= 100 && !canShoot) {
              setCanShoot(true);
            }
            return newEnergy;
          });
        }

        if (laserUpdate.wasHit) {
          setWasHit(true);
          audioManagerRef.current?.playLaserHit();
          setTimeout(() => setWasHit(false), 250);
        }

        // Handle enemy hits on player (always active, not level-based)
        if (laserUpdate.enemyHitCount > 0) {
          setEnemyHits((prev) => {
            const newHits = prev + laserUpdate.enemyHitCount;

            // Check if we hit 20 (one cycle complete)
            if (newHits >= HITS_PER_OUT) {
              // Award an out to the enemy
              setEnemyOuts((prevOuts) => {
                const newOuts = prevOuts + Math.floor(newHits / HITS_PER_OUT);

                // Check for "Shoot!" game over when enemy reaches 10 outs
                if (newOuts >= MAX_OUTS) {
                  gameOverRef.current = true; // Immediately stop game loop
                  setShootGameOver(true);
                  setGameOver(true);
                }

                return Math.min(newOuts, MAX_OUTS);
              });

              // Player grows when enemy completes a cycle (every 20 hits)
              const completedCycles = Math.floor(newHits / HITS_PER_OUT);
              setPlayerGrowthLevel((prevGrowth) => {
                const newGrowth = prevGrowth + completedCycles;
                // Cap at MAX_GROWTH_CYCLES, then reset to 0
                const finalGrowth = newGrowth >= MAX_GROWTH_CYCLES ? 0 : newGrowth;
                playerGrowthLevelRef.current = finalGrowth; // Update ref immediately
                return finalGrowth;
              });

              // Reset hits counter after awarding the out
              return newHits % HITS_PER_OUT;
            }

            return newHits;
          });
        }

        setEnemyY(laserPhysicsRef.current.getEnemyY());
        setLasers(laserPhysicsRef.current.getLasers());
      }

      // Handle projectiles & enemy hits (only when player can shoot)
      if (canShoot && energyRef.current > 0) {
        setPlayerProjectiles((prev) =>
          prev
            .map((projectile) => {
              if (!projectile.active) return projectile;

              const newX = projectile.x + PLAYER_PROJECTILE_SPEED;
              const dims = dimensionsRef.current;
              const currentEnemyWidth = BALL_SIZE + (enemyGrowthLevelRef.current * ENEMY_WIDTH_GROWTH_PER_CYCLE);
              const currentEnemyHeight = BALL_SIZE + (enemyGrowthLevelRef.current * ENEMY_HEIGHT_GROWTH_PER_CYCLE);
              const enemyCurrentY = laserPhysicsRef.current?.getEnemyY() || 0;

              const hitEnemy =
                newX + PLAYER_PROJECTILE_WIDTH > dims.enemyX &&
                newX < dims.enemyX + currentEnemyWidth &&
                projectile.y + PLAYER_PROJECTILE_HEIGHT > enemyCurrentY &&
                projectile.y < enemyCurrentY + currentEnemyHeight;

              if (hitEnemy) {
                setHitCount((prevHit) => {
                  const newHitCount = prevHit + 1;

                  // Check if we hit 20 (one cycle complete)
                  if (newHitCount >= HITS_PER_OUT) {
                    // Award an out to the player
                    setPlayerOuts((prevOuts) => {
                      const newOuts = prevOuts + Math.floor(newHitCount / HITS_PER_OUT);

                      // Check for "Shoot!" game over
                      if (newOuts >= MAX_OUTS) {
                        gameOverRef.current = true; // Immediately stop game loop
                        setShootGameOver(true);
                        setGameOver(true);
                      }

                      return Math.min(newOuts, MAX_OUTS);
                    });

                    // Enemy grows when player completes a cycle (every 20 hits)
                    const completedCycles = Math.floor(newHitCount / HITS_PER_OUT);
                    setEnemyGrowthLevel((prevGrowth) => {
                      const newGrowth = prevGrowth + completedCycles;
                      enemyGrowthLevelRef.current = newGrowth >= MAX_GROWTH_CYCLES ? 0 : newGrowth;
                      laserPhysicsRef.current?.setEnemyGrowthLevel(enemyGrowthLevelRef.current);
                      // Cap at MAX_GROWTH_CYCLES, then reset to 0
                      return enemyGrowthLevelRef.current;
                    });

                    // Reset hits counter after awarding the out
                    return newHitCount % HITS_PER_OUT;
                  }

                  return newHitCount;
                });
                setEnemyWasHit(true);
                audioManagerRef.current?.playLaserHit();
                setTimeout(() => setEnemyWasHit(false), 250);
                return { ...projectile, active: false };
              }

              if (newX > dims.width) return { ...projectile, active: false };
              return { ...projectile, x: newX };
            })
            .filter((p) => p.active)
        );
      }

      // ✅ Pass updated growth level to physics FIRST
      laserPhysicsRef.current?.setEnemyGrowthLevel(enemyGrowthLevelRef.current);

      // ✅ Now get updated scale that includes squash animation
      const newScale = laserPhysicsRef.current?.getEnemyScale() || { scaleX: 1, scaleY: 1 };
      setEnemyScale(newScale);

      if (scoreRef.current < 0) {
        gameOverRef.current = true; // Immediately stop game loop
        setGameOver(true);
        return;
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameOver]);

  // Jump handlers
  const handleJumpStart = useCallback(() => {
    if (gameOver) return;
    audioManagerRef.current?.initialize();
    audioManagerRef.current?.playJumpSound();
    playerPhysicsRef.current?.startJump();
  }, [gameOver]);

  const handleJumpEnd = useCallback(() => {
    if (gameOver) return;
    playerPhysicsRef.current?.endJump();
    audioManagerRef.current?.resetJumpSound();
  }, [gameOver]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (gameOver) return;
    const dims = dimensionsRef.current;
    playerPhysicsRef.current?.setMousePosition(event.clientX, dims.width);
  }, [gameOver]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (gameOver) return;
    if (event.touches.length > 0) {
      const dims = dimensionsRef.current;
      const touch = event.touches[0];
      playerPhysicsRef.current?.setMousePosition(touch.clientX, dims.width);
    }
  }, [gameOver]);

  const handleShoot = useCallback(() => {
    if (gameOver || !canShoot || energyRef.current <= 0) return; // Can only shoot if canShoot is true and energy > 0
    const currentPlayerState = playerPhysicsRef.current?.getState();
    if (!currentPlayerState) return;

    // Calculate shoot speed based on energy level
    const energyLevel = energyRef.current;
    const shootDelay = energyLevel < 50 ? 300 : 150; // Half speed if energy < 50%

    // Drain energy when shooting
    setEnergy(prev => Math.max(0, prev - 1)); // Drain 1 energy per shot

    const newProjectile: PlayerProjectile = {
      x: currentPlayerState.position.x + BALL_SIZE / 2,
      y: currentPlayerState.position.y + BALL_SIZE / 2 - PLAYER_PROJECTILE_HEIGHT / 2,
      active: true,
    };

    setPlayerProjectiles((prev) => [...prev, newProjectile]);
  }, [gameOver, canShoot]);

  const handleTestScore = useCallback(() => {
    scoreRef.current += 75;
    laserPhysicsRef.current?.setScore(scoreRef.current);
  }, []);

  const handleRestart = useCallback(() => {
    const dims = dimensionsRef.current;
    scoreRef.current = 0;
    gameOverRef.current = false; // Reset game over flag
    setScore(0);
    playerPhysicsRef.current?.reset(dims.playerStartX, dims.centerY);
    laserPhysicsRef.current?.reset();
    backgroundStarsRef.current?.reset();
    scrollingBackgroundRef.current?.reset();
    setPlayerState(playerPhysicsRef.current?.getState() || playerState);
    setLasers(laserPhysicsRef.current?.getLasers() || []);
    setEnemyY(laserPhysicsRef.current?.getEnemyY() || dims.centerY);
    setNumLasers(1);
    setGameOver(false);
    setWasHit(false);
    setEnemyWasHit(false);
    setPlayerProjectiles([]);
    setHitCount(0);
    setEnemyGrowthLevel(0);
    setAnimatedEnemyGrowthLevel(0); // Reset animated growth
    setEnemyHits(0);
    setPlayerGrowthLevel(0);
    setAnimatedPlayerGrowthLevel(0); // Reset animated growth
    playerGrowthLevelRef.current = 0; // Reset ref immediately
    setPlayerOuts(0);
    setEnemyOuts(0);
    setShootGameOver(false);
    setEnergy(0); // Reset energy bar
    setCanShoot(false); // Reset shooting ability
  }, [playerState]);

  // Test function to fill energy and unlock shooting
  const testEnergy = useCallback(() => {
    setEnergy(100);
    setCanShoot(true);
  }, []);

  return {
    score,
    gameOver,
    hitCount,
    enemyWasHit,
    playerState,
    lasers,
    enemyY,
    enemyScale,
    numLasers,
    wasHit,
    playerProjectiles,
    energy,
    canShoot,
    enemyHits,
    playerOuts,
    enemyOuts,
    shootGameOver,
    playerGrowthLevel: animatedPlayerGrowthLevel, // Export animated growth for smooth rendering
    enemyGrowthLevel: animatedEnemyGrowthLevel, // Export animated growth for smooth rendering
    dimensions: dimensionsRef.current,
    backgroundStars: backgroundStarsRef.current,
    scrollingBackground: scrollingBackgroundRef.current,
    handleJumpStart,
    handleJumpEnd,
    handleMouseMove,
    handleTouchMove,
    handleShoot,
    handleRestart,
    handleTestScore,
    testEnergy, // Test function to unlock shooting
  };
};
