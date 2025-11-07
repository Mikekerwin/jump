/**
 * Transitioning Ground System
 * Handles transitioning from cloud ground to forest ground at score 100
 * Uses offscreen canvas caching for better performance on mobile
 */

import { GROUND_SCROLL_SPEED, GROUND_HEIGHT_EXTENSION_PERCENT, FOREST_UNLOCK_SCORE } from '../config/gameConfig';

export class TransitioningGround {
  private offsetX: number = 0;
  private cloudImageWidth: number = 0;
  private cloudImageHeight: number = 0;
  private transitionImageWidth: number = 0;
  private transitionImageHeight: number = 0;
  private forestImageWidth: number = 0;
  private forestImageHeight: number = 0;
  private cloudImage: HTMLImageElement | null = null;
  private transitionImage: HTMLImageElement | null = null;
  private forestImage: HTMLImageElement | null = null;
  private cloudImageLoaded: boolean = false;
  private transitionImageLoaded: boolean = false;
  private forestImageLoaded: boolean = false;
  private transitionStarted: boolean = false;
  private transitionOffsetX: number = 0; // Offset when transition started

  // Offscreen canvas caching for performance
  private cachedCloudTile: HTMLCanvasElement | null = null;
  private cachedTransitionTile: HTMLCanvasElement | null = null;
  private cachedForestTile: HTMLCanvasElement | null = null;
  private cachedWidth: number = 0;
  private cachedHeight: number = 0;

  // Slowdown properties
  private isSlowingDown: boolean = false;
  private slowdownStartTime: number = 0;
  private slowdownDuration: number = 0;
  private initialSpeed: number = 0;
  private currentScrollSpeed: number = GROUND_SCROLL_SPEED;
  
  private forceForestOnly: boolean = false;

  constructor(cloudImagePath: string, transitionImagePath: string, forestImagePath: string) {
    // Load all images immediately (preloaded by loading screen)
    this.cloudImage = new Image();
    this.cloudImage.onload = () => {
      this.cloudImageWidth = this.cloudImage!.width;
      this.cloudImageHeight = this.cloudImage!.height;
      this.cloudImageLoaded = true;
      console.log(`Cloud ground loaded: ${cloudImagePath} (${this.cloudImageWidth}x${this.cloudImageHeight})`);
    };
    this.cloudImage.onerror = (error) => {
      console.error(`Failed to load cloud ground: ${cloudImagePath}`, error);
    };
    this.cloudImage.src = cloudImagePath;

    // Load transition ground immediately
    this.transitionImage = new Image();
    this.transitionImage.onload = () => {
      this.transitionImageWidth = this.transitionImage!.width;
      this.transitionImageHeight = this.transitionImage!.height;
      this.transitionImageLoaded = true;
      console.log(`Transition ground loaded: ${transitionImagePath} (${this.transitionImageWidth}x${this.transitionImageHeight})`);
    };
    this.transitionImage.onerror = (error) => {
      console.error(`Failed to load transition ground: ${transitionImagePath}`, error);
    };
    this.transitionImage.src = transitionImagePath;

    // Load forest ground immediately
    this.forestImage = new Image();
    this.forestImage.onload = () => {
      this.forestImageWidth = this.forestImage!.width;
      this.forestImageHeight = this.forestImage!.height;
      this.forestImageLoaded = true;
      console.log(`Forest ground loaded: ${forestImagePath} (${this.forestImageWidth}x${this.forestImageHeight})`);
    };
    this.forestImage.onerror = (error) => {
      console.error(`Failed to load forest ground: ${forestImagePath}`, error);
    };
    this.forestImage.src = forestImagePath;
  }

  /**
   * Create cached tiles if needed (when canvas size changes or first render)
   */
  private createCachedTiles(canvasWidth: number, canvasHeight: number, heightExtension: number, baseScale: number): void {
    // Check if we need to recreate caches
    if (this.cachedCloudTile && this.cachedWidth === canvasWidth && this.cachedHeight === canvasHeight) {
      return; // Already cached at this size
    }

    this.cachedWidth = canvasWidth;
    this.cachedHeight = canvasHeight;

    // Cache cloud tile
    if (this.cloudImageLoaded && this.cloudImage) {
      const cloudScaledWidth = this.cloudImageWidth * baseScale;
      const cloudScaledHeight = this.cloudImageHeight * baseScale;
      const cloudAdjustedHeight = cloudScaledHeight + heightExtension;

      this.cachedCloudTile = document.createElement('canvas');
      this.cachedCloudTile.width = Math.ceil(cloudScaledWidth) + 1;
      this.cachedCloudTile.height = cloudAdjustedHeight;

      const ctx = this.cachedCloudTile.getContext('2d');
      if (ctx) {
        ctx.drawImage(this.cloudImage, 0, 0, this.cachedCloudTile.width, cloudAdjustedHeight);
        console.log(`📦 Cloud ground tile cached`);
      }
    }

    // Cache transition tile
    if (this.transitionImageLoaded && this.transitionImage) {
      const transitionScaledWidth = this.transitionImageWidth * baseScale;
      const transitionScaledHeight = this.transitionImageHeight * baseScale;
      const transitionAdjustedHeight = transitionScaledHeight + heightExtension;

      this.cachedTransitionTile = document.createElement('canvas');
      this.cachedTransitionTile.width = Math.ceil(transitionScaledWidth) + 1;
      this.cachedTransitionTile.height = transitionAdjustedHeight;

      const ctx = this.cachedTransitionTile.getContext('2d');
      if (ctx) {
        ctx.drawImage(this.transitionImage, 0, 0, this.cachedTransitionTile.width, transitionAdjustedHeight);
        console.log(`📦 Transition ground tile cached`);
      }
    }

    // Cache forest tile
    if (this.forestImageLoaded && this.forestImage) {
      const forestScaledWidth = this.forestImageWidth * baseScale;
      const forestScaledHeight = this.forestImageHeight * baseScale;
      const forestAdjustedHeight = forestScaledHeight + heightExtension;

      this.cachedForestTile = document.createElement('canvas');
      this.cachedForestTile.width = Math.ceil(forestScaledWidth) + 1;
      this.cachedForestTile.height = forestAdjustedHeight;

      const ctx = this.cachedForestTile.getContext('2d');
      if (ctx) {
        ctx.drawImage(this.forestImage, 0, 0, this.cachedForestTile.width, forestAdjustedHeight);
        console.log(`📦 Forest ground tile cached`);
      }
    }
  }

  /**
   * Starts the process of slowing down the ground scroll speed to zero over a specified duration.
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
   * Immediately pause or resume ground scrolling without altering offsets.
   */
  public setPaused(paused: boolean): void {
    if (paused) {
      this.isSlowingDown = false;
      this.currentScrollSpeed = 0;
    } else {
      this.isSlowingDown = false;
      this.currentScrollSpeed = GROUND_SCROLL_SPEED;
    }
  }

  /**
   * Update ground offset for scrolling animation. Handles deceleration if triggered.
   */
  update(score: number): void {
    if (!this.cloudImageLoaded && !this.forestImageLoaded) return;

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

    // Move ground to the left
    this.offsetX -= this.currentScrollSpeed;

    // Mark transition point when score reaches 100 (but wait for next tile boundary)
    if (score >= FOREST_UNLOCK_SCORE && !this.transitionStarted) {
      this.transitionStarted = true;
      // Store the current offset - we'll calculate the tile boundary in render
      this.transitionOffsetX = this.offsetX;
      console.log('Ground transition: Will start transition at next tile boundary');
    }
  }

  /**
   * Render the scrolling ground at the bottom of the screen
   * Sequence: cloud → transition tile → forest (looping)
   * Uses offscreen canvas caching for better performance
   */
    render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, score: number): void {
    if (!this.cloudImageLoaded || !this.cloudImage) return;

    const heightExtension = canvasHeight * GROUND_HEIGHT_EXTENSION_PERCENT;

    // Calculate cloud ground dimensions
    const cloudScale = canvasWidth / this.cloudImageWidth;
    const cloudScaledWidth = this.cloudImageWidth * cloudScale;
    const cloudScaledHeight = this.cloudImageHeight * cloudScale;
    const cloudAdjustedWidth = cloudScaledWidth;
    const cloudAdjustedHeight = cloudScaledHeight + heightExtension;
    const yPosition = canvasHeight - cloudAdjustedHeight;

    // Create cached tiles if needed
    this.createCachedTiles(canvasWidth, canvasHeight, heightExtension, cloudScale);

    // Forest-only override for level transitions
    if (this.forceForestOnly && this.cachedForestTile) {
      const baseScale = cloudScale;
      const forestAdjustedWidth = this.forestImageWidth * baseScale;
      const wrappedOffsetX = this.offsetX % forestAdjustedWidth;
      for (let x = wrappedOffsetX; x < canvasWidth + 2; x += forestAdjustedWidth) {
        ctx.drawImage(this.cachedForestTile, x, yPosition);
      }
      return;
    }

    if (!this.transitionStarted) {
      // Before score 100: Just draw cloud ground looping
      if (!this.cachedCloudTile) return;
      const wrappedOffsetX = this.offsetX % cloudAdjustedWidth;
      for (let x = wrappedOffsetX; x < canvasWidth + 2; x += cloudAdjustedWidth) {
        ctx.drawImage(this.cachedCloudTile, x, yPosition);
      }
      return;
    }

    // After score 100: Draw cloud + transition + forest sequence
    if (!this.cachedCloudTile || !this.cachedTransitionTile || !this.cachedForestTile) {
      // Cached tiles not ready yet, just draw clouds
      if (!this.cachedCloudTile) return;
      const wrappedOffsetX = this.offsetX % cloudAdjustedWidth;
      for (let x = wrappedOffsetX; x < canvasWidth + 2; x += cloudAdjustedWidth) {
        ctx.drawImage(this.cachedCloudTile, x, yPosition);
      }
      return;
    }

    // Use the SAME scale for all images to ensure seamless alignment
    const baseScale = cloudScale;

    // Calculate transition and forest dimensions
    const transitionAdjustedWidth = this.transitionImageWidth * baseScale;
    const forestAdjustedWidth = this.forestImageWidth * baseScale;

    // Find where cloud tiles currently are
    const wrappedOffsetX = this.offsetX % cloudAdjustedWidth;

    // When transition started, find the position of the rightmost cloud tile edge that's past the screen
    const wrappedOffsetAtTransitionStart = this.transitionOffsetX % cloudAdjustedWidth;

    // Find how far to the right the next tile boundary is from the right edge of screen
    let nextBoundaryFromTransitionStart = wrappedOffsetAtTransitionStart;
    while (nextBoundaryFromTransitionStart < canvasWidth) {
      nextBoundaryFromTransitionStart += cloudAdjustedWidth;
    }

    // Calculate how far we've scrolled since transition was triggered
    const scrolledSinceTransition = Math.abs(this.offsetX - this.transitionOffsetX);

    // Transition appears when we've scrolled enough to reach that boundary
    const transitionStartX = nextBoundaryFromTransitionStart - scrolledSinceTransition;

    // Draw cloud tiles up to where the transition starts
    if (transitionStartX > 0) {
      // Clouds are still visible - use cached tile
      for (let x = wrappedOffsetX; x < Math.min(transitionStartX, canvasWidth + 2); x += cloudAdjustedWidth) {
        if (x + cloudAdjustedWidth > 0) {
          ctx.drawImage(this.cachedCloudTile, x, yPosition);
        }
      }
    }

    // Draw transition tile if it's in view
    const transitionEndX = transitionStartX + transitionAdjustedWidth;
    if (transitionStartX < canvasWidth + 2 && transitionEndX > 0) {
      ctx.drawImage(this.cachedTransitionTile, transitionStartX, yPosition);
    }

    // Draw forest tiles after the transition
    const forestStartX = transitionEndX;
    if (forestStartX < canvasWidth + 2) {
      // Check if we've scrolled far enough that transition is off-screen and we should loop forest
      if (transitionEndX < 0) {
        // Transition has scrolled completely off-screen - draw forest with wrapping
        const distanceIntoForest = Math.abs(transitionEndX);
        const forestOffset = distanceIntoForest % forestAdjustedWidth;
        const forestWrappedStart = -forestOffset;

        for (let x = forestWrappedStart; x < canvasWidth + 2; x += forestAdjustedWidth) {
          ctx.drawImage(this.cachedForestTile, x, yPosition);
        }
      } else {
        // Transition is still visible or just passed - draw forest tiles after it
        for (let x = forestStartX; x < canvasWidth + 2; x += forestAdjustedWidth) {
          if (x > 0) {
            ctx.drawImage(this.cachedForestTile, x, yPosition);
          }
        }
      }
    }
  }  /**
   * Force ground to render forest tiles only (used for level transitions)
   */
  public setForestMode(force: boolean): void {
    this.forceForestOnly = force;
    if (force) {
      this.transitionStarted = true;
    }
  }
  /**
   * Reset ground position and scroll speed.
   */
  reset(): void {
    this.offsetX = 0;
    this.transitionStarted = false;
    this.transitionOffsetX = 0;
    this.isSlowingDown = false;
    this.currentScrollSpeed = GROUND_SCROLL_SPEED;
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
    // Ground scales automatically based on canvas size
  }
}










