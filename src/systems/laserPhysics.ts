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
  LASER_SPEED_INCREMENT,
  LASER_SPEED_REDUCTION_ON_UNLOCK,
  LASER_SPEED_GRADUAL_REDUCTION,
  LASER_SPEED_AT_SCORE_50,
  LASER_SPEED_AT_SCORE_75,
  LASER_SPEED_TRANSITION_DURATION,
  MAX_LASERS,
  SCORE_PER_LASER_UNLOCK,
  SCORE_PER_SPEED_INCREMENT,
  SPEED_INCREMENTS_PER_CYCLE,
  BALL_SIZE,
  ENEMY_MOVE_SPEED,
  ENEMY_MOVEMENT_DELAY,
  ENEMY_SETTLE_THRESHOLD,
  ENEMY_BOUNCE_AMPLITUDE,
  ENEMY_OSCILLATION_DAMPING,
  ENEMY_MIN_OSCILLATION_VELOCITY,
  CHAOS_INCREMENT_INTERVAL,
  BASE_LASER_RANDOMNESS,
  CHAOS_MULTIPLIER_PER_INTERVAL,
} from '../config/gameConfig';
import {
  ENEMY_WIDTH_GROWTH_PER_CYCLE,
  ENEMY_HEIGHT_GROWTH_PER_CYCLE,
} from '../config/gameConfig';

export class LaserPhysics {
  private lasers: LaserState[] = [];
  private numLasers: number = 1;
  private baseSpeed: number = BASE_LASER_SPEED;
  private speedResetScore: number = -1; // Track when speed was last reset (for score 50 logic)
  private isTransitioningSpeed: boolean = false; // Track if speed is currently transitioning
  private transitionStartSpeed: number = 0; // Speed at start of transition
  private transitionTargetSpeed: number = 0; // Target speed for transition
  private transitionProgress: number = 0; // Progress of transition (0 to 1)
  private enemyY: number;
  private targetEnemyY: number; // Target Y position for smooth movement
  private pendingTargetY: number | null = null; // Delayed target position
  private movementDelayTimer: number = 0; // Timer for movement delay
  private enemyVelocity: number = 0; // Track movement velocity for squash/stretch
  private oscillationVelocity: number = 0; // Velocity for settling bounce/oscillation
  private isSettling: boolean = false; // Whether enemy is in settling/oscillation mode
  private currentScore: number = 0; // Track current score for chaos calculation
  private laserSpawnCounter: number = 0; // New: Counter for alternating laser widths
  private enemyGrowthLevel: number = 0; // How many times the enemy has grown
  private centerY: number;
  private minLaserY: number;
  private enemyX: number;

  constructor(screenWidth: number, screenHeight: number, centerY: number, enemyX: number) {
    this.centerY = centerY;
    this.minLaserY = screenHeight * 0.5;
    this.enemyY = centerY;
    this.targetEnemyY = centerY;
    this.enemyX = enemyX;
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
   * This ensures that one laser is normal width, the next is double width, and so on.
   * This pattern activates when the score is 100 or more.
   */
  private getNextLaserWidth(): number {
    if (this.currentScore >= 100) { // Apply alternating width from score 100
      return (this.laserSpawnCounter++ % 2 === 0) ? LASER_WIDTH : LASER_WIDTH * 2;
    }
    return LASER_WIDTH;
  }

  /**
   * Generate a random Y position for laser spawn
   * Chaos increases every 5 points, resets at each 25-point threshold
   */
  private generateRandomLaserY(score: number): number {
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
   * Initialize lasers at starting positions
   */
  private initializeLasers(): void {
    const currentEnemyWidth = BALL_SIZE + (this.enemyGrowthLevel * ENEMY_WIDTH_GROWTH_PER_CYCLE);
    const firstLaserY = this.centerY;
    const nextLaserY = this.generateRandomLaserY(0);

    this.lasers = [
      {
        x: this.enemyX + currentEnemyWidth / 2, // Spawn from enemy center X
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
   */
  updateLaserCount(score: number): void {
    this.currentScore = score; // Update score for chaos calculation

    const extraLasers = Math.floor(score / SCORE_PER_LASER_UNLOCK);
    const prevNumLasers = this.numLasers;
    this.numLasers = Math.min(extraLasers + 1, MAX_LASERS);

    // Reduce speed when new laser is added
    if (this.numLasers > prevNumLasers) {
      // Special case: Reset total speed to specific value at score 50 (3rd laser)
      if (this.numLasers === 3) {
        // Start smooth transition to new speed
        this.transitionStartSpeed = this.getCurrentSpeed(score);
        this.transitionTargetSpeed = LASER_SPEED_AT_SCORE_50;
        this.transitionProgress = 0;
        this.isTransitioningSpeed = true;

        // Reset baseSpeed and track when we reset
        this.baseSpeed = LASER_SPEED_AT_SCORE_50;
        this.speedResetScore = score; // Remember we reset at this score
      }
      // Special case: Reset total speed to specific value at score 75 (4th laser)
      else if (this.numLasers === 4) {
        // Start smooth transition to new speed
        this.transitionStartSpeed = this.getCurrentSpeed(score);
        this.transitionTargetSpeed = LASER_SPEED_AT_SCORE_75;
        this.transitionProgress = 0;
        this.isTransitioningSpeed = true;

        // Reset baseSpeed and track when we reset
        this.baseSpeed = LASER_SPEED_AT_SCORE_75;
        this.speedResetScore = score; // Remember we reset at this score
      }
      else {
        this.baseSpeed = Math.max(1, this.baseSpeed - LASER_SPEED_REDUCTION_ON_UNLOCK);
      }
    }

    // Adjust laser array
    while (this.lasers.length < this.numLasers) {
      const currentEnemyWidth = BALL_SIZE + (this.enemyGrowthLevel * ENEMY_WIDTH_GROWTH_PER_CYCLE);
      const newLaserY = this.generateRandomLaserY(score);
      // When a new laser is added, ensure its initial width follows the alternating pattern
      this.lasers.push({
        x: this.enemyX + currentEnemyWidth / 2, // Spawn from enemy center X
        y: newLaserY,
        hit: false,
        scored: false,
        passed: false,
        nextY: this.generateRandomLaserY(score), // Pre-calculate next position
        width: this.getNextLaserWidth(), // Use new method for new lasers
      });
    }
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
   * Calculate current laser speed based on score
   * Level 1 (0-99): Speed increases by LASER_SPEED_INCREMENT every SCORE_PER_SPEED_INCREMENT points
   * Level 2 (100+): Speed stays constant at the value when entering Level 2
   * Between scores 25-50, gradual reduction is applied
   */
  private getCurrentSpeed(score: number): number {
    let speed: number;

    // Level 2: Speed is constant (no incremental increases)
    if (score >= 100) {
      // If we've reset speed (at score 50 or 75), use that base speed
      if (this.speedResetScore >= 0 && this.speedResetScore >= 50) {
        speed = this.baseSpeed; // Just use base speed, no increments
      } else {
        // Calculate what the speed was at score 99 and keep it constant
        const speedIncrements = Math.floor(99 / SCORE_PER_SPEED_INCREMENT);
        speed = this.baseSpeed + (LASER_SPEED_INCREMENT * speedIncrements);
      }
    }
    // Level 1: Normal incremental speed
    else if (this.speedResetScore >= 0 && score > this.speedResetScore) {
      // Calculate how many increments have happened since the reset
      const incrementsSinceReset = Math.floor((score - this.speedResetScore) / SCORE_PER_SPEED_INCREMENT);
      speed = this.baseSpeed + (LASER_SPEED_INCREMENT * incrementsSinceReset);
    } else {
      // Normal incremental speed calculation before reset
      const speedIncrements = Math.floor(score / SCORE_PER_SPEED_INCREMENT);
      speed = this.baseSpeed + (LASER_SPEED_INCREMENT * speedIncrements);

      // Apply gradual reduction between scores 25-50
      if (score > 25 && score < 50) {
        const pointsPast25 = score - 25;
        const reduction = pointsPast25 * LASER_SPEED_GRADUAL_REDUCTION;
        speed -= reduction;
      }
    }

    // If transitioning, interpolate between start and target speed
    if (this.isTransitioningSpeed) {
      const easedProgress = this.easeOutCubic(this.transitionProgress);
      speed = this.transitionStartSpeed + (this.transitionTargetSpeed - this.transitionStartSpeed) * easedProgress;
    }

    return speed;
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

    // Update speed transition progress
    if (this.isTransitioningSpeed) {
      // Increment progress (assuming ~16.67ms per frame at 60 FPS)
      this.transitionProgress += 16.67 / LASER_SPEED_TRANSITION_DURATION;
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
        this.isTransitioningSpeed = false; // Transition complete
      }
    }

    const currentSpeed = this.getCurrentSpeed(score);
    let scoreChange = 0;
    let wasHit = false;
    let enemyHitCount = 0; // Track enemy hits on player

    this.lasers.forEach((laser) => {
      // Move laser
      laser.x -= currentSpeed;

      // Check if player passed without jumping (penalty)
      if (!laser.hit && !laser.passed && playerPosition.x > laser.x + LASER_WIDTH) {
        laser.passed = true;
        if (!playerHasJumped) {
          scoreChange -= 1;
        }
      }

      // Respawn laser when off screen
      const laserWidth = laser.width || LASER_WIDTH;
      if (laser.x + laserWidth < 0) {
        const currentEnemyWidth = BALL_SIZE + (this.enemyGrowthLevel * ENEMY_WIDTH_GROWTH_PER_CYCLE);
        const currentEnemyHeight = BALL_SIZE + (this.enemyGrowthLevel * ENEMY_HEIGHT_GROWTH_PER_CYCLE);
        // Spawn laser from enemy's current center position
        laser.x = this.enemyX + currentEnemyWidth / 2;
        laser.y = this.enemyY + currentEnemyHeight / 2; // Spawn from enemy's current center Y
        laser.hit = false;
        laser.scored = false;
        laser.passed = false;
        // Use the new method for respawned lasers to maintain the alternating pattern
        laser.width = this.getNextLaserWidth();
        // Calculate the NEXT spawn position with chaos based on current score
        laser.nextY = this.generateRandomLaserY(this.currentScore);

        // Set up delayed movement to next position
        this.pendingTargetY = laser.nextY;
        this.movementDelayTimer = ENEMY_MOVEMENT_DELAY;
      }

      // Check collision with player (use laser's custom width if set)
      const currentLaserWidth = laser.width || LASER_WIDTH;
      if (
        !laser.hit &&
        playerPosition.x + BALL_SIZE > laser.x &&
        playerPosition.x < laser.x + currentLaserWidth &&
        playerPosition.y + BALL_SIZE > laser.y && // Player bottom vs laser top
        playerPosition.y < laser.y + LASER_HEIGHT // Player top vs laser bottom
      ) {
        laser.hit = true;
        wasHit = true;
        enemyHitCount++; // Increment enemy hit counter

        // Make laser disappear (respawn) when it hits the player
        const currentEnemyWidth = BALL_SIZE + (this.enemyGrowthLevel * ENEMY_WIDTH_GROWTH_PER_CYCLE);
        const currentEnemyHeight = BALL_SIZE + (this.enemyGrowthLevel * ENEMY_HEIGHT_GROWTH_PER_CYCLE);
        laser.x = this.enemyX + currentEnemyWidth / 2;
        laser.y = this.enemyY + currentEnemyHeight / 2;
        laser.hit = false;
        laser.scored = false;
        laser.passed = false;
        laser.width = this.getNextLaserWidth();
        laser.nextY = this.generateRandomLaserY(this.currentScore);

        // Set up delayed movement to next position
        this.pendingTargetY = laser.nextY;
        this.movementDelayTimer = ENEMY_MOVEMENT_DELAY;
      }

      // Check if player successfully jumped over laser (scoring)
      if (
        !laser.scored &&
        !laser.hit &&
        playerHasJumped &&
        playerPosition.x > laser.x + currentLaserWidth
      ) {
        laser.scored = true;
        scoreChange += 1;
      }
    });

    // Handle movement delay timer
    if (this.movementDelayTimer > 0) {
      // Countdown the delay timer (assuming ~16.67ms per frame at 60 FPS)
      this.movementDelayTimer -= 16.67;

      // When delay expires, start moving to the pending target
      if (this.movementDelayTimer <= 0 && this.pendingTargetY !== null) {
        this.targetEnemyY = this.pendingTargetY;
        this.pendingTargetY = null;
        this.isSettling = false; // Reset settling mode for new movement
      }
    }

    const previousY = this.enemyY;
    const distanceToTarget = Math.abs(this.targetEnemyY - this.enemyY);

    // Check if we should enter settling/oscillation mode
    if (distanceToTarget < ENEMY_SETTLE_THRESHOLD && !this.isSettling) {
      this.isSettling = true;
      // Give it a strong initial bounce velocity for visible overshoot
      // Direction depends on which way we're approaching
      const direction = this.enemyY < this.targetEnemyY ? 1 : -1;
      this.oscillationVelocity = direction * ENEMY_BOUNCE_AMPLITUDE;
    }

    if (this.isSettling) {
      // Physics-based oscillation (like blue ball bouncing)
      this.enemyY += this.oscillationVelocity;

      // Check if we've crossed the target (bounce)
      const crossedTarget =
        (this.oscillationVelocity > 0 && this.enemyY > this.targetEnemyY) ||
        (this.oscillationVelocity < 0 && this.enemyY < this.targetEnemyY);

      if (crossedTarget) {
        // Snap to target and reverse with damping
        this.enemyY = this.targetEnemyY;
        this.oscillationVelocity = -this.oscillationVelocity * ENEMY_OSCILLATION_DAMPING;
      }

      // Stop oscillating when velocity is too small
      if (Math.abs(this.oscillationVelocity) < ENEMY_MIN_OSCILLATION_VELOCITY) {
        this.oscillationVelocity = 0;
        this.enemyY = this.targetEnemyY;
      }
    } else {
      // Normal smooth interpolation when not settling
      this.enemyY += (this.targetEnemyY - this.enemyY) * ENEMY_MOVE_SPEED;
    }

    // Calculate velocity for squash/stretch effect
    this.enemyVelocity = this.enemyY - previousY;

    return { scoreChange, wasHit, enemyHitCount };
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
   * Get enemy squash/stretch scale based on movement velocity
   * Returns { scaleX, scaleY } for morphing effect
   * Squishes in the direction of movement (like blue ball bouncing through liquid)
   */
  getEnemyScale(): number {
    // Calculate the base scale factor based on growth level.
    // Each growth level adds 0.25 to the base scale of 1.
    // This directly implements the requirement: initial 1 + (growthLevel * 0.25).
    return 1 + (this.enemyGrowthLevel * 0.25);
  }

  /**
   * Reset laser system
   */
  reset(): void {
    this.numLasers = 1;
    this.baseSpeed = BASE_LASER_SPEED;
    this.enemyY = this.centerY;
    this.targetEnemyY = this.centerY;
    this.laserSpawnCounter = 0; // Reset counter on game restart
    this.enemyGrowthLevel = 0; // Reset growth on game restart
    this.initializeLasers();
  }

  /**
   * Update dimensions (for window resize)
   */
  updateDimensions(screenWidth: number, screenHeight: number, centerY: number, enemyX: number): void {
    this.centerY = centerY;
    this.minLaserY = screenHeight * 0.5;
    this.enemyX = enemyX;
  }
}
