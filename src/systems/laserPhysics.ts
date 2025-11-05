/**
 * Laser Physics System
 * Handles laser movement, collision detection, spawning, and scoring
 * Features smooth enemy movement that continuously moves between positions
 * Lasers spawn from the center of the enemy ball
 */

import { LaserState, Position } from '../types/game';
import {
  LASER_WIDTH,
  LASER_HEIGHT,
  BASE_LASER_SPEED,
  MAX_LASERS,
  SCORE_PER_LASER_UNLOCK,
  BALL_SIZE,
  ENEMY_MOVE_SPEED,
  ENEMY_MOVEMENT_DELAY,
  CHAOS_INCREMENT_INTERVAL,
  BASE_LASER_RANDOMNESS,
  CHAOS_MULTIPLIER_PER_INTERVAL,
  WIDE_LASER_UNLOCK_SCORE,
  WIDE_LASER_WIDTH,
  WIDE_LASER_HIT_VALUE,
  GROWTH_SCALE_PER_LEVEL,
  ENEMY_FLOAT_ENABLED,
  ENEMY_FLOAT_AMPLITUDE,
  ENEMY_FLOAT_FREQUENCY,
  ENEMY_FLOAT_SETTLE_OSCILLATIONS,
  INTRO_TRANSITION_DAMPING,
} from '../config/gameConfig';

export class LaserPhysics {
  private lasers: LaserState[] = [];
  private numLasers: number = 1;
  private baseSpeed: number = BASE_LASER_SPEED;
  private enemyY: number;
  private targetEnemyY: number; // Target Y position for smooth movement
  private startEnemyY: number; // Starting Y position for ease-in calculation
  private pendingTargetY: number | null = null; // Delayed target position
  private movementDelayTimer: number = 0; // Timer for movement delay
  private enemyVelocity: number = 0; // Track movement velocity for squash/stretch
  private transitionVelocity: number = 0; // Velocity carried over from physics transition
  private oscillationVelocity: number = 0; // Velocity for settling bounce/oscillation
  private isSettling: boolean = false; // Whether enemy is in settling/oscillation mode
  private enemyScaleX: number = 1; // Current scale X for smooth interpolation
  private enemyScaleY: number = 1; // Current scale Y for smooth interpolation

  // Floating oscillation state
  private floatPhase: number = 0; // Current phase of the sine wave (0 to 2π)
  private settlePhase: number = 0; // Phase for settle oscillations after reaching target
  private settleAmplitude: number = 0; // Current amplitude for settle oscillations (dampens over time)
  private isInSettleMode: boolean = false; // Whether currently doing settle oscillations
  private currentScore: number = 0; // Track current score for chaos calculation
  private lastWideLaserJumpCount: number = 0; // Track the jump count when the last wide laser was spawned
  private jumpsSinceUnlock: number = 0; // Counter for jumps after shooting is unlocked
  private enemyGrowthLevel: number = 0; // How many times the enemy has grown
  private lastLaserFireTime: number = 0; // Timer for evenly spaced lasers
  private lasersSinceLock: number = 0; // Counter for enemy locking behavior at score 75+
  private centerY: number;
  private minLaserY: number;
  private enemyX: number;
  private screenWidth: number;
  // Responsive dimensions
  private ballSize: number = BALL_SIZE;
  private laserWidth: number = LASER_WIDTH;
  private laserHeight: number = LASER_HEIGHT;

  constructor(screenWidth: number, screenHeight: number, centerY: number, enemyX: number) {
    this.lastLaserFireTime = Date.now();
    this.centerY = centerY;
    this.minLaserY = screenHeight * 0.2; // Allow enemy to go up to 20% from top (80% of screen height)
    this.enemyY = centerY;
    this.targetEnemyY = centerY;
    this.startEnemyY = centerY;
    this.enemyX = enemyX;
    this.screenWidth = screenWidth;
    this.initializeLasers();
  }

  setEnemyGrowthLevel(level: number): void {
    this.enemyGrowthLevel = level;
  }

  setScore(newScore: number): void {
    this.currentScore = newScore;
  }

  /**
   * Start hover mode with initial velocity from physics transition
   * This creates a smooth deceleration from bouncing to hovering
   */
  startHoverWithVelocity(initialVelocity: number, currentY: number): void {
    this.transitionVelocity = -initialVelocity; // Negate because physics uses inverted Y
    this.enemyY = currentY;
    this.targetEnemyY = currentY;
    this.startEnemyY = currentY;
  }

  private getNextLaserWidth(): number {
    const isWideLaserTime = this.currentScore >= WIDE_LASER_UNLOCK_SCORE &&
                            this.jumpsSinceUnlock > 0 &&
                            this.jumpsSinceUnlock % 15 === 0;

    if (isWideLaserTime && this.jumpsSinceUnlock !== this.lastWideLaserJumpCount) {
      this.lastWideLaserJumpCount = this.jumpsSinceUnlock;
      return WIDE_LASER_WIDTH;
    }
    return this.laserWidth;
  }

  private generateRandomLaserY(score: number, playerY?: number): number {
    if (score >= 75 && playerY !== undefined && this.lasersSinceLock >= 5) {
      this.lasersSinceLock = 0;
      return playerY;
    }

    const scoreInCycle = score % SCORE_PER_LASER_UNLOCK;
    const chaosIntervals = Math.floor(scoreInCycle / CHAOS_INCREMENT_INTERVAL);
    const currentChaos = BASE_LASER_RANDOMNESS + (chaosIntervals * CHAOS_MULTIPLIER_PER_INTERVAL);
    const fullRange = this.centerY - this.minLaserY;
    const randomRange = fullRange * currentChaos;
    const centerPosition = this.minLaserY + (fullRange / 2);
    return centerPosition - (randomRange / 2) + (Math.random() * randomRange);
  }

  private getInitialLaserX(): number {
    const growthScale = 1 + (this.enemyGrowthLevel * GROWTH_SCALE_PER_LEVEL);
    const currentEnemyWidth = this.ballSize * growthScale;
    const enemySpawnX = this.enemyX + currentEnemyWidth / 2;
    return enemySpawnX;
  }

  private initializeLasers(): void {
    const firstLaserY = this.centerY;
    const nextLaserY = this.generateRandomLaserY(0);

    // Initialize lasers off-screen so they're not visible during intro animation
    this.lasers = [
      {
        x: -this.laserWidth - 100,
        y: firstLaserY,
        hit: false,
        scored: false,
        passed: false,
        nextY: nextLaserY,
        width: this.getNextLaserWidth(),
      },
    ];

    this.targetEnemyY = firstLaserY;
  }

  updateLaserCount(score: number): void {
    this.currentScore = score;
    const laserUnlocks = Math.floor(score / SCORE_PER_LASER_UNLOCK);
    const prevNumLasers = this.numLasers;
    this.numLasers = Math.min(laserUnlocks + 3, MAX_LASERS);

    if (this.numLasers > prevNumLasers) {
      while (this.lasers.length < this.numLasers) {
        const newLaserY = this.generateRandomLaserY(score);
        this.lasers.push({
          x: -1000,
          y: newLaserY,
          hit: false,
          scored: false,
          passed: false,
          nextY: this.generateRandomLaserY(score),
          width: this.getNextLaserWidth(),
        });
      }
    }

    while (this.lasers.length > this.numLasers) {
      this.lasers.pop();
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private getCurrentSpeed(score: number): number {
    return this.baseSpeed;
  }

  update(
    score: number,
    playerPosition: Position,
    playerHasJumped: boolean,
    playerGrowthLevel: number,
    isEnemyInHoverMode: boolean = true
  ): { scoreChange: number; wasHit: boolean; enemyHitCount: number } {
    this.currentScore = score;
    this.updateLaserCount(score);

    const laserSpeed = this.getCurrentSpeed(score);
    let fireDelay = 0;
    if (laserSpeed > 0 && this.numLasers > 0) {
      if (this.numLasers === 1) {
        fireDelay = 300;
      } else {
        const distanceBetweenLasers = this.screenWidth / this.numLasers;
        fireDelay = (distanceBetweenLasers / laserSpeed) * (1000 / 60);
      }
    }

    const currentSpeed = this.getCurrentSpeed(score);
    let scoreChange = 0;
    let wasHit = false;
    let enemyHitCount = 0;
    let hitRegisteredThisFrame = false;

    const now = Date.now();

    // Only spawn lasers if enemy is in hover mode (after intro animation)
    if (isEnemyInHoverMode && now - this.lastLaserFireTime > fireDelay) {
      const inactiveLaser = this.lasers.find(l => l.x < -this.laserWidth);
      if (inactiveLaser) {
        this.lastLaserFireTime = now;
        this.lasersSinceLock++;
        const growthScale = 1 + (this.enemyGrowthLevel * GROWTH_SCALE_PER_LEVEL);
        const currentEnemyHeight = this.ballSize * growthScale;
        inactiveLaser.x = this.getInitialLaserX();
        inactiveLaser.y = this.enemyY + currentEnemyHeight / 2;
        inactiveLaser.hit = false;
        inactiveLaser.scored = false;
        inactiveLaser.passed = false;
        inactiveLaser.width = this.getNextLaserWidth();

        const nextY = this.generateRandomLaserY(this.currentScore, playerPosition.y);
        inactiveLaser.nextY = nextY;
        this.pendingTargetY = nextY;
        this.movementDelayTimer = ENEMY_MOVEMENT_DELAY;
      }
    }

    this.lasers.forEach((laser, laserIndex) => {
      // Only move and process lasers if enemy is in hover mode
      if (isEnemyInHoverMode) {
        laser.x -= currentSpeed;

        if (!laser.hit && !laser.passed && playerPosition.x > laser.x + this.laserWidth) {
          laser.passed = true;
          laser.scored = true;
          if (playerHasJumped) {
            scoreChange += 1;
            if (this.currentScore >= WIDE_LASER_UNLOCK_SCORE) {
              this.jumpsSinceUnlock++;
            }
          }
        }

        const laserWidth = laser.width || this.laserWidth;
        if (laser.x + laserWidth < -this.laserWidth) {
          // Laser is inactive
        }

        const currentLaserWidth = laser.width || this.laserWidth;
        const playerGrowthScale = 1 + playerGrowthLevel * GROWTH_SCALE_PER_LEVEL;
        const currentPlayerSize = this.ballSize * playerGrowthScale;
        const growthAmount = currentPlayerSize - this.ballSize;
        const hitboxTopY = playerPosition.y - growthAmount;
        const hitboxLeftX = playerPosition.x - (growthAmount / 2) - 10;

        if (
          !laser.hit &&
          hitboxLeftX + currentPlayerSize > laser.x &&
          hitboxLeftX < laser.x + currentLaserWidth &&
          hitboxTopY + currentPlayerSize > laser.y &&
          hitboxTopY < laser.y + this.laserHeight
        ) {
          laser.hit = true;
          wasHit = true;
          if (!hitRegisteredThisFrame) {
            const hitValue = laser.width === WIDE_LASER_WIDTH ? WIDE_LASER_HIT_VALUE : 1;
            enemyHitCount += hitValue;
            hitRegisteredThisFrame = true;
          }
          laser.x = -1000;
        }
      }
    });

    if (this.pendingTargetY !== null) {
      if (this.movementDelayTimer > 0) {
        this.movementDelayTimer -= 16.67;
      }
      if (this.movementDelayTimer <= 0) {
        this.startEnemyY = this.enemyY;
        this.targetEnemyY = this.pendingTargetY;
        this.pendingTargetY = null;
        this.isSettling = false;
        this.isInSettleMode = false;
      }
    }

    const previousY = this.enemyY;

    // Apply transition velocity if present (smooth handoff from physics bouncing)
    if (Math.abs(this.transitionVelocity) > 0.1) {
      this.enemyY += this.transitionVelocity;
      // Decelerate smoothly using configured damping factor
      this.transitionVelocity *= INTRO_TRANSITION_DAMPING;

      // Once velocity is small enough, snap to target and start normal hover behavior
      if (Math.abs(this.transitionVelocity) < 0.1) {
        this.transitionVelocity = 0;
        this.targetEnemyY = this.enemyY;
        this.startEnemyY = this.enemyY;
      }
    } else {
      // Normal hover movement behavior
      const distanceToTarget = Math.abs(this.targetEnemyY - this.enemyY);
      const totalDistance = Math.abs(this.targetEnemyY - this.startEnemyY);
      const distanceTraveled = Math.abs(this.enemyY - this.startEnemyY);
      const progress = totalDistance > 0 ? distanceTraveled / totalDistance : 1;
      const easeInSpeed = ENEMY_MOVE_SPEED + (progress * ENEMY_MOVE_SPEED * 4);
      this.enemyY += (this.targetEnemyY - this.enemyY) * easeInSpeed;

      if (distanceToTarget < 0.5) {
        this.enemyY = this.targetEnemyY;
        this.isSettling = false;
        if (ENEMY_FLOAT_ENABLED && !this.isInSettleMode) {
          this.isInSettleMode = true;
          this.settlePhase = 0;
          this.settleAmplitude = ENEMY_FLOAT_AMPLITUDE * 1.5;
        }
      }
    }

    this.applyFloatingOscillation();
    this.enemyVelocity = this.enemyY - previousY;
    this.updateEnemyScale();

    return { scoreChange, wasHit, enemyHitCount };
  }

  private applyFloatingOscillation(): void {
    if (!ENEMY_FLOAT_ENABLED) return;
    let floatOffset = 0;
    this.floatPhase += ENEMY_FLOAT_FREQUENCY;
    if (this.floatPhase > Math.PI * 2) {
      this.floatPhase -= Math.PI * 2;
    }
    floatOffset = Math.sin(this.floatPhase) * ENEMY_FLOAT_AMPLITUDE;

    if (this.isInSettleMode && this.settleAmplitude > 0.1) {
      this.settlePhase += ENEMY_FLOAT_FREQUENCY * 2;
      const settleOscillation = Math.sin(this.settlePhase) * this.settleAmplitude;
      this.settleAmplitude *= 0.95;
      const oscillationsCompleted = this.settlePhase / (Math.PI * 2);
      if (oscillationsCompleted >= ENEMY_FLOAT_SETTLE_OSCILLATIONS) {
        this.isInSettleMode = false;
        this.settleAmplitude = 0;
        this.settlePhase = 0;
      }
      floatOffset += settleOscillation;
    }
    this.enemyY += floatOffset;
  }

  getLasers(): LaserState[] {
    return this.lasers;
  }

  getNumLasers(): number {
    return this.numLasers;
  }

  getEnemyY(): number {
    return this.enemyY;
  }

  private updateEnemyScale(): void {
    let targetScaleX = 1;
    let targetScaleY = 1;
    const velocity = this.enemyVelocity;
    const onFloor = Math.abs(this.enemyY - this.targetEnemyY) < 1;

    if (Math.abs(velocity) > 0.1) {
      if (velocity < 0) { // Moving up
        targetScaleY = 1 - Math.abs(velocity) / 15;
        targetScaleX = 1 + Math.abs(velocity) / 15;
      } else { // Moving down
        targetScaleY = 1 + Math.abs(velocity) / 15;
        targetScaleX = 1 - Math.abs(velocity) / 15;
      }
    }

    if (onFloor && Math.abs(velocity) < 0.5) {
      targetScaleY = 0.7;
      targetScaleX = 1.3;
    }

    if (onFloor && Math.abs(velocity) < 0.01) {
      targetScaleX = 1;
      targetScaleY = 1;
    }

    this.enemyScaleX += (targetScaleX - this.enemyScaleX) * 0.15;
    this.enemyScaleY += (targetScaleY - this.enemyScaleY) * 0.15;
  }

  getEnemyScale(): { scaleX: number; scaleY: number } {
    return { scaleX: this.enemyScaleX, scaleY: this.enemyScaleY };
  }

  reset(): void {
    this.numLasers = 1;
    this.baseSpeed = BASE_LASER_SPEED;
    this.enemyY = this.centerY;
    this.targetEnemyY = this.centerY;
    this.lastWideLaserJumpCount = 0;
    this.jumpsSinceUnlock = 0;
    this.enemyGrowthLevel = 0;
    this.lasersSinceLock = 0;
    this.floatPhase = 0;
    this.settlePhase = 0;
    this.settleAmplitude = 0;
    this.isInSettleMode = false;
    this.initializeLasers();
  }

  updateDimensions(screenWidth: number, screenHeight: number, centerY: number, enemyX: number, ballSize?: number, laserWidth?: number, laserHeight?: number): void {
    this.centerY = centerY;
    this.minLaserY = screenHeight * 0.2;
    this.enemyX = enemyX;
    if (ballSize !== undefined) this.ballSize = ballSize;
    if (laserWidth !== undefined) this.laserWidth = laserWidth;
    if (laserHeight !== undefined) this.laserHeight = laserHeight;
  }
}