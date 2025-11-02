/**
 * Scrolling Ground System
 * Handles smooth horizontal scrolling of repeating ground image (foreground layer)
 */

import { GROUND_SCROLL_SPEED, GROUND_HEIGHT_EXTENSION } from '../config/gameConfig';

export class ScrollingGround {
  private offsetX: number = 0;
  private imageWidth: number = 0;
  private imageHeight: number = 0;
  private image: HTMLImageElement | null = null;
  private imageLoaded: boolean = false;

  constructor(imagePath: string) {
    this.image = new Image();
    this.image.onload = () => {
      this.imageWidth = this.image!.width;
      this.imageHeight = this.image!.height;
      this.imageLoaded = true;
      console.log(`Ground image loaded: ${imagePath} (${this.imageWidth}x${this.imageHeight})`);
    };
    this.image.onerror = (error) => {
      console.error(`Failed to load ground image: ${imagePath}`, error);
    };
    this.image.src = imagePath;
    console.log(`Loading ground image from: ${imagePath}`);
  }

  /**
   * Update ground offset for scrolling animation
   */
  update(): void {
    if (!this.imageLoaded) return;

    // Move ground to the left (faster than background for parallax effect)
    this.offsetX -= GROUND_SCROLL_SPEED;
  }

  /**
   * Render the scrolling ground at the bottom of the screen
   */
  render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    if (!this.imageLoaded || !this.image) return;

    // Ground maintains its original aspect ratio and is positioned at the bottom
    // Calculate scale based on canvas width to ensure ground fills the width
    const scale = canvasWidth / this.imageWidth;
    const scaledWidth = this.imageWidth * scale;
    const scaledHeight = this.imageHeight * scale;

    // Add extra height while maintaining aspect ratio
    // Adjust GROUND_HEIGHT_EXTENSION in gameConfig.ts to experiment!
    const heightScale = (scaledHeight + GROUND_HEIGHT_EXTENSION) / scaledHeight;
    const adjustedWidth = scaledWidth * heightScale;
    const adjustedHeight = scaledHeight + GROUND_HEIGHT_EXTENSION;

    // Position at the bottom of the screen (adjusted for new height)
    const yPosition = canvasHeight - adjustedHeight;

    // Use the modulo operator to wrap the offset, creating a seamless loop
    const wrappedOffsetX = this.offsetX % adjustedWidth;

    // Draw multiple copies to fill the screen width and create seamless scrolling
    // Add 1px overlap to prevent black lines from rounding errors
    for (let x = wrappedOffsetX; x < canvasWidth + 2; x += adjustedWidth) {
      ctx.drawImage(this.image, x, yPosition, adjustedWidth + 1, adjustedHeight);
    }
  }

  /**
   * Reset ground position
   */
  reset(): void {
    this.offsetX = 0;
  }

  /**
   * Update dimensions if window is resized
   */
  updateDimensions(_width: number, _height: number): void {
    // Ground scales automatically based on canvas size
    // No additional updates needed
  }
}
