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
import { ScrollingGround } from '../systems/scrollingGround';
import { PlayerState, LaserState, PlayerProjectile } from '../types/game';
import {
  PLAYER_X_POSITION,
  ENEMY_X_POSITION,
  SCORE_UPDATE_INTERVAL,
  PLAYER_PROJECTILE_SPEED,
  PLAYER_PROJECTILE_WIDTH,
  PLAYER_PROJECTILE_HEIGHT,
  ENEMY_WIDTH_GROWTH_PER_CYCLE,
  ENEMY_HEIGHT_GROWTH_PER_CYCLE,
  MAX_OUTS,
  HITS_PER_OUT,
  BACKGROUND_IMAGE_PATH,
  GROUND_IMAGE_PATH,
  MAX_GROWTH_LEVELS,
  calculateResponsiveBallSize,
  calculateHorizontalRanges,
  calculateResponsiveLaserSize,
  calculateResponsiveFloorPosition,
  calculateResponsivePhysics,
} from '../config/gameConfig';

// Shooting speed configuration (in milliseconds)
const MAX_SHOOT_SPEED = 25;  // Fastest shooting rate at 80% energy or above
const MIN_SHOOT_SPEED = 350; // Slowest shooting rate at 20% energy or below

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
  const canShootRef = useRef(canShoot); // Ref for immediate access in game loop
  const lastShootTimeRef = useRef(0); // Track last shoot time for rate limiting
  const [enemyHits, setEnemyHits] = useState(0); // Track enemy hits on player
  const [playerGrowthLevel, setPlayerGrowthLevel] = useState(0); // Track player growth from enemy hits
  const playerGrowthLevelRef = useRef(playerGrowthLevel); // Ref for immediate access in game loop
  const [animatedPlayerGrowthLevel, setAnimatedPlayerGrowthLevel] = useState(0); // Smoothly animated growth for rendering
  const [playerOuts, setPlayerOuts] = useState(0); // Track player outs (0-10)
  const [enemyOuts, setEnemyOuts] = useState(0); // Track enemy outs (0-10)
  const [shootGameOver, setShootGameOver] = useState(false); // Special game over when player reaches 10 outs
  const [isMuted, setIsMuted] = useState(false); // Track sound mute state

  // Game systems
  const playerPhysicsRef = useRef<PlayerPhysics | null>(null);
  const laserPhysicsRef = useRef<LaserPhysics | null>(null);
  const audioManagerRef = useRef<AudioManager | null>(null);
  const backgroundStarsRef = useRef<BackgroundStars | null>(null);
  const scrollingBackgroundRef = useRef<ScrollingBackground | null>(null);
  const scrollingGroundRef = useRef<ScrollingGround | null>(null);

  const scoreRef = useRef(0);
  const gameOverRef = useRef(false); // Immediate game over flag

  // Calculate responsive dimensions
  const calculateDimensions = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const responsiveBallSize = calculateResponsiveBallSize(width, height);
    const responsiveHitboxSize = responsiveBallSize + 20;
    const horizontalRanges = calculateHorizontalRanges(width);
    const laserSize = calculateResponsiveLaserSize(responsiveBallSize);
    const responsiveFloorPosition = calculateResponsiveFloorPosition(width, height);
    const physics = calculateResponsivePhysics(height);

    return {
      width,
      height,
      ballSize: responsiveBallSize,
      hitboxSize: responsiveHitboxSize,
      centerY: height * responsiveFloorPosition - responsiveHitboxSize / 2,
      playerStartX: width * PLAYER_X_POSITION - responsiveBallSize / 2,
      enemyX: width * ENEMY_X_POSITION - responsiveBallSize,
      horizontalRangeLeft: horizontalRanges.left,
      horizontalRangeRight: horizontalRanges.right,
      laserWidth: laserSize.width,
      laserHeight: laserSize.height,
      physics,
    };
  };

  const dimensionsRef = useRef(calculateDimensions());

  // Initialize
  useEffect(() => {
    const dims = dimensionsRef.current;

    playerPhysicsRef.current = new PlayerPhysics(
      dims.playerStartX,
      dims.centerY,
      dims.centerY
    );
    playerPhysicsRef.current.updateHorizontalRanges(dims.horizontalRangeLeft, dims.horizontalRangeRight);
    playerPhysicsRef.current.updatePhysics(
      dims.physics.gravity,
      dims.physics.boost,
      dims.physics.holdBoost,
      dims.physics.energyLoss,
      dims.physics.maxHoldTime
    );

    laserPhysicsRef.current = new LaserPhysics(
      dims.width,
      dims.height,
      dims.centerY,
      dims.enemyX
    );
    laserPhysicsRef.current.updateDimensions(
      dims.width,
      dims.height,
      dims.centerY,
      dims.enemyX,
      dims.ballSize,
      dims.laserWidth,
      dims.laserHeight
    );

    audioManagerRef.current = new AudioManager();
    const cleanupAudio = setupAudioUnlock(audioManagerRef.current);

    backgroundStarsRef.current = new BackgroundStars(dims.width, dims.height);
    scrollingBackgroundRef.current = new ScrollingBackground(BACKGROUND_IMAGE_PATH);
    scrollingGroundRef.current = new ScrollingGround(GROUND_IMAGE_PATH);

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

  useEffect(() => {
    canShootRef.current = canShoot;
  }, [canShoot]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      // Recalculate all responsive dimensions
      dimensionsRef.current = calculateDimensions();
      const dims = dimensionsRef.current;

      playerPhysicsRef.current?.updateCenterY(dims.centerY);
      playerPhysicsRef.current?.updateHorizontalRanges(dims.horizontalRangeLeft, dims.horizontalRangeRight);
      playerPhysicsRef.current?.updatePhysics(
        dims.physics.gravity,
        dims.physics.boost,
        dims.physics.holdBoost,
        dims.physics.energyLoss,
        dims.physics.maxHoldTime
      );
      laserPhysicsRef.current?.updateDimensions(
        dims.width,
        dims.height,
        dims.centerY,
        dims.enemyX,
        dims.ballSize,
        dims.laserWidth,
        dims.laserHeight
      );
      backgroundStarsRef.current?.updateDimensions(dims.width, dims.height);
      scrollingBackgroundRef.current?.updateDimensions(dims.width, dims.height);
      scrollingGroundRef.current?.updateDimensions(dims.width, dims.height);
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
      scrollingGroundRef.current?.update();
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
        // Only add positive score changes (jumping over lasers)
        if (laserUpdate.scoreChange > 0) {
          scoreRef.current += laserUpdate.scoreChange;

          // Before unlocking: energy = score (sync up to 100)
          // After unlocking: energy fills independently from jumping
          if (!canShootRef.current) {
            setEnergy(Math.min(100, scoreRef.current));
          } else {
            // After unlock, jumping fills energy by 1 per laser
            setEnergy(prev => Math.min(100, prev + 2));
          }

          // Unlock shooting once score reaches 100 for the first time
          if (scoreRef.current >= 100 && !canShootRef.current) {
            setCanShoot(true);
          }
        }
        // Remove penalty for not jumping - lasers can pass without score loss

        if (laserUpdate.wasHit) {
          setWasHit(true);
          audioManagerRef.current?.playLaserHit();
          setTimeout(() => setWasHit(false), 250);

          // Enemy scores when laser hits player
          setEnemyHits((prevEnemyHits) => {
            const newEnemyHits = prevEnemyHits + 1;

            // Check if enemy completes a cycle (20 hits)
            if (newEnemyHits >= HITS_PER_OUT) {
              // Award an out to the enemy
              setEnemyOuts((prevEnemyOuts) => {
                const newEnemyOuts = prevEnemyOuts + Math.floor(newEnemyHits / HITS_PER_OUT);

                // Check for enemy victory (10 outs)
                if (newEnemyOuts >= MAX_OUTS) {
                  gameOverRef.current = true; // Immediately stop game loop
                  setGameOver(true);
                }

                return Math.min(newEnemyOuts, MAX_OUTS);
              });

              // Player grows when enemy completes a cycle (every 20 hits on player)
              const completedCycles = Math.floor(newEnemyHits / HITS_PER_OUT);
              setPlayerGrowthLevel((prevGrowth) => {
                const newGrowth = Math.min(prevGrowth + completedCycles, MAX_GROWTH_LEVELS);
                playerGrowthLevelRef.current = newGrowth;
                return newGrowth;
              });

              // Enemy shrinks when they get an out (reward for hitting player 20 times)
              setEnemyGrowthLevel((prevGrowth) => {
                const newGrowth = Math.max(prevGrowth - completedCycles, 0);
                enemyGrowthLevelRef.current = newGrowth;
                laserPhysicsRef.current?.setEnemyGrowthLevel(enemyGrowthLevelRef.current);
                return newGrowth;
              });

              // Reset enemy hits counter after awarding the out
              return newEnemyHits % HITS_PER_OUT;
            }

            return newEnemyHits;
          });
        }

        setEnemyY(laserPhysicsRef.current.getEnemyY());
        setLasers(laserPhysicsRef.current.getLasers());
      }

      // Handle projectiles & enemy hits (once unlocked, projectiles always move)
      if (canShootRef.current) {
        let enemyHitThisFrame = false; // Track if enemy was hit this frame to prevent double counting

        setPlayerProjectiles((prev) =>
          prev
            .map((projectile) => {
              if (!projectile.active) return projectile;

              const newX = projectile.x + PLAYER_PROJECTILE_SPEED;
              const dims = dimensionsRef.current;
              const currentEnemyWidth = dims.ballSize + (enemyGrowthLevelRef.current * ENEMY_WIDTH_GROWTH_PER_CYCLE);
              const currentEnemyHeight = dims.ballSize + (enemyGrowthLevelRef.current * ENEMY_HEIGHT_GROWTH_PER_CYCLE);
              const enemyCurrentY = laserPhysicsRef.current?.getEnemyY() || 0;

              const hitEnemy =
                newX + PLAYER_PROJECTILE_WIDTH > dims.enemyX &&
                newX < dims.enemyX + currentEnemyWidth &&
                projectile.y + PLAYER_PROJECTILE_HEIGHT > enemyCurrentY &&
                projectile.y < enemyCurrentY + currentEnemyHeight;

              if (hitEnemy) {
                // Only count one hit per frame, even if multiple projectiles hit
                if (!enemyHitThisFrame) {
                  enemyHitThisFrame = true;
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
                        const newGrowth = Math.min(prevGrowth + completedCycles, MAX_GROWTH_LEVELS);
                        enemyGrowthLevelRef.current = newGrowth;
                        laserPhysicsRef.current?.setEnemyGrowthLevel(enemyGrowthLevelRef.current);
                        return newGrowth;
                      });

                      // Player shrinks when they get an out (reward for hitting enemy 20 times)
                      setPlayerGrowthLevel((prevGrowth) => {
                        const newGrowth = Math.max(prevGrowth - completedCycles, 0);
                        playerGrowthLevelRef.current = newGrowth;
                        return newGrowth;
                      });

                      // Reset hits counter after awarding the out
                      return newHitCount % HITS_PER_OUT;
                    }

                    return newHitCount;
                  });
                  setEnemyWasHit(true);
                  audioManagerRef.current?.playLaserHit();
                  setTimeout(() => setEnemyWasHit(false), 250);
                }
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

    const now = performance.now();
    const currentEnergy = energyRef.current;

    // Calculate shooting cooldown based on energy level
    // 80% energy or above: MAX_SHOOT_SPEED (fastest)
    // 20% energy or below: MIN_SHOOT_SPEED (slowest)
    // Linear interpolation between 80% and 20%
    let shootCooldown;
    if (currentEnergy >= 80) {
      shootCooldown = MAX_SHOOT_SPEED; // Max speed
    } else if (currentEnergy <= 20) {
      shootCooldown = MIN_SHOOT_SPEED; // Min speed
    } else {
      // Linear interpolation between 20% and 80%
      const energyRange = 80 - 20; // 60%
      const cooldownRange = MIN_SHOOT_SPEED - MAX_SHOOT_SPEED;
      const energyRatio = (currentEnergy - 20) / energyRange; // 0 to 1
      shootCooldown = MIN_SHOOT_SPEED - (energyRatio * cooldownRange);
    }

    // Check if enough time has passed since last shot
    if (now - lastShootTimeRef.current < shootCooldown) {
      return; // Too soon, can't shoot yet
    }

    const currentPlayerState = playerPhysicsRef.current?.getState();
    if (!currentPlayerState) return;

    // Drain energy by 1.5 when shooting (NOT score)
    setEnergy(prev => Math.max(0, prev - 0.5));
    lastShootTimeRef.current = now; // Update last shoot time

    const dims = dimensionsRef.current;
    const newProjectile: PlayerProjectile = {
      x: currentPlayerState.position.x + dims.ballSize / 2,
      y: currentPlayerState.position.y + dims.ballSize / 2 - PLAYER_PROJECTILE_HEIGHT / 2,
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
    scrollingGroundRef.current?.reset();
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
    scoreRef.current = 100;
    setScore(100);
    setEnergy(100);
    setCanShoot(true);
    laserPhysicsRef.current?.setScore(100);
  }, []);

  // Toggle sound mute
  const handleToggleSound = useCallback(() => {
    const newMutedState = audioManagerRef.current?.toggleMute();
    setIsMuted(newMutedState ?? false);
  }, []);

  return {
    score,
    gameOver,
    hitCount,
    enemyHits, // Add enemyHits to exports
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
    playerOuts,
    enemyOuts,
    shootGameOver,
    playerGrowthLevel: animatedPlayerGrowthLevel, // Export animated growth for smooth rendering
    enemyGrowthLevel: animatedEnemyGrowthLevel, // Export animated growth for smooth rendering
    dimensions: dimensionsRef.current,
    backgroundStars: backgroundStarsRef.current,
    scrollingBackground: scrollingBackgroundRef.current,
    scrollingGround: scrollingGroundRef.current,
    isMuted,
    handleJumpStart,
    handleJumpEnd,
    handleMouseMove,
    handleTouchMove,
    handleShoot,
    handleRestart,
    handleTestScore,
    handleToggleSound,
    testEnergy, // Test function to unlock shooting
  };
};
