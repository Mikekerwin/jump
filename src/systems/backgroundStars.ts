/**
 * Background Stars System
 * Handles starfield animation and rendering
 */

import { Star } from '../types/game';
import { NUM_STARS, STAR_SPEED, BACKGROUND_OVERLAY_GRADIENT_START, BACKGROUND_OVERLAY_GRADIENT_END } from '../config/gameConfig';

export class BackgroundStars {
  private stars: Star[] = [];
  private screenWidth: number;
  private screenHeight: number;

  constructor(screenWidth: number, screenHeight: number) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.initializeStars();
  }

  /**
   * Initialize random star positions
   */
  private initializeStars(): void {
    this.stars = Array.from({ length: NUM_STARS }).map(() => ({
      x: Math.random() * this.screenWidth,
      y: Math.random() * this.screenHeight,
      r: Math.random() * 1.5 + 0.5, // radius between 0.5 and 2
    }));
  }

  /**
   * Update star positions
   */
  update(): void {
    this.stars.forEach((star) => {
      star.x -= STAR_SPEED;

      // Wrap around when star goes off screen
      if (star.x < 0) {
        star.x = this.screenWidth;
      }
    });
  }

  /**
   * Render stars to canvas with gradient background overlay
   */
  render(ctx: CanvasRenderingContext2D): void {
    // Create gradient from bottom to top
    const gradient = ctx.createLinearGradient(0, this.screenHeight, 0, 0);
    gradient.addColorStop(0, BACKGROUND_OVERLAY_GRADIENT_START); // Bottom
    gradient.addColorStop(1, BACKGROUND_OVERLAY_GRADIENT_END);   // Top

    // Apply gradient overlay (semi-transparent filter over scrolling background)
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    // Draw all stars on top of overlay
    this.stars.forEach((star) => {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
    });
  }

  /**
   * Reset stars to random positions
   */
  reset(): void {
    this.stars.forEach((star) => {
      star.x = Math.random() * this.screenWidth;
    });
  }

  /**
   * Update dimensions (for window resize)
   */
  updateDimensions(screenWidth: number, screenHeight: number): void {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;

    // Reposition stars that are now out of bounds
    this.stars.forEach((star) => {
      if (star.y > screenHeight) {
        star.y = Math.random() * screenHeight;
      }
      if (star.x > screenWidth) {
        star.x = Math.random() * screenWidth;
      }
    });
  }

  /**
   * Get all stars (for debugging or external rendering)
   */
  getStars(): Star[] {
    return this.stars;
  }
}
