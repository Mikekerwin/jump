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

  // Transition image properties (for forestTransition.webp)
  private transitionImagePath: string | null = null;
  private transitionImage: HTMLImageElement | null = null;
  private transitionImageWidth: number = 0;
  private transitionImageHeight: number = 0;
  private transitionImageLoaded: boolean = false;
  private cachedTransitionTile: HTMLCanvasElement | null = null;
  private cachedTransitionTileWidth: number = 0;
  private cachedTransitionTileHeight: number = 0;

  // Slowdown properties
  private isSlowingDown: boolean = false;
  private slowdownStartTime: number = 0;
  private slowdownDuration: number = 0;
  private initialSpeed: number = 0;
  private currentScrollSpeed: number = BACKGROUND_SCROLL_SPEED;

  constructor(imagePath: string, lazyLoad: boolean = false, transitionImagePath: string | null = null) {
    this.imagePath = imagePath;
    this.transitionImagePath = transitionImagePath;

    if (!lazyLoad) {
      // Load immediately if not lazy loading
      this.loadImage();
      if (transitionImagePath) {
        this.loadTransitionImage();
      }
    } else {
      console.log(`Background image set to lazy load: ${imagePath}`);
      if (transitionImagePath) {
        console.log(`Transition image set to lazy load: ${transitionImagePath}`);
      }
    }
  }

  /**
   * Returns normalized progress (0-1) for the forest transition scroll-in.
   * 0 = transition not visible yet, 1 = forest fully scrolled in and looping.
   */
  getTransitionProgress(canvasWidth: number, canvasHeight: number): number {
    if (!this.transitionStarted || !this.imageHeight) {
      return 0;
    }

    const scale = canvasHeight / this.imageHeight;
    const baseWidth = (this.transitionImageLoaded && this.transitionImageWidth
      ? this.transitionImageWidth
      : this.imageWidth) * scale;
    const totalDistance = baseWidth + canvasWidth;
    if (totalDistance <= 0) {
      return 1;
    }

    const scrolledSinceTransition = Math.abs(this.offsetX - this.transitionOffsetX);
    return Math.min(1, scrolledSinceTransition / totalDistance);
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
   * Load the transition image (for forestTransition.webp)
   */
  private loadTransitionImage(): void {
    if (!this.transitionImagePath || this.transitionImage) return; // No transition image or already loading/loaded

    this.transitionImage = new Image();
    this.transitionImage.onload = () => {
      this.transitionImageWidth = this.transitionImage!.width;
      this.transitionImageHeight = this.transitionImage!.height;
      this.transitionImageLoaded = true;
      console.log(`Transition background image loaded: ${this.transitionImagePath} (${this.transitionImageWidth}x${this.transitionImageHeight})`);
    };
    this.transitionImage.onerror = (error) => {
      console.error(`Failed to load transition background image: ${this.transitionImagePath}`, error);
    };
    this.transitionImage.src = this.transitionImagePath;
    console.log(`Loading transition background image from: ${this.transitionImagePath}`);
  }

  /**
   * Trigger lazy loading of the image (call when approaching score threshold)
   */
  public triggerLoad(): void {
    if (!this.imageLoaded && !this.image) {
      console.log(`Triggering lazy load for: ${this.imagePath}`);
      this.loadImage();
    }
    if (this.transitionImagePath && !this.transitionImageLoaded && !this.transitionImage) {
      console.log(`Triggering lazy load for transition: ${this.transitionImagePath}`);
      this.loadTransitionImage();
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
   * Returns true once the forest transition has been triggered.
   */
  hasStartedTransition(): boolean {
    return this.transitionStarted;
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
   * Render the scrolling background with transition support
   * Sequence: transition tile (forestTransition.webp) → forest (looping)
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

    // Create cached tiles if needed
    // Forest tile cache
    if (!this.cachedTile || this.cachedTileWidth !== scaledWidth || this.cachedTileHeight !== scaledHeight) {
      this.cachedTile = document.createElement('canvas');
      this.cachedTile.width = Math.ceil(scaledWidth) + 1; // +1 to prevent gaps
      this.cachedTile.height = scaledHeight;
      this.cachedTileWidth = scaledWidth;
      this.cachedTileHeight = scaledHeight;

      const cacheCtx = this.cachedTile.getContext('2d');
      if (cacheCtx) {
        cacheCtx.drawImage(this.image, 0, 0, this.cachedTile.width, scaledHeight);
        console.log(`📦 Forest background tile cached at ${this.cachedTile.width}x${scaledHeight}`);
      }
    }

    // Transition tile cache (if transition image exists)
    if (this.transitionImageLoaded && this.transitionImage) {
      const transitionScaledWidth = this.transitionImageWidth * scale;
      if (!this.cachedTransitionTile || this.cachedTransitionTileWidth !== transitionScaledWidth || this.cachedTransitionTileHeight !== scaledHeight) {
        this.cachedTransitionTile = document.createElement('canvas');
        this.cachedTransitionTile.width = Math.ceil(transitionScaledWidth) + 1;
        this.cachedTransitionTile.height = scaledHeight;
        this.cachedTransitionTileWidth = transitionScaledWidth;
        this.cachedTransitionTileHeight = scaledHeight;

        const cacheCtx = this.cachedTransitionTile.getContext('2d');
        if (cacheCtx) {
          cacheCtx.drawImage(this.transitionImage, 0, 0, this.cachedTransitionTile.width, scaledHeight);
          console.log(`📦 Forest transition tile cached at ${this.cachedTransitionTile.width}x${scaledHeight}`);
        }
      }
    }

    // Calculate how far we've scrolled since transition started
    const scrolledSinceTransition = Math.abs(this.offsetX - this.transitionOffsetX);

    // To guarantee coverage under large camera pans, expand draw range
    const leftMargin = -scaledWidth;
    const rightMargin = canvasWidth + scaledWidth;

    // If no transition image, render forest scrolling in from right (original behavior)
    if (!this.transitionImageLoaded || !this.cachedTransitionTile) {
      const forestStartX = canvasWidth - scrolledSinceTransition;

      if (forestStartX + scaledWidth < 0) {
        // Forest has fully scrolled in - now loop normally
        const wrappedOffsetX = this.offsetX % scaledWidth;
        for (let x = wrappedOffsetX + leftMargin; x < rightMargin; x += scaledWidth) {
          ctx.drawImage(this.cachedTile, x, 0);
        }
      } else {
        // Still scrolling in - only draw from the visible right edge inward
        const start = Math.max(forestStartX, 0);
        for (let x = start; x < rightMargin; x += scaledWidth) {
          ctx.drawImage(this.cachedTile, x, 0);
        }
      }
      return;
    }

    // WITH transition image: render transition → forest sequence
    const transitionScaledWidth = this.cachedTransitionTileWidth;

    // Start the transition tile at the right edge and scroll it in
    const transitionStartX = canvasWidth - scrolledSinceTransition;
    const transitionEndX = transitionStartX + transitionScaledWidth;

    // Draw transition tile if it's in view
    if (transitionStartX < canvasWidth + scaledWidth && transitionEndX > -scaledWidth) {
      ctx.drawImage(this.cachedTransitionTile, transitionStartX, 0);
    }

    // Draw forest tiles after the transition
    const forestStartX = transitionEndX;

    if (forestStartX < canvasWidth + scaledWidth) {
      // Check if we've scrolled far enough that transition is off-screen and we should loop forest
      if (transitionEndX < 0) {
        // Transition has scrolled completely off-screen - draw forest with wrapping
        const distanceIntoForest = Math.abs(transitionEndX);
        const forestOffset = distanceIntoForest % scaledWidth;
        const forestWrappedStart = -forestOffset - scaledWidth;

        for (let x = forestWrappedStart; x < rightMargin; x += scaledWidth) {
          ctx.drawImage(this.cachedTile, x, 0);
        }
      } else {
        // Transition is still visible or just passed - draw forest tiles after it
        for (let x = forestStartX; x < rightMargin; x += scaledWidth) {
          if (x + scaledWidth > 0) { // Only draw if tile would be visible
            ctx.drawImage(this.cachedTile, x, 0);
          }
        }
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

  /**
   * Check if the transition image is currently visible on screen
   * Returns true when the forestTransition.webp image has started appearing
   */
  isTransitionImageVisible(screenWidth: number): boolean {
    if (!this.transitionStarted) return false;

    // Calculate how far we've scrolled since transition started
    const scrolledSinceTransition = Math.abs(this.offsetX - this.transitionOffsetX);

    // Transition starts appearing when it scrolls in from the right
    // It's visible once we've scrolled enough for it to enter the screen
    // The transition image starts at screenWidth and scrolls left
    const transitionX = screenWidth - scrolledSinceTransition;

    // Return true if any part of the transition is visible (transitionX < screenWidth)
    return transitionX < screenWidth;
  }
}
