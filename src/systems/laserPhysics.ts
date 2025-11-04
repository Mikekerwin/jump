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

  /**
   * Sets the current growth level of the enemy.
   * This is called from the main game loop when the hit counter threshold is met.
   * @param level The new growth level.
   */
  setEnemyGrowthLevel(level: number): void {
    this.enemyGrowthLevel = level;
  }

  /**
   * Directly sets the score for the physics system.
   * Useful for test buttons or other external score modifications.
   */
  setScore(newScore: number): void {
    this.currentScore = newScore;
  }

  /**
   * Determines the width of the next laser to spawn based on an alternating pattern.
   * After score 100, every 15th successful jump creates a wide laser.
   */
  private getNextLaserWidth(): number {
    // Check if wide lasers are unlocked and if it's time for one
    const isWideLaserTime = this.currentScore >= WIDE_LASER_UNLOCK_SCORE &&
                            this.jumpsSinceUnlock > 0 &&
                            this.jumpsSinceUnlock % 15 === 0;

    // Ensure we only spawn one wide laser per 15-jump milestone
    if (isWideLaserTime && this.jumpsSinceUnlock !== this.lastWideLaserJumpCount) {
      this.lastWideLaserJumpCount = this.jumpsSinceUnlock; // Record that we've spawned for this milestone
      return WIDE_LASER_WIDTH;
    }
    return this.laserWidth;
  }

  /**
   * Generate a random Y position for laser spawn
   * Chaos increases every 5 points, resets at each 25-point threshold
   * At score 75+, every 5th laser locks onto player Y position for targeting
   */
  private generateRandomLaserY(score: number, playerY?: number): number {
    // At score 75+, every 5th laser locks onto the player's Y position
    if (score >= 75 && playerY !== undefined && this.lasersSinceLock >= 5) {
      console.log(`🎯 Enemy locking onto player Y: ${playerY}`);
      this.lasersSinceLock = 0; // Reset counter
      return playerY; // Lock onto player's exact Y position
    }

    // Calculate position within current 25-point cycle (0-24)
    const scoreInCycle = score % SCORE_PER_LASER_UNLOCK;

    // Calculate how many 5-point intervals we've passed in this cycle
    const chaosIntervals = Math.floor(scoreInCycle / CHAOS_INCREMENT_INTERVAL);

    // Calculate current chaos multiplier (resets every 25 points)
    const currentChaos = BASE_LASER_RANDOMNESS + (chaosIntervals * CHAOS_MULTIPLIER_PER_INTERVAL);

    // Calculate the range of valid positions
    const fullRange = this.centerY - this.minLaserY;
    const randomRange = fullRange * currentChaos;
    const centerPosition = this.minLaserY + (fullRange / 2);

    // Generate random position within chaos-modified range
    return centerPosition - (randomRange / 2) + (Math.random() * randomRange);
  }

  /**
   * Calculate initial X position for a laser
   * All lasers spawn at enemy position with small stagger for spacing
   */
  private getInitialLaserX(): number {
    // Calculate enemy size with new growth scale system
    const growthScale = 1 + (this.enemyGrowthLevel * GROWTH_SCALE_PER_LEVEL);
    const currentEnemyWidth = this.ballSize * growthScale;
    const enemySpawnX = this.enemyX + currentEnemyWidth / 2;
    return enemySpawnX;
    /*
    // Small stagger: 200-400px between lasers (not across entire screen!) - Replaced by time-based delay
    const STAGGER_DISTANCE = 350; // pixels between each laser
    const offset = laserIndex * STAGGER_DISTANCE;

    return enemySpawnX - offset;
  */ }

  /**
   * Initialize lasers at starting positions
   */
  private initializeLasers(): void {
    const firstLaserY = this.centerY;
    const nextLaserY = this.generateRandomLaserY(0);

    this.lasers = [
      {
        x: this.getInitialLaserX(), // Spawn from enemy center X
        y: firstLaserY,
        hit: false,
        scored: false,
        passed: false,
        nextY: nextLaserY, // Pre-calculate next position
        width: this.getNextLaserWidth(), // Use new method for initial width
      },
    ];

    // Set initial target
    this.targetEnemyY = firstLaserY;
  }

  /**
   * Update laser count based on score
   * NEW DIFFICULTY CURVE:
   * Score 0-24: 3 lasers (old score 25 difficulty)
   * Score 25-49: 4 lasers (old score 50 difficulty)
   * Score 50+: 5 lasers (old score 75 difficulty)
   */
  updateLaserCount(score: number): void {
    this.currentScore = score; // Update score for chaos calculation

    const laserUnlocks = Math.floor(score / SCORE_PER_LASER_UNLOCK);
    const prevNumLasers = this.numLasers;
    // Start with 3 lasers instead of 2 (shift difficulty curve up by 1)
    this.numLasers = Math.min(laserUnlocks + 3, MAX_LASERS);

    // Add new lasers when count increases
    if (this.numLasers > prevNumLasers) {
      // Only add NEW lasers with spacing
      // Don't reposition existing lasers - they keep moving naturally
      while (this.lasers.length < this.numLasers) {
        const newLaserY = this.generateRandomLaserY(score);

        this.lasers.push({
          // CRITICAL FIX: Add new lasers as "inactive" so the spawner can use them.
          // This prevents them from clumping up and firing all at once.
          x: -1000,
          y: newLaserY,
          hit: false,
          scored: false,
          passed: false,
          nextY: this.generateRandomLaserY(score), // Pre-calculate next position
          width: this.getNextLaserWidth(), // Use method for new lasers
        });
      }
    }

    // Remove lasers if count decreased
    while (this.lasers.length > this.numLasers) {
      this.lasers.pop();
    }
  }

  /**
   * Easing function for smooth transitions (ease-out cubic)
   */
  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * Calculate current laser speed - now returns constant speed
   * Simplified: No more speed increments or resets
   */
  private getCurrentSpeed(score: number): number {
    return this.baseSpeed; // Constant speed for all scores
  }

  /**
   * Update all lasers for one frame
   * Returns score change, hit status, and enemy hit count
   */
  update(
    score: number,
    playerPosition: Position,
    playerHasJumped: boolean
  ): { scoreChange: number; wasHit: boolean; enemyHitCount: number } {
    this.currentScore = score; // Update score for chaos calculation
    
    // Sync laser count at the start of the frame to prevent desync issues
    this.updateLaserCount(score);

    // Calculate the correct delay for evenly spaced lasers
    const laserSpeed = this.getCurrentSpeed(score);
    let fireDelay = 0;
    if (laserSpeed > 0 && this.numLasers > 0) {
      if (this.numLasers === 1) {
        // For a single laser, use a fixed, responsive delay instead of waiting for it to cross the screen.
        fireDelay = 300; // A 300ms delay feels quick and engaging.
      } else {
        // For multiple lasers, calculate delay for even spacing.
        const distanceBetweenLasers = this.screenWidth / this.numLasers;
        // Convert from frames (pixels/frame) to milliseconds.
        fireDelay = (distanceBetweenLasers / laserSpeed) * (1000 / 60); // Assuming 60 FPS
      }
    }

    const currentSpeed = this.getCurrentSpeed(score);
    let scoreChange = 0;
    let wasHit = false;
    let enemyHitCount = 0; // Track enemy hits on player
    let hitRegisteredThisFrame = false; // Only count one hit per frame

    // Get the current time once per frame for all timer calculations
    const now = Date.now();

    // --- New Firing Logic: A dedicated spawner ---
    // This timer attempts to fire a laser at a regular interval.
    if (now - this.lastLaserFireTime > fireDelay) {
      // Find an inactive laser to fire. An "inactive" laser is one that is off-screen.
      const inactiveLaser = this.lasers.find(l => l.x < -this.laserWidth);

      if (inactiveLaser) {
        this.lastLaserFireTime = now; // Reset the timer only when a laser is successfully fired

        // Increment laser counter for tracking locking behavior
        this.lasersSinceLock++;

        // Activate the laser from the enemy's current position
        const growthScale = 1 + (this.enemyGrowthLevel * GROWTH_SCALE_PER_LEVEL);
        const currentEnemyHeight = this.ballSize * growthScale;
        inactiveLaser.x = this.getInitialLaserX();
        inactiveLaser.y = this.enemyY + currentEnemyHeight / 2;
        inactiveLaser.hit = false;
        inactiveLaser.scored = false;
        inactiveLaser.passed = false;
        inactiveLaser.width = this.getNextLaserWidth();

        // Set up the enemy's movement to the next random position
        // Pass player Y position for potential locking behavior at score 75+
        const nextY = this.generateRandomLaserY(this.currentScore, playerPosition.y);
        inactiveLaser.nextY = nextY;
        this.pendingTargetY = nextY;
        this.movementDelayTimer = ENEMY_MOVEMENT_DELAY;
      }
    }
    // --- End of New Firing Logic ---


    this.lasers.forEach((laser, laserIndex) => {
      // Move laser
      laser.x -= currentSpeed;

      // Check if laser passed under player (scoring or penalty)
      if (!laser.hit && !laser.passed && playerPosition.x > laser.x + this.laserWidth) {
        laser.passed = true;
        laser.scored = true; // Mark as scored regardless (to prevent double scoring below)
        if (playerHasJumped) {
          // Player jumped over laser successfully - reward!
          scoreChange += 1;
          // If shooting is unlocked, count the jump for the wide laser mechanic
          if (this.currentScore >= WIDE_LASER_UNLOCK_SCORE) {
            this.jumpsSinceUnlock++;
          }
        }
        // Note: we removed the penalty for not jumping, per user request
      }

      // Respawn laser when off screen
      const laserWidth = laser.width || this.laserWidth;
      if (laser.x + laserWidth < -this.laserWidth) { // Laser is well off-screen
        // This laser is now considered "inactive" and available for the spawner to use.
        // We don't need to do anything else here; the spawner will handle it.
        // The check `l.x < -this.laserWidth` in the spawner finds this laser.
      }
      // Check collision with player (use laser's custom width if set)
      const currentLaserWidth = laser.width || this.laserWidth;
      if (
        !laser.hit &&
        playerPosition.x + this.ballSize > laser.x &&
        playerPosition.x < laser.x + currentLaserWidth &&
        playerPosition.y + this.ballSize > laser.y && // Player bottom vs laser top
        playerPosition.y < laser.y + this.laserHeight // Player top vs laser bottom
      ) {
        laser.hit = true;
        wasHit = true;
        // Only count one hit per frame, even if multiple lasers hit
        if (!hitRegisteredThisFrame) {
          // If it's a wide laser, it counts for more hits
          const hitValue = laser.width === WIDE_LASER_WIDTH ? WIDE_LASER_HIT_VALUE : 1;
          enemyHitCount += hitValue;
          hitRegisteredThisFrame = true;
        }

        // When a laser hits the player, immediately make it inactive by moving it off-screen.
        // The spawner will be able to reuse it on its next cycle.
        laser.x = -1000; // Move far off-screen to mark as inactive.
      }

      // Scoring is now handled in the "passed" check above (lines 293-302)
      // This eliminates the duplicate scoring issue
    });

    // Handle movement delay timer
    if (this.pendingTargetY !== null) {
      if (this.movementDelayTimer > 0) {
        // Countdown the delay timer (assuming ~16.67ms per frame at 60 FPS)
        this.movementDelayTimer -= 16.67;
      }

      // When delay expires (or if delay is 0), start moving to the pending target
      if (this.movementDelayTimer <= 0) {
        this.startEnemyY = this.enemyY; // Store starting position for ease-in calculation
        this.targetEnemyY = this.pendingTargetY;
        this.pendingTargetY = null;
        this.isSettling = false; // Reset settling mode for new movement
        this.isInSettleMode = false; // Reset settle oscillations when starting new movement
      }
    }

    const previousY = this.enemyY;
    const distanceToTarget = Math.abs(this.targetEnemyY - this.enemyY);

    // Use ease-in movement (slow start, fast end)
    // Calculate how far we've traveled from the start
    const totalDistance = Math.abs(this.targetEnemyY - this.startEnemyY);
    const distanceTraveled = Math.abs(this.enemyY - this.startEnemyY);
    const progress = totalDistance > 0 ? distanceTraveled / totalDistance : 1;

    // Ease-in: speed increases as progress increases (inverted lerp)
    // Start slow (small speed), end fast (large speed)
    const easeInSpeed = ENEMY_MOVE_SPEED + (progress * ENEMY_MOVE_SPEED * 4);
    this.enemyY += (this.targetEnemyY - this.enemyY) * easeInSpeed;

    // Snap to target when extremely close to avoid floating point drift
    if (distanceToTarget < 0.5) {
      this.enemyY = this.targetEnemyY;
      this.isSettling = false;

      // Start settle oscillations when reaching target
      if (ENEMY_FLOAT_ENABLED && !this.isInSettleMode) {
        this.isInSettleMode = true;
        this.settlePhase = 0;
        this.settleAmplitude = ENEMY_FLOAT_AMPLITUDE * 1.5; // Start with slightly larger amplitude
      }
    }

    // Apply floating oscillation effect
    this.applyFloatingOscillation();

    // Calculate velocity for squash/stretch effect
    this.enemyVelocity = this.enemyY - previousY;

    // Update enemy scale animation based on velocity
    this.updateEnemyScale();

    return { scoreChange, wasHit, enemyHitCount };
  }

  /**
   * Apply floating oscillation effect to enemy Y position
   * Creates a gentle up/down bobbing motion to make the enemy look like it's floating
   * Also adds dampened oscillations when reaching a new target position
   */
  private applyFloatingOscillation(): void {
    if (!ENEMY_FLOAT_ENABLED) return;

    let floatOffset = 0;

    // Continuous floating oscillation (always active)
    this.floatPhase += ENEMY_FLOAT_FREQUENCY;
    if (this.floatPhase > Math.PI * 2) {
      this.floatPhase -= Math.PI * 2; // Keep phase in 0-2π range
    }
    floatOffset = Math.sin(this.floatPhase) * ENEMY_FLOAT_AMPLITUDE;

    // Add settle oscillations when in settle mode
    if (this.isInSettleMode && this.settleAmplitude > 0.1) {
      // Dampened oscillation after reaching target
      this.settlePhase += ENEMY_FLOAT_FREQUENCY * 2; // Faster frequency for settle
      const settleOscillation = Math.sin(this.settlePhase) * this.settleAmplitude;

      // Dampen the amplitude over time (exponential decay)
      this.settleAmplitude *= 0.95;

      // Check if we've completed enough oscillations
      const oscillationsCompleted = this.settlePhase / (Math.PI * 2);
      if (oscillationsCompleted >= ENEMY_FLOAT_SETTLE_OSCILLATIONS) {
        this.isInSettleMode = false;
        this.settleAmplitude = 0;
        this.settlePhase = 0;
      }

      floatOffset += settleOscillation;
    }

    // Apply the combined float offset to enemy Y position
    this.enemyY += floatOffset;
  }

  /**
   * Get all laser states
   */
  getLasers(): LaserState[] {
    return this.lasers;
  }

  /**
   * Get current number of active lasers
   */
  getNumLasers(): number {
    return this.numLasers;
  }

  /**
   * Get enemy Y position (smoothly animated)
   */
  getEnemyY(): number {
    return this.enemyY;
  }

  /**
   * Update enemy scale animation based on movement velocity
   * Similar to player ball's smooth scale interpolation
   * Enemy squashes proportionally to velocity - more squash when moving fast (start),
   * less squash when slowing down (approaching target)
   */
  private updateEnemyScale(): void {
    let targetScaleX = 1;
    let targetScaleY = 1;

    // Apply squash effect proportional to velocity (like player ball)
    const absVelocity = Math.abs(this.enemyVelocity);
    if (absVelocity > 0.05) {
      // Squash is proportional to velocity - starts strong, gradually releases
      // Similar to player ball's velocity / 50 formula
      const squashAmount = Math.min(absVelocity / 3, 0.3); // Cap at 0.3 for realistic squash
      targetScaleY = 1 - squashAmount; // Compress height (0.7 to 1.0)
      targetScaleX = 1; // Keep width constant
    }

    // Smooth interpolation (like player ball)
    this.enemyScaleX += (targetScaleX - this.enemyScaleX) * 0.15;
    this.enemyScaleY += (targetScaleY - this.enemyScaleY) * 0.15;
  }

  /**
   * Get enemy squash/stretch scale
   * Returns current smoothly interpolated scale values
   */
  getEnemyScale(): { scaleX: number; scaleY: number } {
    return { scaleX: this.enemyScaleX, scaleY: this.enemyScaleY };
  }

  /**
   * Reset laser system
   */
  reset(): void {
    this.numLasers = 1;
    this.baseSpeed = BASE_LASER_SPEED;
    this.enemyY = this.centerY;
    this.targetEnemyY = this.centerY;
    this.lastWideLaserJumpCount = 0; // Reset wide laser tracker
    this.jumpsSinceUnlock = 0; // Reset counter on game restart
    this.enemyGrowthLevel = 0; // Reset growth on game restart
    this.lasersSinceLock = 0; // Reset locking counter on game restart

    // Reset floating oscillation state
    this.floatPhase = 0;
    this.settlePhase = 0;
    this.settleAmplitude = 0;
    this.isInSettleMode = false;

    this.initializeLasers();
  }

  /**
   * Update dimensions (for window resize)
   */
  updateDimensions(screenWidth: number, screenHeight: number, centerY: number, enemyX: number, ballSize?: number, laserWidth?: number, laserHeight?: number): void {
    this.centerY = centerY;
    this.minLaserY = screenHeight * 0.2; // Allow enemy to go up to 20% from top (80% of screen height)
    this.enemyX = enemyX;
    if (ballSize !== undefined) this.ballSize = ballSize;
    if (laserWidth !== undefined) this.laserWidth = laserWidth;
    if (laserHeight !== undefined) this.laserHeight = laserHeight;
  }
}
