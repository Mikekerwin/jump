/**
 * useGameLoop Hook
 *
 * Main game loop that orchestrates all game systems
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { PlayerPhysics } from '../systems/playerPhysics';
import { LaserPhysics } from '../systems/laserPhysics';
import { EnemyPhysics } from '../systems/enemyPhysics';
import { AudioManager, setupAudioUnlock } from '../systems/audioManager';
import { BackgroundStars } from '../systems/backgroundStars';
import { StaticBackground } from '../systems/staticBackground';
import { ScrollingBackground } from '../systems/scrollingBackground';
import { TransitioningGround } from '../systems/transitioningGround';
import { GradientOverlay } from '../systems/gradientOverlay';
import { PlayerState, LaserState, PlayerProjectile } from '../types/game';
import {
  PLAYER_X_POSITION,
  ENEMY_X_POSITION,
  SCORE_UPDATE_INTERVAL,
  PLAYER_PROJECTILE_SPEED,
  PLAYER_PROJECTILE_WIDTH,
  PLAYER_PROJECTILE_HEIGHT,
  MAX_OUTS,
  HITS_PER_OUT,
  CLOUD_SKY_IMAGE_PATH,
  CLOUD_GROUND_IMAGE_PATH,
  TRANSITION_GROUND_IMAGE_PATH,
  FOREST_TREES_IMAGE_PATH,
  FOREST_GROUND_IMAGE_PATH,
  GROUND_HEIGHT_EXTENSION_PERCENT,
  MAX_GROWTH_LEVELS,
  GROWTH_SCALE_PER_LEVEL,
  INTRO_ANIMATION_DELAY,
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
  const [animatedEnemyGrowthLevel, setAnimatedEnemyGrowthLevel] = useState(0);
  const [energy, setEnergy] = useState(0);
  const energyRef = useRef(energy);
  const [canShoot, setCanShoot] = useState(false);
  const canShootRef = useRef(canShoot);
  const lastShootTimeRef = useRef(0);
  const [enemyHits, setEnemyHits] = useState(0);
  const [playerGrowthLevel, setPlayerGrowthLevel] = useState(0);
  const playerGrowthLevelRef = useRef(playerGrowthLevel);
  const [animatedPlayerGrowthLevel, setAnimatedPlayerGrowthLevel] = useState(0);
  const [playerOuts, setPlayerOuts] = useState(0);
  const [enemyOuts, setEnemyOuts] = useState(0);
  const [shootGameOver, setShootGameOver] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Game systems
  const playerPhysicsRef = useRef<PlayerPhysics | null>(null);
  const laserPhysicsRef = useRef<LaserPhysics | null>(null);
  const enemyPhysicsRef = useRef<EnemyPhysics | null>(null);
  const audioManagerRef = useRef<AudioManager | null>(null);
  const backgroundStarsRef = useRef<BackgroundStars | null>(null);
  const staticCloudSkyRef = useRef<StaticBackground | null>(null);
  const forestTreesBackgroundRef = useRef<ScrollingBackground | null>(null);
  const transitioningGroundRef = useRef<TransitioningGround | null>(null);
  const gradientOverlayRef = useRef<GradientOverlay | null>(null);

  const introAnimationStartedRef = useRef(false);

  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);
  const playerHitsRef = useRef(0);
  const enemyHitsRef = useRef(0);

  const calculateDimensions = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const responsiveBallSize = calculateResponsiveBallSize(width, height);
    const responsiveHitboxSize = responsiveBallSize + 20;
    const horizontalRanges = calculateHorizontalRanges(width);
    const laserSize = calculateResponsiveLaserSize(responsiveBallSize);
    const responsiveFloorPosition = calculateResponsiveFloorPosition(width, height);
    const physics = calculateResponsivePhysics(height);
    const groundOffset = height * GROUND_HEIGHT_EXTENSION_PERCENT;
    const centerY = (height * responsiveFloorPosition + groundOffset) - responsiveHitboxSize / 2;
    const floorY = centerY + responsiveBallSize / 2;

    return {
      width,
      height,
      groundOffset,
      ballSize: responsiveBallSize,
      hitboxSize: responsiveHitboxSize,
      centerY,
      floorY,
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

    // Initialize enemy physics for intro animation
    enemyPhysicsRef.current = new EnemyPhysics(
      dims.enemyX,
      dims.centerY,
      dims.centerY,
      dims.physics.gravity,
      dims.physics.boost,
      dims.physics.holdBoost,
      dims.physics.energyLoss,
      dims.physics.maxHoldTime,
      0.5 // minBounceVelocity
    );

    // Start intro animation 2 seconds after game initializes
    setTimeout(() => {
      if (!introAnimationStartedRef.current && enemyPhysicsRef.current) {
        introAnimationStartedRef.current = true;
        enemyPhysicsRef.current.startJumpSequence();
      }
    }, INTRO_ANIMATION_DELAY);

    audioManagerRef.current = new AudioManager();
    const cleanupAudio = setupAudioUnlock(audioManagerRef.current);

    backgroundStarsRef.current = new BackgroundStars(dims.width, dims.height);
    staticCloudSkyRef.current = new StaticBackground(CLOUD_SKY_IMAGE_PATH);
    forestTreesBackgroundRef.current = new ScrollingBackground(FOREST_TREES_IMAGE_PATH, false);
    transitioningGroundRef.current = new TransitioningGround(CLOUD_GROUND_IMAGE_PATH, TRANSITION_GROUND_IMAGE_PATH, FOREST_GROUND_IMAGE_PATH);
    gradientOverlayRef.current = new GradientOverlay();

    setPlayerState(playerPhysicsRef.current.getState());
    setLasers(laserPhysicsRef.current.getLasers());
    setEnemyY(laserPhysicsRef.current.getEnemyY());

    return () => {
      cleanupAudio();
      audioManagerRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setScore(scoreRef.current);
    }, SCORE_UPDATE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    enemyGrowthLevelRef.current = enemyGrowthLevel;
  }, [enemyGrowthLevel]);

  useEffect(() => {
    energyRef.current = energy;
  }, [energy]);

  useEffect(() => {
    canShootRef.current = canShoot;
  }, [canShoot]);


  useEffect(() => {
    const handleResize = () => {
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
      transitioningGroundRef.current?.updateDimensions(dims.width, dims.height);
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleResize);
    };
  }, []);

  useEffect(() => {
    if (gameOver) return;
    let animationFrameId: number;

    const loop = () => {
      if (gameOverRef.current) return;

      if (scoreRef.current >= 100) {
        forestTreesBackgroundRef.current?.update();
      }
      transitioningGroundRef.current?.update(scoreRef.current);
      backgroundStarsRef.current?.update();
      laserPhysicsRef.current?.updateLaserCount(scoreRef.current);
      setNumLasers(laserPhysicsRef.current?.getNumLasers() || 1);

      const newPlayerState = playerPhysicsRef.current?.update();
      if (newPlayerState) {
        setPlayerState(newPlayerState);
        if (playerPhysicsRef.current?.shouldPlayBounceSound()) {
          const volume = playerPhysicsRef.current.getBounceVolume();
          audioManagerRef.current?.playBounce(volume);
        }
      }

      // Update enemy physics during intro animation
      if (enemyPhysicsRef.current && !enemyPhysicsRef.current.isHoverMode()) {
        const enemyState = enemyPhysicsRef.current.update();

        // Check if enemy is ready to transition to hover
        if (enemyPhysicsRef.current.isReadyForHover()) {
          const velocity = enemyPhysicsRef.current.enableHoverMode();
          const currentY = enemyPhysicsRef.current.getY();
          laserPhysicsRef.current?.startHoverWithVelocity(velocity, currentY);
        }

        // Update enemy Y position and scale from physics
        setEnemyY(enemyState.position.y);
        setEnemyScale({ scaleX: enemyState.scaleX, scaleY: enemyState.scaleY });
      }

      setAnimatedPlayerGrowthLevel(prev => {
        const target = playerGrowthLevelRef.current;
        const diff = target - prev;
        return Math.abs(diff) < 0.01 ? target : prev + diff * 0.1;
      });

      setAnimatedEnemyGrowthLevel(prev => {
        const target = enemyGrowthLevelRef.current;
        const diff = target - prev;
        return Math.abs(diff) < 0.01 ? target : prev + diff * 0.1;
      });

      const laserUpdate = laserPhysicsRef.current?.update(
        scoreRef.current,
        newPlayerState?.position || { x: 0, y: 0 },
        playerPhysicsRef.current?.hasPlayerJumped() || false,
        playerGrowthLevelRef.current
      );

      if (laserUpdate && laserPhysicsRef.current) {
        if (laserUpdate.scoreChange > 0) {
          scoreRef.current += laserUpdate.scoreChange;
          if (!canShootRef.current) {
            setEnergy(Math.min(100, scoreRef.current));
          } else {
            setEnergy(prev => Math.min(100, prev + 2));
          }
          if (scoreRef.current >= 100 && !canShootRef.current) {
            setCanShoot(true);
          }
        }

        if (laserUpdate.wasHit) {
          setWasHit(true);
          audioManagerRef.current?.playLaserHit();
          setTimeout(() => setWasHit(false), 250);
        }

        if (laserUpdate.enemyHitCount > 0) {
          enemyHitsRef.current += laserUpdate.enemyHitCount;
          const currentEnemyHits = enemyHitsRef.current;
          if (currentEnemyHits >= HITS_PER_OUT) {
            enemyHitsRef.current = currentEnemyHits % HITS_PER_OUT;
            setEnemyOuts(prev => {
              const newOuts = prev + 1;
              if (newOuts >= MAX_OUTS) {
                gameOverRef.current = true;
                setGameOver(true);
              }
              return Math.min(newOuts, MAX_OUTS);
            });
            setPlayerGrowthLevel(prev => Math.min(prev + 1, MAX_GROWTH_LEVELS));
            setEnemyGrowthLevel(prev => {
              const newGrowth = Math.max(prev - 1, 0);
              laserPhysicsRef.current?.setEnemyGrowthLevel(newGrowth);
              return newGrowth;
            });
          }
          setEnemyHits(enemyHitsRef.current);
        }

        // Only update enemyY from LaserPhysics if we're in hover mode
        // (during intro animation, EnemyPhysics controls the position)
        if (enemyPhysicsRef.current?.isHoverMode()) {
          setEnemyY(laserPhysicsRef.current.getEnemyY());
          setEnemyScale(laserPhysicsRef.current.getEnemyScale());
        }
        setLasers(laserPhysicsRef.current.getLasers());
      }

      if (canShootRef.current) {
        let hitRegisteredThisFrame = false;
        setPlayerProjectiles(prev =>
          prev
            .map(projectile => {
              if (!projectile.active) return projectile;
              const newX = projectile.x + PLAYER_PROJECTILE_SPEED;
              const dims = dimensionsRef.current;
              const enemyGrowthScale = 1 + enemyGrowthLevelRef.current * GROWTH_SCALE_PER_LEVEL;
              const currentEnemyWidth = dims.ballSize * enemyGrowthScale;
              const currentEnemyHeight = dims.ballSize * enemyGrowthScale;
              const enemyCurrentY = laserPhysicsRef.current?.getEnemyY() || 0;

              const hitEnemy =
                newX + PLAYER_PROJECTILE_WIDTH > dims.enemyX &&
                newX < dims.enemyX + currentEnemyWidth &&
                projectile.y + PLAYER_PROJECTILE_HEIGHT > enemyCurrentY &&
                projectile.y < enemyCurrentY + currentEnemyHeight;

              if (hitEnemy && !projectile.hasHitEnemy) {
                setEnemyWasHit(true);
                setTimeout(() => setEnemyWasHit(false), 250);
                audioManagerRef.current?.playLaserHit();

                if (!hitRegisteredThisFrame) {
                  playerHitsRef.current += 1;
                  setHitCount(playerHitsRef.current);
                  const currentPlayerHits = playerHitsRef.current;
                  if (currentPlayerHits >= HITS_PER_OUT) {
                    playerHitsRef.current = currentPlayerHits % HITS_PER_OUT;
                    setEnemyOuts(prev => {
                      const newOuts = prev + 1;
                      if (newOuts >= MAX_OUTS) {
                        gameOverRef.current = true;
                        setShootGameOver(true);
                        setGameOver(true);
                      }
                      return Math.min(newOuts, MAX_OUTS);
                    });
                    setEnemyGrowthLevel(prev => {
                      const newGrowth = Math.min(prev + 1, MAX_GROWTH_LEVELS);
                      laserPhysicsRef.current?.setEnemyGrowthLevel(newGrowth);
                      return newGrowth;
                    });
                    setPlayerGrowthLevel(prev => Math.min(prev + 1, MAX_GROWTH_LEVELS));
                  }
                  hitRegisteredThisFrame = true;
                }
                return { ...projectile, x: -1000, active: false, hasHitEnemy: true };
              }

              if (newX > dims.width) return { ...projectile, active: false };
              return { ...projectile, x: newX };
            })
            .filter(p => p.active)
        );
      }

      laserPhysicsRef.current?.setEnemyGrowthLevel(enemyGrowthLevelRef.current);
      // Only update enemy scale from LaserPhysics if in hover mode
      if (enemyPhysicsRef.current?.isHoverMode()) {
        const newScale = laserPhysicsRef.current?.getEnemyScale() || { scaleX: 1, scaleY: 1 };
        setEnemyScale(newScale);
      }

      if (scoreRef.current < 0) {
        gameOverRef.current = true;
        setGameOver(true);
        return;
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameOver]);

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
    if (gameOver || !canShoot || energyRef.current <= 0) return;

    const now = performance.now();
    const currentEnergy = energyRef.current;

    let shootCooldown;
    if (currentEnergy >= 80) {
      shootCooldown = MAX_SHOOT_SPEED;
    } else if (currentEnergy <= 20) {
      shootCooldown = MIN_SHOOT_SPEED;
    } else {
      const energyRange = 80 - 20;
      const cooldownRange = MIN_SHOOT_SPEED - MAX_SHOOT_SPEED;
      const energyRatio = (currentEnergy - 20) / energyRange;
      shootCooldown = MIN_SHOOT_SPEED - (energyRatio * cooldownRange);
    }

    if (now - lastShootTimeRef.current < shootCooldown) {
      return;
    }

    const currentPlayerState = playerPhysicsRef.current?.getState();
    if (!currentPlayerState) return;

    setEnergy(prev => Math.max(0, prev - 0.5));
    lastShootTimeRef.current = now;

    const dims = dimensionsRef.current;
    const newProjectile: PlayerProjectile = {
      x: currentPlayerState.position.x + dims.ballSize / 2,
      y: currentPlayerState.position.y + dims.ballSize / 2 - PLAYER_PROJECTILE_HEIGHT / 2,
      active: true,
      hasHitEnemy: false,
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
    gameOverRef.current = false;
    setScore(0);
    playerPhysicsRef.current?.reset(dims.playerStartX, dims.centerY);
    laserPhysicsRef.current?.reset();
    enemyPhysicsRef.current?.reset(dims.centerY);
    introAnimationStartedRef.current = false; // Allow intro animation to play again
    backgroundStarsRef.current?.reset();
    forestTreesBackgroundRef.current?.reset();
    transitioningGroundRef.current?.reset();
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
    setAnimatedEnemyGrowthLevel(0);
    setEnemyHits(0);
    setPlayerGrowthLevel(0);
    setAnimatedPlayerGrowthLevel(0);
    playerGrowthLevelRef.current = 0;
    setPlayerOuts(0);
    setEnemyOuts(0);
    setShootGameOver(false);
    setEnergy(0);
    setCanShoot(false);
  }, [playerState]);

  const testEnergy = useCallback(() => {
    scoreRef.current = 100;
    setScore(100);
    setEnergy(100);
    setCanShoot(true);
    laserPhysicsRef.current?.setScore(100);
  }, []);

  const handleToggleSound = useCallback(() => {
    const newMutedState = audioManagerRef.current?.toggleMute();
    setIsMuted(newMutedState ?? false);
  }, []);

  return {
    score,
    gameOver,
    hitCount,
    enemyHits,
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
    playerGrowthLevel: animatedPlayerGrowthLevel,
    enemyGrowthLevel: animatedEnemyGrowthLevel,
    dimensions: dimensionsRef.current,
    backgroundStars: backgroundStarsRef.current,
    staticCloudSky: staticCloudSkyRef.current,
    forestTreesBackground: forestTreesBackgroundRef.current,
    transitioningGround: transitioningGroundRef.current,
    gradientOverlay: gradientOverlayRef.current,
    isMuted,
    handleJumpStart,
    handleJumpEnd,
    handleMouseMove,
    handleTouchMove,
    handleShoot,
    handleRestart,
    handleTestScore,
    handleToggleSound,
    testEnergy,
  };
};
