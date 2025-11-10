/**
 * useGameLoop Hook
 *
 * Main game loop that orchestrates all game systems
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { PlayerPhysics } from '../systems/playerPhysics';
import { LaserPhysics } from '../systems/laserPhysics';
import { EnemyPhysics } from '../systems/enemyPhysics';
import { EnemyMovement } from '../systems/enemyMovement';
import { AudioManager, setupAudioUnlock } from '../systems/audioManager';
import { ForestDustField } from '../systems/forestDustField';
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
    BASE_LASER_SPEED,
    CLOUD_SKY_IMAGE_PATH,
    CLOUD_GROUND_IMAGE_PATH,
    TRANSITION_GROUND_IMAGE_PATH,
    FOREST_TRANSITION_IMAGE_PATH,
    FOREST_TREES_IMAGE_PATH,
    FOREST_GROUND_IMAGE_PATH,
    GROUND_HEIGHT_EXTENSION_PERCENT,
    MAX_GROWTH_LEVELS,
    GROWTH_SCALE_PER_LEVEL,
    INTRO_ANIMATION_DELAY,
    FOREST_UNLOCK_SCORE,
    FOREST_DUST_ENABLED,
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
  const [cumulativeScore, setCumulativeScore] = useState(0);
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
  const [enemyX, setEnemyX] = useState(0);
  const enemyXRef = useRef(0);
  const [isShaking, setIsShaking] = useState(false);
  const [impactAmount, setImpactAmount] = useState(0);
  const impactAmountRef = useRef(0);
  const impactPhaseRef = useRef(0);
  const impactAmplitudeRef = useRef(0);
  const impactCyclesRef = useRef(0);
  const [level, setLevel] = useState(1);
  const levelRef = useRef(1);
  const [controlsEnabled, setControlsEnabled] = useState(true);
  const isLevelTransitionRef = useRef(false);
  // 0 none, 1 roll-out, 2 reset, 3 camera pan right, 4 camera pan back, 5 enemy enter, 6 done
  const levelTransitionStageRef = useRef<0 | 1 | 2 | 3 | 4 | 5 | 6>(0);
  const levelTransitionDelayRef = useRef<number>(0);
  const levelTransitionStage1CompleteRef = useRef(false);
  const levelTransitionStage6StartRef = useRef<number>(0);
  const levelTransitionStage3StartRef = useRef<number>(0);
  const levelTransitionStage4StartRef = useRef<number>(0);
  const levelTransitionStage4ExecutedRef = useRef(false);
  const [levelOverlayVisible, setLevelOverlayVisible] = useState(false);
  const [levelOverlaySubtitle, setLevelOverlaySubtitle] = useState('');
  const [cameraX, setCameraX] = useState(0);
  const cameraXRef = useRef(0);

  // Enemy bounce mode state (for 4th, 7th, 10th outs)
  const [enemyInBounceMode, setEnemyInBounceMode] = useState(false);
  const [isTenthOut, setIsTenthOut] = useState(false);
  const enemyInBounceModeRef = useRef(false);
  const isTenthOutRef = useRef(false);
  const isFinalSequenceRef = useRef(false);
  const isReturningToRightRef = useRef(false);
  const nextChargeTimeRef = useRef<number>(0);
  const lastFinalCollisionTimeRef = useRef<number>(0);
  const chargeActiveRef = useRef(false);
  const chargeVelocityRef = useRef(0);

  // Game systems
  const playerPhysicsRef = useRef<PlayerPhysics | null>(null);
  const laserPhysicsRef = useRef<LaserPhysics | null>(null);
  const enemyPhysicsRef = useRef<EnemyPhysics | null>(null);
  const enemyMovementRef = useRef<EnemyMovement | null>(null);
  const audioManagerRef = useRef<AudioManager | null>(null);
  const staticCloudSkyRef = useRef<StaticBackground | null>(null);
  const forestTreesBackgroundRef = useRef<ScrollingBackground | null>(null);
  const transitioningGroundRef = useRef<TransitioningGround | null>(null);
  const gradientOverlayRef = useRef<GradientOverlay | null>(null);
  const forestDustFieldRef = useRef<ForestDustField | null>(null);
  const forestDustActiveRef = useRef(false);
  const forestUnlockedRef = useRef(false);

  const triggerForestDustReveal = useCallback(() => {
    if (!FOREST_DUST_ENABLED || forestDustActiveRef.current) return;
    forestDustFieldRef.current?.triggerReveal();
    forestDustActiveRef.current = true;
  }, []);

  const resetForestDust = useCallback(() => {
    if (!FOREST_DUST_ENABLED) return;
    forestDustFieldRef.current?.reset();
    forestDustActiveRef.current = false;
  }, []);

  const ensureForestBackgroundActive = useCallback(() => {
    forestTreesBackgroundRef.current?.startTransition();
    triggerForestDustReveal();
  }, [triggerForestDustReveal]);
  const groundPrewarmedRef = useRef(false);

  const introAnimationStartedRef = useRef(false);

  const scoreRef = useRef(0);
  const totalScoreRef = useRef(0);
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

    // Initialize enemy movement for hover mode
    enemyMovementRef.current = new EnemyMovement(dims.centerY);

    // Start intro animation 2 seconds after game initializes
    setTimeout(() => {
      if (!introAnimationStartedRef.current && enemyPhysicsRef.current) {
        introAnimationStartedRef.current = true;
        enemyPhysicsRef.current.startJumpSequence();
      }
    }, INTRO_ANIMATION_DELAY);

    audioManagerRef.current = new AudioManager();
    const cleanupAudio = setupAudioUnlock(audioManagerRef.current);

    staticCloudSkyRef.current = new StaticBackground(CLOUD_SKY_IMAGE_PATH);
    forestTreesBackgroundRef.current = new ScrollingBackground(FOREST_TREES_IMAGE_PATH, false, FOREST_TRANSITION_IMAGE_PATH);
    transitioningGroundRef.current = new TransitioningGround(CLOUD_GROUND_IMAGE_PATH, TRANSITION_GROUND_IMAGE_PATH, FOREST_GROUND_IMAGE_PATH);
    gradientOverlayRef.current = new GradientOverlay();
    console.log('[GameLoop] FOREST_DUST_ENABLED:', FOREST_DUST_ENABLED);
    if (FOREST_DUST_ENABLED) {
      console.log('[GameLoop] Creating ForestDustField with dimensions:', dims.width, 'x', dims.height);
      forestDustFieldRef.current = new ForestDustField(dims.width, dims.height);
      console.log('[GameLoop] ForestDustField created:', forestDustFieldRef.current);
      forestDustFieldRef.current.setRevealProgress(0);
      const warmDustReveal = () => {
        const dust = forestDustFieldRef.current;
        if (!dust) return;
        if (dust.isReady()) {
          dust.setRevealProgress(0.1);
        } else {
          requestAnimationFrame(warmDustReveal);
        }
      };
      requestAnimationFrame(warmDustReveal);
    } else {
      forestDustFieldRef.current = null;
    }

    // Prewarm ground caches once dimensions are known
    transitioningGroundRef.current.prewarm(dims.width, dims.height);
    forestTreesBackgroundRef.current.prewarm(dims.width, dims.height);

    setPlayerState(playerPhysicsRef.current.getState());
    setLasers(laserPhysicsRef.current.getLasers());
    setEnemyY(dims.centerY);
    setEnemyX(dims.enemyX);
    enemyXRef.current = dims.enemyX;

    return () => {
      cleanupAudio();
      audioManagerRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setScore(scoreRef.current);
      setCumulativeScore(totalScoreRef.current);
    }, SCORE_UPDATE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    enemyGrowthLevelRef.current = enemyGrowthLevel;
  }, [enemyGrowthLevel]);

  useEffect(() => {
    playerGrowthLevelRef.current = playerGrowthLevel;
  }, [playerGrowthLevel]);

  useEffect(() => {
    energyRef.current = energy;
  }, [energy]);

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  useEffect(() => {
    if (forestUnlockedRef.current) return;
    if (score >= FOREST_UNLOCK_SCORE) {
      console.log('[FOREST UNLOCK] Score:', score, 'Player state:', playerState);
      forestUnlockedRef.current = true;
      ensureForestBackgroundActive();
      console.log('[FOREST UNLOCK] After ensureForestBackgroundActive, Player state:', playerState);
    }
  }, [score, ensureForestBackgroundActive, playerState]);
  useEffect(() => {
    cameraXRef.current = cameraX;
  }, [cameraX]);

  useEffect(() => {
    enemyInBounceModeRef.current = enemyInBounceMode;
  }, [enemyInBounceMode]);

  useEffect(() => {
    isTenthOutRef.current = isTenthOut;
  }, [isTenthOut]);

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
      forestDustFieldRef.current?.updateDimensions(dims.width, dims.height);
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

      const dims = dimensionsRef.current;

      if (!forestDustActiveRef.current && forestTreesBackgroundRef.current?.hasStartedTransition()) {
        triggerForestDustReveal();
      }

      // Always update forest background; it renders only after transition starts
      forestTreesBackgroundRef.current?.update();
      transitioningGroundRef.current?.update(scoreRef.current);
      forestDustFieldRef.current?.update();
      // Only update reveal progress automatically during normal gameplay (not during level transitions)
      // During level transitions, reveal progress is managed manually
      if (!isLevelTransitionRef.current && forestTreesBackgroundRef.current && forestDustFieldRef.current) {
        const transitionProgress = forestTreesBackgroundRef.current.getTransitionProgress(dims.width, dims.height);
        forestDustFieldRef.current.setRevealProgress(transitionProgress);
      }

      // Check if forest background transition is visible and trigger dust reveal
      if (FOREST_DUST_ENABLED && !forestDustActiveRef.current && forestTreesBackgroundRef.current) {
        const dims = dimensionsRef.current;
        if (forestTreesBackgroundRef.current.isTransitionImageVisible(dims.width)) {
          triggerForestDustReveal();
        }
      }

      // Prewarm ground shortly before unlock if not yet done
      if (!groundPrewarmedRef.current && scoreRef.current >= 90) {
        const dimsPrewarm = dimensionsRef.current;
        transitioningGroundRef.current?.prewarm(dimsPrewarm.width, dimsPrewarm.height);
        forestTreesBackgroundRef.current?.prewarm(dimsPrewarm.width, dimsPrewarm.height);
        groundPrewarmedRef.current = true;
      }
      laserPhysicsRef.current?.updateLaserCount(scoreRef.current);
      setNumLasers(laserPhysicsRef.current?.getNumLasers() || 1);

      // Only update player physics if NOT in level transition (except Stage 1 rolling out)
      const shouldUpdatePlayerPhysics = !isLevelTransitionRef.current || levelTransitionStageRef.current === 1;
      const wasInTransition = isLevelTransitionRef.current && levelTransitionStageRef.current !== 1;
      let newPlayerState;

      if (shouldUpdatePlayerPhysics) {
        newPlayerState = playerPhysicsRef.current?.update();
        if (newPlayerState) {
          setPlayerState(newPlayerState);

          // Log when physics resumes after level transition
          if (wasInTransition && !isLevelTransitionRef.current) {
            console.log('[PHYSICS RESUMED] Player position after first update:', newPlayerState.position.x, newPlayerState.position.y);
          }

          if (playerPhysicsRef.current?.shouldPlayBounceSound()) {
            const volume = playerPhysicsRef.current.getBounceVolume();
            audioManagerRef.current?.playBounce(volume);
          }
        }
      } else {
        // During level transition (stages 2-6), just get the current state without updating physics
        newPlayerState = playerPhysicsRef.current?.getState();
        if (newPlayerState) {
          setPlayerState(newPlayerState);
        }
      }

      // Level transition: Stage 1 — roll player off-screen to the right
      if (isLevelTransitionRef.current && levelTransitionStageRef.current === 1 && playerPhysicsRef.current) {
        const cur = playerPhysicsRef.current.getState();
        const rollSpeed = 8;
        playerPhysicsRef.current.setX(cur.position.x + rollSpeed);
        const dims = dimensionsRef.current;
        if (cur.position.x > dims.width + dims.ballSize && !levelTransitionStage1CompleteRef.current) {
          // Player has rolled off screen - advance to Stage 2 ONCE and set delay timer
          levelTransitionStage1CompleteRef.current = true; // Prevent re-triggering
          levelTransitionDelayRef.current = performance.now() + 4000;
          levelTransitionStageRef.current = 2;
        }
      }

      // Update enemy physics during intro animation or bounce mode
      if (enemyPhysicsRef.current && !enemyPhysicsRef.current.isHoverMode()) {
        const enemyState = enemyPhysicsRef.current.update();

        // Check if enemy is ready to transition to hover (after intro animation ONLY, not during bounce mode)
        if (enemyPhysicsRef.current.isReadyForHover() && !enemyInBounceModeRef.current) {
          const velocity = enemyPhysicsRef.current.enableHoverMode();
          const currentY = enemyPhysicsRef.current.getY();
          enemyMovementRef.current?.startTransition(velocity, currentY);
        }

        // On 10th out: disable enemy when it hits the ground (no bounce, no shoot)
        if (isTenthOutRef.current &&
            !isFinalSequenceRef.current &&
            enemyState.position.y >= dimensionsRef.current.centerY - 1 &&
            Math.abs(enemyState.velocity) < 1) {
          enemyPhysicsRef.current.stopBouncing();
          isFinalSequenceRef.current = true;
        }

        // Check if enemy should exit bounce mode (after 4 jumps complete, on 5th jump at peak)
        // Skip this check on 10th out (enemy never returns to hover)
        // EnemyPhysics sets bounceModeActive=false after 4 jumps, we detect that here
        if (!isTenthOutRef.current &&
            enemyInBounceModeRef.current &&
            !enemyPhysicsRef.current.isBounceModeActive() &&
            enemyState.velocity < 0 &&
            enemyState.velocity > -2) { // Near the peak (just started falling)
          setEnemyInBounceMode(false);
          const velocity = enemyPhysicsRef.current.enableHoverMode();
          const currentY = enemyPhysicsRef.current.getY();
          enemyMovementRef.current?.startTransition(velocity, currentY);
        }

        // Update enemy Y position and scale from physics
        setEnemyY(enemyState.position.y);
        setEnemyScale({ scaleX: enemyState.scaleX, scaleY: enemyState.scaleY });

        if (isFinalSequenceRef.current) {
          const now = performance.now();
          const dims = dimensionsRef.current;
          const enemyGrowthScale = 1 + enemyGrowthLevelRef.current * GROWTH_SCALE_PER_LEVEL;
          const enemyWidth = dims.ballSize * enemyGrowthScale;
          const playerGrowthScale = 1 + playerGrowthLevelRef.current * GROWTH_SCALE_PER_LEVEL;
          const playerSize = dims.ballSize * playerGrowthScale;

          // Movement during final sequence with easing: charge (ease-in), return (ease-out)
          let nextX = enemyXRef.current;
          if (isReturningToRightRef.current) {
            const targetX = dims.enemyX;
            const RETURN_EASE = 0.18; // ease-out factor
            nextX = enemyXRef.current + (targetX - enemyXRef.current) * RETURN_EASE;
            if (nextX >= targetX - 0.5) {
              nextX = targetX;
              isReturningToRightRef.current = false;
              nextChargeTimeRef.current = now + 1000; // wait 1s then attempt another hit
              chargeActiveRef.current = false;
              chargeVelocityRef.current = 0;
            }
          } else {
            // If waiting before next charge, hold position; else charge left with acceleration
            if (now >= nextChargeTimeRef.current) {
              const MAX_CHARGE_SPEED = 14;
              const CHARGE_ACCEL = 0.8;
              if (!chargeActiveRef.current) {
                chargeActiveRef.current = true;
                chargeVelocityRef.current = 0;
              }
              chargeVelocityRef.current = Math.min(MAX_CHARGE_SPEED, chargeVelocityRef.current + CHARGE_ACCEL);
              nextX = enemyXRef.current - chargeVelocityRef.current;
            }
          }
          enemyXRef.current = nextX;
          setEnemyX(nextX);

          // Use freshest player state available this frame
          const pState = newPlayerState || playerPhysicsRef.current?.getState();
          if (pState) {
            // Collision detection during charge (only when charging left and not returning)
            if (!isReturningToRightRef.current && now >= nextChargeTimeRef.current) {
              const playerLeft = (pState.position.x - (playerSize - dims.ballSize) / 2);
              const playerTop = (pState.position.y - (playerSize - dims.ballSize));
              const enemyLeft = enemyXRef.current - (enemyWidth - dims.ballSize) / 2;
              const enemyTop = enemyState.position.y - (enemyWidth - dims.ballSize);
              const MARGIN = 4; // small tolerance for collision
              const intersects = (
                playerLeft - MARGIN < enemyLeft + enemyWidth + MARGIN &&
                playerLeft + playerSize + MARGIN > enemyLeft - MARGIN &&
                playerTop - MARGIN < enemyTop + enemyWidth + MARGIN &&
                playerTop + playerSize + MARGIN > enemyTop - MARGIN
              );

              if (intersects && (now - lastFinalCollisionTimeRef.current) > 250) {
                lastFinalCollisionTimeRef.current = now;
                // Screen shake short burst
                setIsShaking(true);
                setTimeout(() => setIsShaking(false), 200);
                // Start impact squash oscillator (decays with spring over ~3 pulses)
                impactAmountRef.current = 1;
                impactPhaseRef.current = 0;
                impactAmplitudeRef.current = 1;
                impactCyclesRef.current = 0;
                setImpactAmount(1);

                // Enemy bounces off and returns to right
                isReturningToRightRef.current = true;
                chargeActiveRef.current = false;
                chargeVelocityRef.current = 0;

                // Player takes 2 outs
                setPlayerOuts(prev => {
                  const newOuts = Math.min(prev + 2, MAX_OUTS);
                  if (newOuts >= MAX_OUTS) {
                    gameOverRef.current = true;
                    setGameOver(true);
                  }
                  return newOuts;
                });

                // Enemy grows by 2 levels on successful hit (mirror of taking 2 outs on enemy)
                setEnemyGrowthLevel(prev => {
                  const newGrowth = Math.min(prev + 2, MAX_GROWTH_LEVELS);
                  laserPhysicsRef.current?.setEnemyGrowthLevel(newGrowth);
                  return newGrowth;
                });
              }
            }

          // If enemy passes off-screen left without collision: successful jump -> start level transition
          if (!isReturningToRightRef.current && (enemyXRef.current + enemyWidth) < 0 && !isLevelTransitionRef.current) {
            // Begin level transition sequence (ONCE)
            isLevelTransitionRef.current = true;
            levelTransitionStageRef.current = 1; // rolling out
            setControlsEnabled(false);
            setLevelOverlayVisible(true);
            setLevelOverlaySubtitle(`Level ${levelRef.current + 1}`);
            // Stop further enemy actions
            nextChargeTimeRef.current = Number.POSITIVE_INFINITY;
            chargeActiveRef.current = false;
            chargeVelocityRef.current = 0;
          }
          }
        }
      } else if (enemyMovementRef.current && enemyPhysicsRef.current?.isHoverMode()) {
        // Update enemy movement system (hover mode)
        enemyMovementRef.current.update();
        setEnemyY(enemyMovementRef.current.getCurrentY());
        setEnemyScale(enemyMovementRef.current.getScale());
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


      // Impact squash oscillation (damped spring ~3 pulses)
      if (impactAmplitudeRef.current > 0 || impactAmountRef.current !== 0) {
        const TWO_PI = Math.PI * 2;
        const OMEGA = 0.30; // radians per frame (~350ms per cycle)
        const FRICTION = 0.985; // per-frame amplitude friction
        const PEAK_DAMP = 0.65; // amplitude damping at each positive peak
        // Advance phase and apply friction
        impactPhaseRef.current += OMEGA;
        impactAmplitudeRef.current = Math.max(0, impactAmplitudeRef.current * FRICTION);
        // On each full cycle, damp amplitude and count
        if (impactPhaseRef.current >= (impactCyclesRef.current + 1) * TWO_PI) {
          impactCyclesRef.current += 1;
          impactAmplitudeRef.current *= PEAK_DAMP;
          if (impactCyclesRef.current >= 3) {
            impactAmountRef.current = 0;
            impactAmplitudeRef.current = 0;
            impactPhaseRef.current = 0;
            impactCyclesRef.current = 0;
            setImpactAmount(0);
            // fall through to next loop iteration
          }
        }
        if (impactAmplitudeRef.current > 0) {
          const value = impactAmplitudeRef.current * Math.cos(impactPhaseRef.current);
          impactAmountRef.current = value;
          setImpactAmount(value);
        }
      }

      // Handle level transition stage changes (camera pan and enemy enter)
      if (isLevelTransitionRef.current) {
        if (levelTransitionStageRef.current === 2) {
          // Wait for delay before resetting
          const now = performance.now();

          if (now >= levelTransitionDelayRef.current) {
            // Recalculate dimensions in case window was resized
            dimensionsRef.current = calculateDimensions();
            const dims = dimensionsRef.current;

            console.log('[STAGE 2] Dimensions - width:', dims.width, 'height:', dims.height, 'centerY:', dims.centerY, 'floorY:', dims.floorY);

            // Increment level
            const upcomingLevel = levelRef.current + 1;
            levelRef.current = upcomingLevel;
            setLevel(upcomingLevel);
            // Reset core systems similar to handleRestart
            scoreRef.current = 0;
            gameOverRef.current = false;

            // Position player off-screen to the right so camera pan reveals them
            // Player should be at their normal start position relative to the camera target
            const playerXForReveal = dims.width + dims.playerStartX;
            console.log('[STAGE 2] Resetting player to X:', playerXForReveal, 'Y:', dims.centerY);
            playerPhysicsRef.current?.reset(playerXForReveal, dims.centerY);
            const afterReset = playerPhysicsRef.current?.getState();
            console.log('[STAGE 2] Player position after reset:', afterReset?.position.x, afterReset?.position.y);
            laserPhysicsRef.current?.reset();
            enemyPhysicsRef.current?.reset(dims.centerY);
            enemyMovementRef.current?.reset(dims.centerY);
            introAnimationStartedRef.current = false;
            // Set up forest background for level 2+
            // Don't reset - keep backgrounds scrolling continuously from level 1
            // This ensures forest is already visible and scrolling
            transitioningGroundRef.current?.setForestMode(true);

            // Make sure forest background transition has started (should already be running from score 50)
            ensureForestBackgroundActive();
            forestUnlockedRef.current = true;

            // Level 2+ starts in the forest, so dust field should be fully visible
            forestDustFieldRef.current?.setRevealProgress(1);

            const latestState = playerPhysicsRef.current?.getState();
            if (latestState) {
              setPlayerState(latestState);
            }
            setLasers(laserPhysicsRef.current?.getLasers() || []);
            setEnemyY(dims.centerY);
            setNumLasers(1);
            setGameOver(false);
            setWasHit(false);
            setEnemyWasHit(false);
            setPlayerProjectiles([]);
            setHitCount(0);
            setEnemyGrowthLevel(0);
            setAnimatedEnemyGrowthLevel(0);
            enemyGrowthLevelRef.current = 0; // Reset enemy growth ref
            setEnemyHits(0);
            setPlayerGrowthLevel(0);
            setAnimatedPlayerGrowthLevel(0);
            playerGrowthLevelRef.current = 0;
            setPlayerOuts(0);
            setEnemyOuts(0);
            setShootGameOver(false);
            // Reset energy and shooting unlock for the new level
            setEnergy(0);
            setCanShoot(false);
            setIsTenthOut(false); // Reset 10th out flag
            setEnemyInBounceMode(false); // Reset bounce mode
            // Enemy will enter later; place off-screen right (2x width so it's completely hidden during pan)
            const startX = dims.width * 2 + dims.ballSize * 2;
            enemyXRef.current = startX;
            setEnemyX(startX);
            isFinalSequenceRef.current = false;
            isReturningToRightRef.current = false;
            nextChargeTimeRef.current = 0;
            chargeActiveRef.current = false;
            chargeVelocityRef.current = 0;
            // Increase laser speed slightly for next level and add extra chaos
            const baseSpeedFactor = upcomingLevel >= 2 ? 0.2 : 0.15;
            const speedMultiplier = 1 + baseSpeedFactor * upcomingLevel;
            laserPhysicsRef.current?.setBaseSpeed(BASE_LASER_SPEED * speedMultiplier);
            laserPhysicsRef.current?.setChaosBoost(upcomingLevel >= 2 ? 1.3 : 1);
            // Prepare camera to start at 0 and pan right to dims.width
            cameraXRef.current = 0;
            setCameraX(0);

            // Ensure backgrounds are scrolling during camera pan
            forestTreesBackgroundRef.current?.setPaused(false);
            transitioningGroundRef.current?.setPaused(false);

            levelTransitionStage3StartRef.current = performance.now();
            levelTransitionStageRef.current = 3; // camera pan
          }
        } else if (levelTransitionStageRef.current === 3) {
          // Camera pans right with ease-in-out over 3.5 seconds
          const dims = dimensionsRef.current;
          const targetCam = dims.width;
          const PAN_DURATION = 3500; // milliseconds

          // Time-based progress (0 to 1)
          const elapsed = performance.now() - levelTransitionStage3StartRef.current;
          const progress = Math.min(elapsed / PAN_DURATION, 1);

          // Ease-in-out cubic
          let easing;
          if (progress < 0.5) {
            easing = 4 * progress * progress * progress;
          } else {
            easing = 1 - Math.pow(-2 * progress + 2, 3) / 2;
          }

          const nextCam = targetCam * easing;

          cameraXRef.current = nextCam;
          setCameraX(nextCam);

          if (Math.abs(nextCam - targetCam) < 0.5) {
            cameraXRef.current = targetCam;
            setCameraX(targetCam);
            levelTransitionStage4StartRef.current = performance.now();
            levelTransitionStage4ExecutedRef.current = false; // Reset flag
            levelTransitionStageRef.current = 4;
          }
        } else if (levelTransitionStageRef.current === 4) {
          // Stage 4: Keep camera at dims.width, just reposition player for normal gameplay
          // We don't reset the camera - backgrounds continue scrolling naturally
          const dims = dimensionsRef.current;
          const elapsed = performance.now() - levelTransitionStage4StartRef.current;

          // Only execute Stage 4 actions once (use flag instead of time check)
          if (!levelTransitionStage4ExecutedRef.current) {
            levelTransitionStage4ExecutedRef.current = true;

            // Player is currently at world position (dims.width + dims.playerStartX)
            // Camera is at dims.width
            // Visual position: (dims.width + dims.playerStartX) - dims.width = dims.playerStartX ✓
            // Keep camera at dims.width and player stays where they are
            console.log('[STAGE 4] Camera staying at:', cameraXRef.current, 'Player at:', dims.width + dims.playerStartX);
          }

          // Wait 50ms for state updates to propagate before advancing
          if (elapsed >= 50) {
            console.log('[STAGE 4] Complete, advancing to Stage 5');
            // Now that setup is done, enemy can start rolling in
            levelTransitionStageRef.current = 5; // advance to enemy enter
          }
        } else if (levelTransitionStageRef.current === 5) {
          // Enemy rolls in from right to starting position (AFTER camera pan completes)
          // Camera is at dims.width, so enemy world position should be dims.enemyX + dims.width
          const dims = dimensionsRef.current;
          const targetX = dims.enemyX + dims.width;
          const ENTER_EASE = 0.12;
          const next = enemyXRef.current + (targetX - enemyXRef.current) * ENTER_EASE;
          enemyXRef.current = next;
          setEnemyX(next);
          if (Math.abs(next - targetX) < 0.5) {
            enemyXRef.current = targetX;
            setEnemyX(targetX);

            // Trigger intro animation for enemy
            if (enemyPhysicsRef.current) {
              enemyPhysicsRef.current.startJumpSequence();
            }

            levelTransitionStage6StartRef.current = performance.now();
            levelTransitionStageRef.current = 6;
          }
        } else if (levelTransitionStageRef.current === 6) {
          // Wait at least 500ms for intro animation to start, then fade out overlay
          const elapsed = performance.now() - levelTransitionStage6StartRef.current;

          // Debug: Log player position at start of Stage 6
          if (elapsed < 100) {
            const pState = playerPhysicsRef.current?.getState();
            console.log('[STAGE 6] Player pos:', pState?.position.x, pState?.position.y, 'Camera:', cameraXRef.current);
          }

          if (elapsed >= 500) {
            const pState = playerPhysicsRef.current?.getState();
            console.log('[STAGE 6] Completing. Player pos before resume:', pState?.position.x, pState?.position.y);

            setControlsEnabled(true);
            setLevelOverlayVisible(false);
            // Resume background/ground scroll for next level
            forestTreesBackgroundRef.current?.setPaused(false);
            transitioningGroundRef.current?.setPaused(false);
            // Ensure dust field remains fully visible after level transition
            forestDustFieldRef.current?.setRevealProgress(1);
            isLevelTransitionRef.current = false;
            levelTransitionStageRef.current = 0;
            levelTransitionStage1CompleteRef.current = false; // Reset for next transition

            console.log('[STAGE 6] Complete. Resuming normal gameplay. Player physics will resume updating.');
          }
        }
      }

      // Get enemy Y from correct source (hover = EnemyMovement, physics = EnemyPhysics)
      const currentEnemyY = enemyPhysicsRef.current?.isHoverMode()
        ? (enemyMovementRef.current?.getCurrentY() || dimensionsRef.current.centerY)
        : (enemyPhysicsRef.current?.getY() || dimensionsRef.current.centerY);

      // Allow enemy lasers immediately on levels > 1 even if the re-intro hasn't flagged complete yet
      const allowEnemyLasers = (levelRef.current > 1) || (enemyPhysicsRef.current?.hasCompletedIntro() || false);

      // Keep LaserPhysics enemyX synced with on-screen enemy position (accounts for camera pans and transitions)
      {
        const dims = dimensionsRef.current;
        laserPhysicsRef.current?.updateDimensions(
          dims.width,
          dims.height,
          dims.centerY,
          enemyXRef.current, // current world X of enemy
          dims.ballSize,
          dims.laserWidth,
          dims.laserHeight
        );
      }

      const laserUpdate = laserPhysicsRef.current?.update(
        scoreRef.current,
        newPlayerState?.position || { x: 0, y: 0 },
        currentEnemyY, // Pass enemy Y to LaserPhysics
        playerPhysicsRef.current?.hasPlayerJumped() || false,
        playerGrowthLevelRef.current,
        enemyPhysicsRef.current?.isHoverMode() || false,
        enemyPhysicsRef.current?.isEnemyDisabled() || false,
        allowEnemyLasers,
        // Stop spawning lasers during 10th-out final sequence, but allow existing lasers to finish
        isTenthOutRef.current || isFinalSequenceRef.current || isLevelTransitionRef.current
      );

      if (laserUpdate && laserPhysicsRef.current) {
        if (laserUpdate.scoreChange > 0) {
          scoreRef.current += laserUpdate.scoreChange;
          totalScoreRef.current += laserUpdate.scoreChange;
          // Energy gains 2% per laser jump (reaches 100% at 50 jumps)
          setEnergy(prev => Math.min(100, prev + 2));
          // Unlock shooting at 50 jumps (when energy reaches 100%)
          if (scoreRef.current >= 50 && !canShootRef.current) {
            console.log('[SHOOT UNLOCK] Score:', scoreRef.current, 'Player pos before:', newPlayerState?.position);
            setCanShoot(true);
            canShootRef.current = true;
            console.log('[SHOOT UNLOCK] Player pos after:', newPlayerState?.position);
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
            setPlayerOuts(prev => {
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

        // If laser fired in hover mode, tell EnemyMovement the new target
        if (laserUpdate.laserFired && laserUpdate.targetY !== null && enemyPhysicsRef.current?.isHoverMode()) {
          enemyMovementRef.current?.setTarget(laserUpdate.targetY);
        }

        setLasers(laserPhysicsRef.current.getLasers());
      }

      if (canShootRef.current) {
        let hitRegisteredThisFrame = false;
        const cameraOffset = cameraXRef.current;
        const screenRight = cameraOffset + dimensionsRef.current.width;
        const enemyWorldX = enemyXRef.current;

        setPlayerProjectiles(prev =>
          prev
            .map(projectile => {
              if (!projectile.active) return projectile;
              const newX = projectile.x + PLAYER_PROJECTILE_SPEED;
              const dims = dimensionsRef.current;
              const enemyGrowthScale = 1 + enemyGrowthLevelRef.current * GROWTH_SCALE_PER_LEVEL;
              const currentEnemyWidth = dims.ballSize * enemyGrowthScale;
              const currentEnemyHeight = dims.ballSize * enemyGrowthScale;
              // Use correct Y position source based on enemy mode (hover vs physics/bounce)
              const enemyCurrentY = enemyPhysicsRef.current?.isHoverMode()
                ? (enemyMovementRef.current?.getCurrentY() || 0)
                : (enemyPhysicsRef.current?.getY() || 0);

              const hitEnemy =
                newX + PLAYER_PROJECTILE_WIDTH > enemyWorldX &&
                newX < enemyWorldX + currentEnemyWidth &&
                projectile.y + PLAYER_PROJECTILE_HEIGHT > enemyCurrentY &&
                projectile.y < enemyCurrentY + currentEnemyHeight;

              if (hitEnemy && !projectile.hasHitEnemy) {
                setEnemyWasHit(true);
                setTimeout(() => setEnemyWasHit(false), 250);
                audioManagerRef.current?.playLaserHit();

                if (!hitRegisteredThisFrame) {
                  playerHitsRef.current += 1;
                  const currentPlayerHits = playerHitsRef.current;
                  if (currentPlayerHits >= HITS_PER_OUT) {
                    playerHitsRef.current = currentPlayerHits % HITS_PER_OUT;
                    setEnemyOuts(prev => {
                      const newOuts = prev + 1;
                      console.log(`[DEBUG] Enemy outs: ${newOuts}`);

                      // Check if this is a bounce mode out (4th, 7th, or 10th)
                      if (newOuts === 4 || newOuts === 7 || newOuts === 10) {
                        console.log(`[BOUNCE MODE] Triggering bounce mode for out #${newOuts}`);
                        console.log(`[BOUNCE MODE] Before - isHoverMode: ${enemyPhysicsRef.current?.isHoverMode()}`);

                        setEnemyInBounceMode(true);

                        // Transfer state from hover to physics (smooth transition)
                        const currentY = enemyMovementRef.current?.getCurrentY() || dimensionsRef.current.centerY;
                        const initialVelocity = -1; // Small downward velocity to start falling smoothly
                        console.log(`[BOUNCE MODE] Calling enablePhysicsModeWithState(${currentY}, ${initialVelocity})`);
                        enemyPhysicsRef.current?.enablePhysicsModeWithState(currentY, initialVelocity);
                        console.log(`[BOUNCE MODE] After - isHoverMode: ${enemyPhysicsRef.current?.isHoverMode()}`);

                        // On 10th out, mark special state and disable enemy
                        if (newOuts >= MAX_OUTS) {
                          // Slow down background and ground movement for the final sequence
                          transitioningGroundRef.current?.startSlowingDown(3000); // 3 seconds to stop
                          forestTreesBackgroundRef.current?.startSlowingDown(2000); // 2 seconds to stop

                          setIsTenthOut(true);
                          setShootGameOver(true);
                          // Don't set setGameOver(true) - we want to prevent the game over screen
                          // Enemy will fall but not bounce, and won't shoot
                        }
                      } else if (newOuts >= MAX_OUTS) {
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
                    setPlayerGrowthLevel(prev => Math.max(prev - 1, 0));
                  }
                  setHitCount(playerHitsRef.current);
                  hitRegisteredThisFrame = true;
                }
                return { ...projectile, x: -1000, active: false, hasHitEnemy: true };
              }

              if (newX > screenRight) return { ...projectile, active: false };
              return { ...projectile, x: newX };
            })
            .filter(p => p.active)
        );
      }

      laserPhysicsRef.current?.setEnemyGrowthLevel(enemyGrowthLevelRef.current);

      if (scoreRef.current < 0) {
        gameOverRef.current = true;
        setGameOver(true);
        return;
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameOver, ensureForestBackgroundActive, triggerForestDustReveal]);

  const handleJumpStart = useCallback(() => {
    if (gameOver || !controlsEnabled) return;
    audioManagerRef.current?.initialize();
    audioManagerRef.current?.playJumpSound();
    playerPhysicsRef.current?.startJump();
  }, [gameOver, controlsEnabled]);

  const handleJumpEnd = useCallback(() => {
    if (gameOver || !controlsEnabled) return;
    playerPhysicsRef.current?.endJump();
    audioManagerRef.current?.resetJumpSound();
  }, [gameOver, controlsEnabled]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (gameOver || !controlsEnabled) return;
    const dims = dimensionsRef.current;
    playerPhysicsRef.current?.setMousePosition(event.clientX, dims.width);
  }, [gameOver, controlsEnabled]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (gameOver || !controlsEnabled) return;
    if (event.touches.length > 0) {
      const dims = dimensionsRef.current;
      const touch = event.touches[0];
      playerPhysicsRef.current?.setMousePosition(touch.clientX, dims.width);
    }
  }, [gameOver, controlsEnabled]);

  const handleShoot = useCallback(() => {
    if (gameOver || !canShoot || energyRef.current <= 0 || !controlsEnabled) return;

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
  }, [gameOver, canShoot, controlsEnabled]);

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
    enemyMovementRef.current?.reset(dims.centerY);
    introAnimationStartedRef.current = false; // Allow intro animation to play again
    forestTreesBackgroundRef.current?.reset();
    transitioningGroundRef.current?.reset();
    transitioningGroundRef.current?.setForestMode(false); // Show proper cloud->transition->forest sequence on Level 1
    forestUnlockedRef.current = false;
    resetForestDust();
    totalScoreRef.current = 0;
    setCumulativeScore(0);
    const resetState = playerPhysicsRef.current?.getState();
    if (resetState) {
      setPlayerState(resetState);
    }
    setLasers(laserPhysicsRef.current?.getLasers() || []);
    setEnemyY(dims.centerY);
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
    setEnemyX(dims.enemyX);
    enemyXRef.current = dims.enemyX;
    isFinalSequenceRef.current = false;
    isReturningToRightRef.current = false;
    nextChargeTimeRef.current = 0;
    chargeActiveRef.current = false;
    chargeVelocityRef.current = 0;
    // Reset level transition state
    isLevelTransitionRef.current = false;
    levelTransitionStageRef.current = 0;
    levelTransitionStage1CompleteRef.current = false;
  }, [resetForestDust]);

  const testEnergy = useCallback(() => {
    scoreRef.current = 50;
    setScore(50);
    setEnergy(100);
    const dims = dimensionsRef.current;
    if (levelRef.current <= 1) {
      // Ensure the ground shows the transition tile next (no immediate forest-only)
      transitioningGroundRef.current?.restartTransition();
      // Prewarm caches immediately for a seamless first frame
      transitioningGroundRef.current?.prewarm(dims.width, dims.height);
      forestTreesBackgroundRef.current?.prewarm(dims.width, dims.height);
    } else {
      transitioningGroundRef.current?.setForestMode(true);
      ensureForestBackgroundActive();
      forestDustFieldRef.current?.setRevealProgress(1);
      forestUnlockedRef.current = true;
    }
    setCanShoot(true);
    laserPhysicsRef.current?.setScore(100);
  }, [ensureForestBackgroundActive]);

  const handleTestTenOuts = useCallback(() => {
    if (gameOverRef.current) return;

    // Trigger the slowdown for ground and background
    transitioningGroundRef.current?.startSlowingDown(3000); // 3 seconds
    forestTreesBackgroundRef.current?.startSlowingDown(2000); // 2 seconds

    setEnemyOuts(MAX_OUTS);
    setEnemyInBounceMode(true);

    const currentY = enemyMovementRef.current?.getCurrentY() || dimensionsRef.current.centerY;
    const initialVelocity = -1;
    enemyPhysicsRef.current?.enablePhysicsModeWithState(currentY, initialVelocity);

    setIsTenthOut(true);
    setShootGameOver(true);
  }, []);

  const handleToggleSound = useCallback(() => {
    const newMutedState = audioManagerRef.current?.toggleMute();
    setIsMuted(newMutedState ?? false);
  }, []);

  return {
    score,
    cumulativeScore,
    gameOver,
    hitCount,
    enemyHits,
    enemyWasHit,
    playerState,
    lasers,
    enemyX,
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
    forestDustField: forestDustFieldRef.current,
    staticCloudSky: staticCloudSkyRef.current,
    forestTreesBackground: forestTreesBackgroundRef.current,
    transitioningGround: transitioningGroundRef.current,
    gradientOverlay: gradientOverlayRef.current,
    cameraX,
    level,
    controlsEnabled,
    levelOverlayVisible,
    levelOverlaySubtitle,
    impactAmount,
    isShaking,
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
    handleTestTenOuts,
  };
};
