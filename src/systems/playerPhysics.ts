/**
 * Player Physics System
 * Handles player movement, gravity, jumping, and bouncing
 */

import { PlayerState } from '../types/game';
import {
  PLAYER_HORIZONTAL_RANGE_LEFT,
  PLAYER_HORIZONTAL_RANGE_RIGHT,
  GRAVITY,
  ENERGY_LOSS,
  BOOST,
  HOLD_BOOST,
  MAX_HOLD_TIME,
  MIN_BOUNCE_VELOCITY,
} from '../config/gameConfig';

export class PlayerPhysics {
  private playerState: PlayerState;
  private initialX: number;
  private centerY: number;
  private jumpCount: number = 0; // Track number of jumps (0, 1, or 2 for double jump)

  constructor(initialX: number, initialY: number, centerY: number) {
    this.centerY = centerY;
    this.initialX = initialX;
    this.playerState = {
      position: { x: initialX, y: initialY },
      velocity: 0,
      scaleX: 1,
      scaleY: 1,
      hasJumped: false,
      isHolding: false,
      holdStartTime: 0,
    };
  }

  /**
   * Update player physics for one frame
   */
  update(): PlayerState {
    // Apply gravity
    this.playerState.velocity -= GRAVITY;

    // Apply hold boost
    if (this.playerState.isHolding) {
      const heldTime = performance.now() - this.playerState.holdStartTime;
      if (heldTime < MAX_HOLD_TIME) {
        this.playerState.velocity += HOLD_BOOST;
      } else {
        this.playerState.isHolding = false;
      }
    }

    // Update position
    this.playerState.position.y -= this.playerState.velocity;

    // Handle floor collision (bounce)
    if (this.playerState.position.y > this.centerY) {
      this.playerState.position.y = this.centerY;
      this.playerState.velocity = -this.playerState.velocity * ENERGY_LOSS;
      this.playerState.hasJumped = false;
      this.jumpCount = 0; // Reset jump count when touching ground

      // Stop very small bounces
      if (Math.abs(this.playerState.velocity) < MIN_BOUNCE_VELOCITY) {
        this.playerState.velocity = 0;
      }
    }

    // Handle ceiling collision
    if (this.playerState.position.y < 0) {
      this.playerState.position.y = 0;
      this.playerState.velocity = -this.playerState.velocity * ENERGY_LOSS;
    }

    // Update fluid scaling based on velocity and position
    this.updateScaling();

    return this.playerState;
  }

  /**
   * Update player's horizontal position based on mouse/touch input.
   * @param clientX The mouse's X coordinate.
   * @param screenWidth The total width of the screen.
   */
  setMousePosition(clientX: number, screenWidth: number): void {
    const mouseRatio = clientX / screenWidth; // Mouse position as a ratio from 0.0 to 1.0
    const minX = this.initialX - PLAYER_HORIZONTAL_RANGE_LEFT;
    const maxX = this.initialX + PLAYER_HORIZONTAL_RANGE_RIGHT;
    this.playerState.position.x = minX + (mouseRatio * (maxX - minX));
  }

  /**
   * Start a jump (initial press)
   * Supports double jump - can jump up to 2 times before touching ground
   * Second jump has reduced power (60% of first jump)
   */
  startJump(): void {
    // Allow jump if we haven't used both jumps yet
    if (this.jumpCount < 2) {
      // Second jump is weaker than first jump
      const jumpPower = this.jumpCount === 0 ? BOOST : BOOST * 0.6;
      this.playerState.velocity = jumpPower;
      this.playerState.hasJumped = true;
      this.jumpCount++;
    }
    this.playerState.isHolding = true;
    this.playerState.holdStartTime = performance.now();
  }

  /**
   * Stop holding jump
   */
  endJump(): void {
    this.playerState.isHolding = false;
  }

  /**
   * Update player scaling for squash and stretch effect
   */
  private updateScaling(): void {
    let targetScaleX = 1;
    let targetScaleY = 1;

    if (Math.abs(this.playerState.velocity) > 0.1) {
      if (this.playerState.velocity > 0) {
        // Moving up - stretch vertically
        targetScaleY = 1 - this.playerState.velocity / 50;
        targetScaleX = 1 + this.playerState.velocity / 50;
      } else {
        // Moving down - stretch horizontally
        targetScaleY = 1 + Math.abs(this.playerState.velocity) / 50;
        targetScaleX = 1 - Math.abs(this.playerState.velocity) / 50;
      }
    }

    // Squash when on ground
    if (
      this.playerState.position.y >= this.centerY &&
      Math.abs(this.playerState.velocity) < 0.5
    ) {
      targetScaleY = 0.7;
      targetScaleX = 1.3;
    }

    // Return to normal when settled
    if (
      Math.abs(this.playerState.velocity) < 0.01 &&
      this.playerState.position.y >= this.centerY
    ) {
      targetScaleX = 1;
      targetScaleY = 1;
    }

    // Smooth interpolation
    this.playerState.scaleX += (targetScaleX - this.playerState.scaleX) * 0.15;
    this.playerState.scaleY += (targetScaleY - this.playerState.scaleY) * 0.15;
  }

  /**
   * Check if player should trigger a bounce sound
   */
  shouldPlayBounceSound(): boolean {
    return (
      this.playerState.position.y >= this.centerY &&
      Math.abs(this.playerState.velocity) > MIN_BOUNCE_VELOCITY
    );
  }

  /**
   * Get bounce volume based on velocity
   */
  getBounceVolume(): number {
    return Math.min(Math.abs(this.playerState.velocity) / BOOST, 1);
  }

  /**
   * Reset player to initial state
   */
  reset(initialX: number, initialY: number): void {
    this.initialX = initialX;
    this.jumpCount = 0; // Reset jump count
    this.playerState = {
      position: { x: initialX, y: initialY },
      velocity: 0,
      scaleX: 1,
      scaleY: 1,
      hasJumped: false,
      isHolding: false,
      holdStartTime: 0,
    };
  }

  /**
   * Update center Y (for window resize)
   */
  updateCenterY(newCenterY: number): void {
    this.centerY = newCenterY;
    // When resizing, we don't want to snap back to the initial Y if we're in the air
    this.playerState.position.y = newCenterY;
  }

  /**
   * Get current player state
   */
  getState(): PlayerState {
    return this.playerState;
  }

  /**
   * Check if player has jumped (for scoring)
   */
  hasPlayerJumped(): boolean {
    return this.playerState.hasJumped;
  }
}
