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
  private transitionStarted: boolean = false;
  private transitionOffsetX: number = 0;
  private imagePath: string;

  constructor(imagePath: string, lazyLoad: boolean = false) {
    this.imagePath = imagePath;

    if (!lazyLoad) {
      // Load immediately if not lazy loading
      this.loadImage();
    } else {
      console.log(`Background image set to lazy load: ${imagePath}`);
    }
  }

  /**
   * Load the image (can be called immediately or deferred for lazy loading)
   */
  private loadImage(): void {
    if (this.image) return; // Already loading or loaded

    this.image = new Image();
    this.image.onload = () => {
      this.imageWidth = this.image!.width;
      this.imageHeight = this.image!.height;
      this.imageLoaded = true;
      console.log(`Background image loaded: ${this.imagePath} (${this.imageWidth}x${this.imageHeight})`);
    };
    this.image.onerror = (error) => {
      console.error(`Failed to load background image: ${this.imagePath}`, error);
    };
    this.image.src = this.imagePath;
    console.log(`Loading background image from: ${this.imagePath}`);
  }

  /**
   * Trigger lazy loading of the image (call when approaching score threshold)
   */
  public triggerLoad(): void {
    if (!this.imageLoaded && !this.image) {
      console.log(`Triggering lazy load for: ${this.imagePath}`);
      this.loadImage();
    }
  }

  /**
   * Start the transition (begin scrolling in from right)
   */
  startTransition(): void {
    if (!this.transitionStarted) {
      this.transitionStarted = true;
      this.transitionOffsetX = this.offsetX;
      console.log('Forest trees background: Starting scroll-in transition');
    }
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
   * If in transition, scrolls in from right; otherwise loops normally
   */
  render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    if (!this.imageLoaded || !this.image) return;

    // Calculate scale to fit height and maintain aspect ratio
    const scale = canvasHeight / this.imageHeight;
    const scaledWidth = this.imageWidth * scale;
    const scaledHeight = canvasHeight;

    if (!this.transitionStarted) {
      // Not yet started - don't render anything
      return;
    }

    // Calculate how far we've scrolled since transition started
    const scrolledSinceTransition = Math.abs(this.offsetX - this.transitionOffsetX);

    // Start the forest at the right edge and scroll it in
    const forestStartX = canvasWidth - scrolledSinceTransition;

    // Check if we've scrolled far enough that the forest should loop
    if (forestStartX + scaledWidth < 0) {
      // Forest has fully scrolled in - now loop normally
      const wrappedOffsetX = this.offsetX % scaledWidth;
      for (let x = wrappedOffsetX; x < canvasWidth + 1; x += scaledWidth) {
        ctx.drawImage(this.image, x, 0, scaledWidth + 1, scaledHeight);
      }
    } else {
      // Still scrolling in - draw forest tiles starting from forestStartX
      for (let x = forestStartX; x < canvasWidth + 1; x += scaledWidth) {
        ctx.drawImage(this.image, x, 0, scaledWidth + 1, scaledHeight);
      }
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
