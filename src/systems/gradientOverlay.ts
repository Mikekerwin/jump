/**
 * Gradient Overlay System
 * Renders a vertical gradient from black at bottom to transparent at top
 */

import {
  GRADIENT_OVERLAY_START_COLOR,
  GRADIENT_OVERLAY_END_COLOR,
  GRADIENT_OVERLAY_START_POSITION,
  GRADIENT_OVERLAY_END_POSITION,
} from '../config/gameConfig';

export class GradientOverlay {
  /**
   * Render gradient overlay
   * Uses configurable RGBA colors and positions from gameConfig
   */
  render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    // Create vertical gradient using positions from config
    // Start position: where gradient begins (10% from bottom by default)
    // End position: where gradient ends (90% from bottom / 10% from top by default)
    const gradientStartY = canvasHeight * GRADIENT_OVERLAY_START_POSITION;
    const gradientEndY = canvasHeight * GRADIENT_OVERLAY_END_POSITION;

    const gradient = ctx.createLinearGradient(0, gradientStartY, 0, gradientEndY);

    // Use configurable colors from gameConfig
    gradient.addColorStop(0, GRADIENT_OVERLAY_START_COLOR); // Bottom color
    gradient.addColorStop(1, GRADIENT_OVERLAY_END_COLOR);   // Top color

    // Draw the gradient rectangle covering the entire canvas
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  /**
   * Update dimensions if window is resized
   */
  updateDimensions(_width: number, _height: number): void {
    // No state to update - gradient is calculated on each render
  }
}
