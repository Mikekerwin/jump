/**
 * Laser Physics System
 * Handles laser movement, collision detection, spawning, and scoring
 * Enemy position is now managed externally (by EnemyMovement class)
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
  CHAOS_INCREMENT_INTERVAL,
  BASE_LASER_RANDOMNESS,
  CHAOS_MULTIPLIER_PER_INTERVAL,
  WIDE_LASER_UNLOCK_SCORE,
  WIDE_LASER_WIDTH,
  WIDE_LASER_HIT_VALUE,
  GROWTH_SCALE_PER_LEVEL,
} from '../config/gameConfig';

export class LaserPhysics {
  private lasers: LaserState[] = [];
  private numLasers: number = 1;
  private baseSpeed: number = BASE_LASER_SPEED;
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

  /**
   * Adjust base laser speed (used for level progression)
   */
  setBaseSpeed(speed: number): void {
    this.baseSpeed = speed;
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

  private getCurrentSpeed(score: number): number {
    return this.baseSpeed;
  }

  /**
   * Update laser system for one frame
   * Enemy Y position is now passed in as a parameter
   * Returns targetY when a laser fires (for EnemyMovement to use)
   */
  update(
    score: number,
    playerPosition: Position,
    enemyY: number, // NEW: Enemy Y position passed in
    playerHasJumped: boolean,
    playerGrowthLevel: number,
    isEnemyInHoverMode: boolean = true,
    isEnemyDisabled: boolean = false,
    hasCompletedIntro: boolean = true, // NEW: Prevents laser firing during initial intro animation only
    stopSpawning: boolean = false
  ): { scoreChange: number; wasHit: boolean; enemyHitCount: number; laserFired: boolean; targetY: number | null } {
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
    let laserFired = false;
    let targetY: number | null = null;

    const now = Date.now();

    // Spawn lasers during gameplay (hover OR bounce mode), but NOT when disabled or during initial intro
    // Also stop spawning when stopSpawning is true (e.g., 10th out / final sequence)
    if (!stopSpawning && !isEnemyDisabled && hasCompletedIntro && now - this.lastLaserFireTime > fireDelay) {
      const inactiveLaser = this.lasers.find(l => l.x < -this.laserWidth);
      if (inactiveLaser) {
        this.lastLaserFireTime = now;
        this.lasersSinceLock++;
        const growthScale = 1 + (this.enemyGrowthLevel * GROWTH_SCALE_PER_LEVEL);
        const currentEnemyHeight = this.ballSize * growthScale;
        inactiveLaser.x = this.getInitialLaserX();
        inactiveLaser.y = enemyY + currentEnemyHeight / 2; // Use passed-in enemyY
        inactiveLaser.hit = false;
        inactiveLaser.scored = false;
        inactiveLaser.passed = false;
        inactiveLaser.width = this.getNextLaserWidth();

        const nextY = this.generateRandomLaserY(this.currentScore, playerPosition.y);
        inactiveLaser.nextY = nextY;

        // NEW: Return target Y for EnemyMovement to handle
        targetY = nextY;
        laserFired = true;
      }
    }

    this.lasers.forEach((laser, laserIndex) => {
      // Always move and process existing lasers so they complete their path off-screen
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
    });

    return { scoreChange, wasHit, enemyHitCount, laserFired, targetY };
  }

  getLasers(): LaserState[] {
    return this.lasers;
  }

  getNumLasers(): number {
    return this.numLasers;
  }

  reset(): void {
    this.numLasers = 1;
    this.baseSpeed = BASE_LASER_SPEED;
    this.lastWideLaserJumpCount = 0;
    this.jumpsSinceUnlock = 0;
    this.enemyGrowthLevel = 0;
    this.lasersSinceLock = 0;
    this.initializeLasers();
  }

  updateDimensions(screenWidth: number, screenHeight: number, centerY: number, enemyX: number, ballSize?: number, laserWidth?: number, laserHeight?: number): void {
    this.centerY = centerY;
    this.minLaserY = screenHeight * 0.2;
    this.enemyX = enemyX;
    this.screenWidth = screenWidth;
    if (ballSize !== undefined) this.ballSize = ballSize;
    if (laserWidth !== undefined) this.laserWidth = laserWidth;
    if (laserHeight !== undefined) this.laserHeight = laserHeight;
  }
}
