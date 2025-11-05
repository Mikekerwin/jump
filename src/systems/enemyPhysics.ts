/**
 * Enemy Physics System
 * Handles enemy bouncing, gravity, and automated jump sequence
 * Enemy starts with gravity, does jump sequence, then switches to hover mode
 */

import { PlayerState } from '../types/game';
import {
  INTRO_BOUNCE_1_HOLD_TIME,
  INTRO_BOUNCE_2_HOLD_TIME,
  INTRO_BOUNCE_3_HOLD_TIME,
  INTRO_GROUND_WAIT_TIME,
} from '../config/gameConfig';

export class EnemyPhysics {
  private enemyState: PlayerState;
  private centerY: number;
  private gravity: number;
  private boost: number;
  private holdBoost: number;
  private maxHoldTime: number;
  private energyLoss: number;
  private minBounceVelocity: number;
  private isPhysicsEnabled: boolean = true; // Start with physics enabled
  private isDisabled: boolean = false; // Completely disabled at 10 outs

  // Jump sequence state
  private jumpSequenceActive: boolean = false;
  private jumpSequenceStep: number = 0; // 0 = waiting, 1 = short jump, 2 = medium jump, 3 = long jump, 4 = complete
  private waitingForGround: boolean = false; // Waiting for enemy to land before next jump
  private groundWaitTimer: number = 0; // Timer for 1 second wait on ground
  private descendingTimer: number = 0; // Timer for delay before transitioning to hover
  private hasStartedDescending: boolean = false; // Track if we've started falling

  // Bounce mode state (for 4th, 7th, 10th outs)
  private bounceModeActive: boolean = false;
  private bounceWaitTimer: number = 0;
  private nextBounceWaitTime: number = 0;
  private bounceModeJumpCount: number = 0; // Track jumps during bounce mode

  // Intro animation state (prevents lasers during initial intro only)
  private hasCompletedIntroAnimation: boolean = false;

  constructor(initialX: number, initialY: number, centerY: number, gravity: number, boost: number, holdBoost: number, energyLoss: number, maxHoldTime: number, minBounceVelocity: number) {
    this.centerY = centerY;
    this.gravity = gravity;
    this.boost = boost;
    this.holdBoost = holdBoost; // Use the scaled value from game config
    this.maxHoldTime = maxHoldTime; // Use the value from game config
    this.energyLoss = energyLoss;
    this.minBounceVelocity = minBounceVelocity;

    this.enemyState = {
      position: { x: initialX, y: initialY },
      velocity: 0,
      scaleX: 1,
      scaleY: 1,
      bounceOffsetX: 0,
      bounceOffsetY: 0,
      hasJumped: false,
      isHolding: false,
      holdStartTime: 0,
    };
  }

  /**
   * Start the jump sequence (called when loading screen fades)
   */
  startJumpSequence(): void {
    this.jumpSequenceActive = true;
    this.jumpSequenceStep = 0;
    this.waitingForGround = true; // Start by waiting for first jump
    this.groundWaitTimer = 0;
  }

  /**
   * Enable hover mode (disable physics)
   * Returns the current velocity for smooth transition
   */
  enableHoverMode(): number {
    this.isPhysicsEnabled = false;
    this.bounceModeActive = false; // Stop bounce mode when returning to hover
    this.hasCompletedIntroAnimation = true; // Mark intro as complete (allows laser firing)
    return this.enemyState.velocity;
  }

  /**
   * Enable physics mode (disable hover, enemy falls and bounces)
   */
  enablePhysicsMode(): void {
    this.isPhysicsEnabled = true;
  }

  /**
   * Enable physics mode with initial position and velocity
   * Used for smooth hover → gravity transition (4th, 7th, 10th outs)
   * Mirrors the gravity → hover transition in enableHoverMode()
   */
  enablePhysicsModeWithState(currentY: number, initialVelocity: number = 0): void {
    this.isPhysicsEnabled = true;
    this.enemyState.position.y = currentY;
    this.enemyState.velocity = initialVelocity;
    // Start bounce mode (random bouncing)
    this.bounceModeActive = true;
    this.bounceWaitTimer = 0;
    this.nextBounceWaitTime = this.getRandomWaitTime();
    this.bounceModeJumpCount = 0; // Reset jump counter
  }

  /**
   * Get random wait time between bounces (0-1000ms)
   */
  private getRandomWaitTime(): number {
    return Math.random() * 1000;
  }

  /**
   * Get random jump height (small, medium, or large)
   */
  private getRandomJumpHeight(): number {
    const heights = [
      INTRO_BOUNCE_1_HOLD_TIME,  // Small: 0ms
      INTRO_BOUNCE_2_HOLD_TIME,  // Medium: 400ms
      INTRO_BOUNCE_3_HOLD_TIME,  // Large: 1275ms
    ];
    return heights[Math.floor(Math.random() * heights.length)];
  }

  /**
   * Disable enemy completely (at 10 outs)
   */
  disable(): void {
    this.isDisabled = true;
    this.isPhysicsEnabled = true; // Enable physics so it falls to ground
    this.enemyState.velocity = 0; // Stop any movement
  }

  /**
   * Check if enemy is disabled
   */
  isEnemyDisabled(): boolean {
    return this.isDisabled;
  }

  /**
   * Check if enemy is in hover mode
   */
  isHoverMode(): boolean {
    return !this.isPhysicsEnabled;
  }

  /**
   * Check if enemy is in bounce mode (random bouncing)
   */
  isBounceModeActive(): boolean {
    return this.bounceModeActive;
  }

  /**
   * Check if enemy has completed intro animation (used to enable laser firing)
   */
  hasCompletedIntro(): boolean {
    return this.hasCompletedIntroAnimation;
  }

  /**
   * Check if jump sequence is complete and ready for hover transition
   */
  isReadyForHover(): boolean {
    return !this.jumpSequenceActive && this.jumpSequenceStep === 4;
  }

  /**
   * Get current velocity (for smooth transition to hover)
   */
  getVelocity(): number {
    return this.enemyState.velocity;
  }

  /**
   * Update enemy physics for one frame
   */
  update(): PlayerState {
    // Only apply physics if enabled
    if (this.isPhysicsEnabled && !this.isDisabled) {
      // Apply gravity
      this.enemyState.velocity -= this.gravity;

      // Apply hold boost (same as blue player)
      if (this.enemyState.isHolding) {
        const heldTime = performance.now() - this.enemyState.holdStartTime;
        if (heldTime < this.maxHoldTime) {
          this.enemyState.velocity += this.holdBoost;
        } else {
          this.enemyState.isHolding = false;
        }
      }

      // Update position
      this.enemyState.position.y -= this.enemyState.velocity;

      // Handle floor collision (bounce)
      if (this.enemyState.position.y > this.centerY) {
        this.enemyState.position.y = this.centerY;
        this.enemyState.velocity = -this.enemyState.velocity * this.energyLoss;

        // Stop very small bounces
        if (Math.abs(this.enemyState.velocity) < this.minBounceVelocity) {
          this.enemyState.velocity = 0;
        }

        // Mark that we're on ground for jump sequence (only if we haven't completed all jumps)
        if (this.jumpSequenceActive && !this.waitingForGround && this.jumpSequenceStep < 4) {
          this.waitingForGround = true;
          this.groundWaitTimer = 0;
        }
      }

      // Update squash/stretch animation
      this.updateSquashStretch();
    } else if (this.isDisabled) {
      // If disabled, just sit on the ground
      this.enemyState.position.y = this.centerY;
      this.enemyState.velocity = 0;
      this.enemyState.scaleX = 1;
      this.enemyState.scaleY = 1;
    }

    // Handle jump sequence timing
    if (this.jumpSequenceActive) {
      const isOnGround = this.enemyState.position.y >= this.centerY - 1 && Math.abs(this.enemyState.velocity) < 0.5;

      // If on ground, increment wait timer
      if (isOnGround && this.waitingForGround) {
        this.groundWaitTimer += 16.67; // Assume 60 FPS (~16.67ms per frame)

        // After configured wait time, execute next jump
        if (this.groundWaitTimer >= INTRO_GROUND_WAIT_TIME) {
          this.executeNextJump();
          this.waitingForGround = false;
          this.groundWaitTimer = 0;
        }
      }

      // Check if we should switch to hover mode (after 3rd jump starts descending)
      // Add a 100ms delay before transitioning to let the ball fall a bit
      if (this.jumpSequenceStep === 4 && this.enemyState.velocity < 0) {
        if (!this.hasStartedDescending) {
          this.hasStartedDescending = true;
          this.descendingTimer = 0;
        }

        this.descendingTimer += 16.67; // Assume 60 FPS (~16.67ms per frame)

        if (this.descendingTimer >= 100) { // 100ms delay
          this.jumpSequenceActive = false;
          // Mark as ready for transition but don't disable physics yet
        }
      }
    }

    // Handle bounce mode (random bouncing on 4th, 7th, 10th outs)
    if (this.bounceModeActive) {
      const isOnGround = this.enemyState.position.y >= this.centerY - 1 && Math.abs(this.enemyState.velocity) < 0.5;

      if (isOnGround) {
        this.bounceWaitTimer += 16.67; // Assume 60 FPS (~16.67ms per frame)

        // After waiting, execute a random jump
        if (this.bounceWaitTimer >= this.nextBounceWaitTime) {
          this.bounceModeJumpCount++;

          // After 4 jumps, do one final jump and mark as ready to return to hover
          if (this.bounceModeJumpCount >= 4) {
            // Do a large final jump (like intro animation's 3rd jump)
            this.startJumpWithHold(INTRO_BOUNCE_3_HOLD_TIME);
            this.bounceModeActive = false; // Stop bounce mode
            // The game loop will detect velocity at peak and switch to hover
          } else {
            // Random jump (1-3 jumps)
            const jumpHeight = this.getRandomJumpHeight();
            this.startJumpWithHold(jumpHeight);
          }

          this.bounceWaitTimer = 0;
          this.nextBounceWaitTime = this.getRandomWaitTime();
        }
      }
    }

    return this.enemyState;
  }

  /**
   * Execute the next jump in the sequence
   */
  private executeNextJump(): void {
    this.jumpSequenceStep++;

    if (this.jumpSequenceStep === 1) {
      // Jump 1: Small bounce
      this.startJumpWithHold(INTRO_BOUNCE_1_HOLD_TIME);
    } else if (this.jumpSequenceStep === 2) {
      // Jump 2: Medium bounce
      this.startJumpWithHold(INTRO_BOUNCE_2_HOLD_TIME);
    } else if (this.jumpSequenceStep === 3) {
      // Jump 3: Large bounce (will transition to hover at peak)
      this.startJumpWithHold(INTRO_BOUNCE_3_HOLD_TIME);
      // Mark that we're done with jumps - will switch to hover when descending
      this.jumpSequenceStep = 4;
    }
  }

  /**
   * Start a jump and simulate holding for specified duration
   */
  private startJumpWithHold(holdDuration: number): void {
    // Initial boost (same as blue player)
    this.enemyState.velocity = this.boost;
    this.enemyState.hasJumped = true;
    this.enemyState.isHolding = true;
    // Set holdStartTime so that it will have been "held" for holdDuration ms
    // But limit it so the hold will stop after the specified duration
    this.enemyState.holdStartTime = performance.now() - (this.maxHoldTime - holdDuration);

    // The hold boost will be applied in the update loop until maxHoldTime is reached
  }


  /**
   * Update squash/stretch animation based on velocity (same as blue player)
   */
  private updateSquashStretch(): void {
    let targetScaleX = 1;
    let targetScaleY = 1;

    if (Math.abs(this.enemyState.velocity) > 0.1) {
      if (this.enemyState.velocity > 0) {
        // Moving up - stretch vertically
        targetScaleY = 1 - this.enemyState.velocity / 50;
        targetScaleX = 1 + this.enemyState.velocity / 50;
      } else {
        // Moving down - stretch horizontally
        targetScaleY = 1 + Math.abs(this.enemyState.velocity) / 50;
        targetScaleX = 1 - Math.abs(this.enemyState.velocity) / 50;
      }
    }

    // Squash when on ground
    if (
      this.enemyState.position.y >= this.centerY &&
      Math.abs(this.enemyState.velocity) < 0.5
    ) {
      targetScaleY = 0.7;
      targetScaleX = 1.3;
    }

    // Return to normal when settled
    if (
      Math.abs(this.enemyState.velocity) < 0.01 &&
      this.enemyState.position.y >= this.centerY
    ) {
      targetScaleX = 1;
      targetScaleY = 1;
    }

    // Smooth interpolation (same as blue player)
    this.enemyState.scaleX += (targetScaleX - this.enemyState.scaleX) * 0.15;
    this.enemyState.scaleY += (targetScaleY - this.enemyState.scaleY) * 0.15;

    // Keep bounce offsets at 0 (not used for bounce anymore)
    this.enemyState.bounceOffsetX = 0;
    this.enemyState.bounceOffsetY = 0;
  }

  /**
   * Get current state
   */
  getState(): PlayerState {
    return this.enemyState;
  }

  /**
   * Get current Y position
   */
  getY(): number {
    return this.enemyState.position.y;
  }

  /**
   * Set Y position (for hover mode positioning from laser physics)
   */
  setY(y: number): void {
    this.enemyState.position.y = y;
  }

  /**
   * Update physics values
   */
  updatePhysics(gravity: number, boost: number, holdBoost: number, energyLoss: number, maxHoldTime: number, minBounceVelocity: number): void {
    this.gravity = gravity;
    this.boost = boost;
    this.holdBoost = holdBoost; // Use the scaled value from game config
    this.energyLoss = energyLoss;
    this.maxHoldTime = maxHoldTime;
    this.minBounceVelocity = minBounceVelocity;
  }

  /**
   * Reset enemy state
   */
  reset(centerY: number): void {
    this.centerY = centerY;
    this.enemyState.position.y = centerY;
    this.enemyState.velocity = 0;
    this.enemyState.scaleX = 1;
    this.enemyState.scaleY = 1;
    this.isPhysicsEnabled = true; // Start with physics
    this.isDisabled = false;
    this.jumpSequenceActive = false;
    this.jumpSequenceStep = 0;
    this.descendingTimer = 0;
    this.hasStartedDescending = false;
    this.bounceModeActive = false;
    this.bounceWaitTimer = 0;
    this.nextBounceWaitTime = 0;
    this.hasCompletedIntroAnimation = false; // Reset intro flag for new game
  }
}
