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

    // Reset speed when new laser is added
    if (this.numLasers > prevNumLasers) {
      this.baseSpeed = BASE_LASER_SPEED;
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
   * Calculate current laser speed based on score
   */
  private getCurrentSpeed(score: number): number {
    const speedIncrements = Math.floor(score / SCORE_PER_SPEED_INCREMENT) % SPEED_INCREMENTS_PER_CYCLE;
    return this.baseSpeed + LASER_SPEED_INCREMENT * speedIncrements;
  }

  /**
   * Update all lasers for one frame
   * Returns score change and hit status
   */
  update(
    score: number,
    playerPosition: Position,
    playerHasJumped: boolean
  ): { scoreChange: number; wasHit: boolean } {
    this.currentScore = score; // Update score for chaos calculation
    const currentSpeed = this.getCurrentSpeed(score);
    let scoreChange = 0;
    let wasHit = false;

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

    return { scoreChange, wasHit };
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
