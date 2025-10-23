/**
 * Scrolling Background System
 * Handles smooth horizontal scrolling of repeating background image
 */

import { BACKGROUND_SCROLL_SPEED, BACKGROUND_HEIGHT_SCALE } from '../config/gameConfig';

export class ScrollingBackground {
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
      console.log(`Background image loaded: ${imagePath} (${this.imageWidth}x${this.imageHeight})`);
    };
    this.image.onerror = (error) => {
      console.error(`Failed to load background image: ${imagePath}`, error);
    };
    this.image.src = imagePath;
    console.log(`Loading background image from: ${imagePath}`);
  }

  /**
   * Update background offset for scrolling animation
   */
  update(): void {
    if (!this.imageLoaded) return;

    // Move background to the left
    this.offsetX -= BACKGROUND_SCROLL_SPEED;

    // Reset offset when it reaches the image width for seamless loop
    if (Math.abs(this.offsetX) >= this.imageWidth) {
      this.offsetX = 0;
    }
  }

  /**
   * Render the scrolling background
   */
  render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    if (!this.imageLoaded || !this.image) return;

    // Calculate scale to fit height with additional height scale factor
    const scale = (canvasHeight * BACKGROUND_HEIGHT_SCALE) / this.imageHeight;
    const scaledWidth = this.imageWidth * scale;
    const scaledHeight = this.imageHeight * scale;

    // Anchor to bottom of screen (extra height grows upwards)
    const yOffset = canvasHeight - scaledHeight;

    // Draw multiple copies to fill the screen and create seamless scrolling
    const numCopies = Math.ceil(canvasWidth / scaledWidth) + 2;

    for (let i = 0; i < numCopies; i++) {
      const x = this.offsetX + (i * scaledWidth);
      ctx.drawImage(
        this.image,
        x,
        yOffset,
        scaledWidth,
        scaledHeight
      );
    }
  }

  /**
   * Reset background position
   */
  reset(): void {
    this.offsetX = 0;
  }

  /**
   * Update dimensions if window is resized
   */
  updateDimensions(_width: number, _height: number): void {
    // Background scales automatically based on canvas size
    // No additional updates needed
  }
}
