/**
 * Scrolling Background System
 * Handles smooth horizontal scrolling of repeating background image
 * Uses offscreen canvas caching for better performance on mobile
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
  private cachedTile: HTMLCanvasElement | null = null;
  private cachedTileWidth: number = 0;
  private cachedTileHeight: number = 0;

  // Slowdown properties
  private isSlowingDown: boolean = false;
  private slowdownStartTime: number = 0;
  private slowdownDuration: number = 0;
  private initialSpeed: number = 0;
  private currentScrollSpeed: number = BACKGROUND_SCROLL_SPEED;

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
   * Starts the process of slowing down the background scroll speed to zero over a specified duration.
   * @param duration The time in milliseconds over which to slow down.
   */
  startSlowingDown(duration: number): void {
    if (!this.isSlowingDown) {
      this.isSlowingDown = true;
      this.slowdownStartTime = performance.now();
      this.slowdownDuration = duration;
      this.initialSpeed = this.currentScrollSpeed;
    }
  }

  /**
   * Immediately pause or resume scrolling without altering offsets.
   */
  setPaused(paused: boolean): void {
    if (paused) {
      this.isSlowingDown = false;
      this.currentScrollSpeed = 0;
    } else {
      this.isSlowingDown = false;
      this.currentScrollSpeed = BACKGROUND_SCROLL_SPEED;
    }
  }

  /**
   * Update background offset for scrolling animation. Handles deceleration if triggered.
   */
  update(): void {
    if (!this.imageLoaded) return;

    if (this.isSlowingDown) {
      const elapsedTime = performance.now() - this.slowdownStartTime;
      if (elapsedTime < this.slowdownDuration) {
        const progress = elapsedTime / this.slowdownDuration;
        // Ease-out quint function for a smoother stop: t => 1 - Math.pow(1 - t, 5)
        const easing = 1 - Math.pow(1 - progress, 5);
        this.currentScrollSpeed = this.initialSpeed * (1 - easing);
      } else {
        this.currentScrollSpeed = 0;
        this.isSlowingDown = false;
      }
    }

    // Move background to the left
    this.offsetX -= this.currentScrollSpeed;
  }

  /**
   * Render the scrolling background
   * If in transition, scrolls in from right; otherwise loops normally
   * Uses offscreen canvas caching to avoid re-rendering the same tile
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

    // Check if we need to create/update the cached tile
    if (!this.cachedTile || this.cachedTileWidth !== scaledWidth || this.cachedTileHeight !== scaledHeight) {
      this.cachedTile = document.createElement('canvas');
      this.cachedTile.width = Math.ceil(scaledWidth) + 1; // +1 to prevent gaps
      this.cachedTile.height = scaledHeight;
      this.cachedTileWidth = scaledWidth;
      this.cachedTileHeight = scaledHeight;

      const cacheCtx = this.cachedTile.getContext('2d');
      if (!cacheCtx) return;

      // Render tile to offscreen canvas once
      cacheCtx.drawImage(this.image, 0, 0, this.cachedTile.width, scaledHeight);
      console.log(`📦 Scrolling background tile cached at ${this.cachedTile.width}x${scaledHeight}`);
    }

    // Calculate how far we've scrolled since transition started
    const scrolledSinceTransition = Math.abs(this.offsetX - this.transitionOffsetX);

    // Start the forest at the right edge and scroll it in
    const forestStartX = canvasWidth - scrolledSinceTransition;

    // To guarantee coverage under large camera pans, expand draw range by one tile on both sides
    const leftMargin = -scaledWidth;
    const rightMargin = canvasWidth + scaledWidth;

    // Check if we've scrolled far enough that the forest should loop
    if (forestStartX + scaledWidth < 0) {
      // Forest has fully scrolled in - now loop normally
      const wrappedOffsetX = this.offsetX % scaledWidth;
      for (let x = wrappedOffsetX + leftMargin; x < rightMargin; x += scaledWidth) {
        ctx.drawImage(this.cachedTile, x, 0);
      }
    } else {
      // Still scrolling in - only draw from the visible right edge inward
      // Avoid drawing a left tile that would prematurely cover the whole screen
      const start = Math.max(forestStartX, 0);
      for (let x = start; x < rightMargin; x += scaledWidth) {
        ctx.drawImage(this.cachedTile, x, 0);
      }
    }
  }

  /**
   * Reset background position and scroll speed.
   */
  reset(): void {
    this.offsetX = 0;
    this.isSlowingDown = false;
    this.currentScrollSpeed = BACKGROUND_SCROLL_SPEED;
    this.transitionStarted = false;
    this.transitionOffsetX = 0;
  }

  /**
   * Adjust the scroll offset (used for camera pan positioning)
   */
  adjustOffset(deltaX: number): void {
    this.offsetX += deltaX;
  }

  /**
   * Update dimensions if window is resized
   */
  updateDimensions(_width: number, _height: number): void {
    // Background scales automatically based on canvas size
    // No additional updates needed
  }
}
