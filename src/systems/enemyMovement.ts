/**
 * Enemy Movement System
 * Handles enemy positioning during hover mode
 * Extracted from LaserPhysics to separate concerns
 */

import {
  ENEMY_MOVE_SPEED,
  ENEMY_MOVEMENT_DELAY,
  ENEMY_FLOAT_ENABLED,
  ENEMY_FLOAT_AMPLITUDE,
  ENEMY_FLOAT_FREQUENCY,
  ENEMY_FLOAT_SETTLE_OSCILLATIONS,
  INTRO_TRANSITION_DAMPING,
} from '../config/gameConfig';

export class EnemyMovement {
  private enemyY: number;
  private targetEnemyY: number;
  private startEnemyY: number;
  private pendingTargetY: number | null = null;
  private movementDelayTimer: number = 0;
  private enemyVelocity: number = 0;
  private transitionVelocity: number = 0;
  private enemyScaleX: number = 1;
  private enemyScaleY: number = 1;

  // Floating oscillation state
  private floatPhase: number = 0;
  private settlePhase: number = 0;
  private settleAmplitude: number = 0;
  private isInSettleMode: boolean = false;

  constructor(initialY: number) {
    this.enemyY = initialY;
    this.targetEnemyY = initialY;
    this.startEnemyY = initialY;
  }

  /**
   * Get current enemy Y position
   */
  getCurrentY(): number {
    return this.enemyY;
  }

  /**
   * Get current enemy scale (for squash/stretch animation)
   */
  getScale(): { scaleX: number; scaleY: number } {
    return {
      scaleX: this.enemyScaleX,
      scaleY: this.enemyScaleY,
    };
  }

  /**
   * Set new target position for enemy to move to
   * Called when a laser fires
   */
  setTarget(targetY: number): void {
    this.pendingTargetY = targetY;
    this.movementDelayTimer = ENEMY_MOVEMENT_DELAY;
  }

  /**
   * Start hover mode with initial velocity from physics transition
   * Creates smooth deceleration from bouncing to hovering
   */
  startTransition(initialVelocity: number, currentY: number): void {
    this.transitionVelocity = -initialVelocity; // Negate because physics uses inverted Y
    this.enemyY = currentY;
    this.targetEnemyY = currentY;
    this.startEnemyY = currentY;
  }

  /**
   * Update enemy position and animation for one frame
   */
  update(): void {
    // Handle pending target (from laser firing)
    if (this.pendingTargetY !== null) {
      if (this.movementDelayTimer > 0) {
        this.movementDelayTimer -= 16.67;
      }
      if (this.movementDelayTimer <= 0) {
        this.startEnemyY = this.enemyY;
        this.targetEnemyY = this.pendingTargetY;
        this.pendingTargetY = null;
        this.isInSettleMode = false;
      }
    }

    const previousY = this.enemyY;

    // Apply transition velocity (from physics → hover handoff)
    if (Math.abs(this.transitionVelocity) > 0.1) {
      this.enemyY += this.transitionVelocity;
      this.transitionVelocity *= INTRO_TRANSITION_DAMPING;

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
        if (ENEMY_FLOAT_ENABLED && !this.isInSettleMode) {
          this.isInSettleMode = true;
          this.settlePhase = 0;
          this.settleAmplitude = ENEMY_FLOAT_AMPLITUDE * 1.5;
        }
      }
    }

    this.applyFloatingOscillation();
    this.enemyVelocity = this.enemyY - previousY;
    this.updateScale();
  }

  /**
   * Apply floating oscillation (continuous bobbing + settle bounce)
   */
  private applyFloatingOscillation(): void {
    if (!ENEMY_FLOAT_ENABLED) return;

    let floatOffset = 0;
    this.floatPhase += ENEMY_FLOAT_FREQUENCY;
    if (this.floatPhase > Math.PI * 2) {
      this.floatPhase -= Math.PI * 2;
    }
    floatOffset = Math.sin(this.floatPhase) * ENEMY_FLOAT_AMPLITUDE;

    // Settle oscillation (dampened bounce after reaching target)
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

  /**
   * Update squash/stretch scale based on velocity
   */
  private updateScale(): void {
    let targetScaleX = 1;
    let targetScaleY = 1;
    const velocity = this.enemyVelocity;
    const onFloor = Math.abs(this.enemyY - this.targetEnemyY) < 1;

    if (Math.abs(velocity) > 0.1) {
      if (velocity < 0) {
        // Moving up
        targetScaleY = 1 - Math.abs(velocity) / 15;
        targetScaleX = 1 + Math.abs(velocity) / 15;
      } else {
        // Moving down
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

    // Smooth interpolation
    this.enemyScaleX += (targetScaleX - this.enemyScaleX) * 0.15;
    this.enemyScaleY += (targetScaleY - this.enemyScaleY) * 0.15;
  }

  /**
   * Reset to initial state
   */
  reset(centerY: number): void {
    this.enemyY = centerY;
    this.targetEnemyY = centerY;
    this.startEnemyY = centerY;
    this.pendingTargetY = null;
    this.movementDelayTimer = 0;
    this.enemyVelocity = 0;
    this.transitionVelocity = 0;
    this.enemyScaleX = 1;
    this.enemyScaleY = 1;
    this.floatPhase = 0;
    this.settlePhase = 0;
    this.settleAmplitude = 0;
    this.isInSettleMode = false;
  }
}
