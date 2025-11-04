/**
 * Enemy Physics System
 * Handles enemy bouncing, gravity, and automated jump sequence
 * Enemy starts with gravity, does jump sequence, then switches to hover mode
 */

import { PlayerState } from '../types/game';

export class EnemyPhysics {
  private enemyState: PlayerState;
  private centerY: number;
  private gravity: number;
  private boost: number;
  private energyLoss: number;
  private minBounceVelocity: number;
  private isPhysicsEnabled: boolean = true; // Start with physics enabled
  private isDisabled: boolean = false; // Completely disabled at 10 outs

  // Jump sequence state
  private jumpSequenceActive: boolean = false;
  private jumpSequenceStep: number = 0; // 0 = short, 1 = medium, 2 = long
  private jumpSequenceTimer: number = 0;

  constructor(initialX: number, initialY: number, centerY: number, gravity: number, boost: number, energyLoss: number, minBounceVelocity: number) {
    this.centerY = centerY;
    this.gravity = gravity;
    this.boost = boost;
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
    this.jumpSequenceTimer = 0;
    console.log('🔴 Enemy jump sequence started');
  }

  /**
   * Enable hover mode (disable physics)
   */
  enableHoverMode(): void {
    this.isPhysicsEnabled = false;
    console.log('🔴 Enemy hover mode enabled');
  }

  /**
   * Enable physics mode (disable hover, enemy falls and bounces)
   */
  enablePhysicsMode(): void {
    this.isPhysicsEnabled = true;
    console.log('🔴 Enemy physics mode enabled - enemy will fall');
  }

  /**
   * Disable enemy completely (at 10 outs)
   */
  disable(): void {
    this.isDisabled = true;
    this.isPhysicsEnabled = true; // Enable physics so it falls to ground
    this.enemyState.velocity = 0; // Stop any movement
    console.log('🔴 Enemy completely disabled');
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
   * Update enemy physics for one frame
   */
  update(): PlayerState {
    // Handle jump sequence
    if (this.jumpSequenceActive) {
      this.jumpSequenceTimer += 16.67; // Assume 60 FPS

      // Execute jumps at specific intervals
      if (this.jumpSequenceStep === 0 && this.jumpSequenceTimer > 500) {
        // Short jump after 0.5s
        this.executeJump(400); // Short press duration
        this.jumpSequenceStep = 1;
        this.jumpSequenceTimer = 0;
      } else if (this.jumpSequenceStep === 1 && this.jumpSequenceTimer > 800) {
        // Medium jump after 0.8s
        this.executeJump(1000); // Medium press duration
        this.jumpSequenceStep = 2;
        this.jumpSequenceTimer = 0;
      } else if (this.jumpSequenceStep === 2 && this.jumpSequenceTimer > 1000) {
        // Long jump after 1s
        this.executeJump(2000); // Long press duration
        this.jumpSequenceStep = 3;
        this.jumpSequenceTimer = 0;
      } else if (this.jumpSequenceStep === 3 && this.jumpSequenceTimer > 1500) {
        // End sequence after final jump completes
        this.jumpSequenceActive = false;
        this.enableHoverMode(); // Switch to hover mode
      }
    }

    // Only apply physics if enabled
    if (this.isPhysicsEnabled && !this.isDisabled) {
      // Apply gravity
      this.enemyState.velocity -= this.gravity;

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

    return this.enemyState;
  }

  /**
   * Execute a jump with specified hold duration
   */
  private executeJump(holdDuration: number): void {
    if (!this.isPhysicsEnabled) return;

    // Initial boost
    this.enemyState.velocity = this.boost;
    this.enemyState.hasJumped = true;

    // Simulate holding by adding extra boost
    const holdBoost = this.boost * 0.016; // Similar to HOLD_BOOST
    const frames = Math.min(holdDuration / 16.67, 132); // Max ~2.2s
    this.enemyState.velocity += holdBoost * frames;

    console.log(`🔴 Enemy jump executed: duration=${holdDuration}ms, velocity=${this.enemyState.velocity.toFixed(2)}`);
  }

  /**
   * Update squash/stretch animation based on velocity
   */
  private updateSquashStretch(): void {
    const absVelocity = Math.abs(this.enemyState.velocity);

    if (absVelocity > 0.5) {
      const stretch = Math.min(absVelocity / 50, 0.15);
      if (this.enemyState.velocity < 0) {
        // Moving down - compress height, stretch width
        this.enemyState.scaleY = 1 - stretch;
        this.enemyState.scaleX = 1 + stretch * 0.5;
      } else {
        // Moving up - stretch height, compress width
        this.enemyState.scaleY = 1 + stretch;
        this.enemyState.scaleX = 1 - stretch * 0.5;
      }
    } else {
      // Return to normal
      this.enemyState.scaleX = 1;
      this.enemyState.scaleY = 1;
    }
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
  updatePhysics(gravity: number, boost: number, energyLoss: number, minBounceVelocity: number): void {
    this.gravity = gravity;
    this.boost = boost;
    this.energyLoss = energyLoss;
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
  }
}
