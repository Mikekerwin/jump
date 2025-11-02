/**
 * Scrolling Background System
 * Handles smooth horizontal scrolling of repeating background image
 */

import { BACKGROUND_SCROLL_SPEED } from '../config/gameConfig';

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
  }

  /**
   * Render the scrolling background
   */
  render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    if (!this.imageLoaded || !this.image) return;

    // Calculate scale to fit height and maintain aspect ratio
    const scale = canvasHeight / this.imageHeight;
    const scaledWidth = this.imageWidth * scale;
    const scaledHeight = canvasHeight;

    // Use the modulo operator to wrap the offset, creating a seamless loop.
    const wrappedOffsetX = this.offsetX % scaledWidth;

    // Draw multiple copies to fill the screen and create seamless scrolling.
    // Start from the wrapped offset and continue until the entire canvas width is covered.
    for (let x = wrappedOffsetX; x < canvasWidth; x += scaledWidth) {
      ctx.drawImage(this.image, x, 0, scaledWidth, scaledHeight);
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
