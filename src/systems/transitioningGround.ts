/**
 * Transitioning Ground System
 * Handles transitioning from cloud ground to forest ground at score 100
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
   * Update ground offset for scrolling animation
   */
  update(score: number): void {
    if (!this.cloudImageLoaded && !this.forestImageLoaded) return;

    // Move ground to the left
    this.offsetX -= GROUND_SCROLL_SPEED;

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
   */
  render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, score: number): void {
    if (!this.cloudImageLoaded || !this.cloudImage) return;

    const heightExtension = canvasHeight * GROUND_HEIGHT_EXTENSION_PERCENT;

    // Calculate cloud ground dimensions
    const cloudScale = canvasWidth / this.cloudImageWidth;
    const cloudScaledWidth = this.cloudImageWidth * cloudScale;
    const cloudScaledHeight = this.cloudImageHeight * cloudScale;
    // Apply height extension but DON'T scale the width - keep aspect ratio pure
    const cloudAdjustedWidth = cloudScaledWidth;
    const cloudAdjustedHeight = cloudScaledHeight + heightExtension;
    const yPosition = canvasHeight - cloudAdjustedHeight;

    if (!this.transitionStarted) {
      // Before score 100: Just draw cloud ground looping
      const wrappedOffsetX = this.offsetX % cloudAdjustedWidth;
      for (let x = wrappedOffsetX; x < canvasWidth + 2; x += cloudAdjustedWidth) {
        ctx.drawImage(this.cloudImage, x, yPosition, cloudAdjustedWidth + 1, cloudAdjustedHeight);
      }
    } else {
      // After score 100: Draw cloud → transition → forest sequence
      if (!this.transitionImageLoaded || !this.transitionImage || !this.forestImageLoaded || !this.forestImage) {
        // Images not loaded yet, just draw clouds
        const wrappedOffsetX = this.offsetX % cloudAdjustedWidth;
        for (let x = wrappedOffsetX; x < canvasWidth + 2; x += cloudAdjustedWidth) {
          ctx.drawImage(this.cloudImage, x, yPosition, cloudAdjustedWidth + 1, cloudAdjustedHeight);
        }
        return;
      }

      // Use the SAME scale for all images to ensure seamless alignment
      // Use cloud scale as the base scale for all tiles
      const baseScale = cloudScale;

      // Calculate transition ground dimensions using the same base scale
      const transitionScaledWidth = this.transitionImageWidth * baseScale;
      const transitionScaledHeight = this.transitionImageHeight * baseScale;
      // Apply height extension but DON'T scale the width - keep it proportional to source
      const transitionAdjustedWidth = transitionScaledWidth;
      const transitionAdjustedHeight = transitionScaledHeight + heightExtension;

      // Calculate forest ground dimensions using the same base scale
      const forestScaledWidth = this.forestImageWidth * baseScale;
      const forestScaledHeight = this.forestImageHeight * baseScale;
      // Apply height extension but DON'T scale the width - keep it proportional to source
      const forestAdjustedWidth = forestScaledWidth;
      const forestAdjustedHeight = forestScaledHeight + heightExtension;

      // Draw tiles in sequence: cloud (scrolling off) → transition (once) → forest (looping)
      // Wait for next tile boundary to start transition

      // Find where cloud tiles currently are
      const wrappedOffsetX = this.offsetX % cloudAdjustedWidth;

      // When transition started, find the position of the rightmost cloud tile edge that's past the screen
      // We want the transition to start from the NEXT cloud tile boundary after the right edge
      const wrappedOffsetAtTransitionStart = this.transitionOffsetX % cloudAdjustedWidth;

      // Find how far to the right the next tile boundary is from the right edge of screen
      // Start from the wrapped position and find the first tile boundary at or past canvasWidth
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
        // Clouds are still visible
        for (let x = wrappedOffsetX; x < Math.min(transitionStartX, canvasWidth + 2); x += cloudAdjustedWidth) {
          if (x + cloudAdjustedWidth > 0) {
            ctx.drawImage(this.cloudImage, x, yPosition, cloudAdjustedWidth + 1, cloudAdjustedHeight);
          }
        }
      }

      // Draw transition tile if it's in view
      const transitionEndX = transitionStartX + transitionAdjustedWidth;
      if (transitionStartX < canvasWidth + 2 && transitionEndX > 0) {
        ctx.drawImage(this.transitionImage, transitionStartX, yPosition, transitionAdjustedWidth + 1, transitionAdjustedHeight);
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
            ctx.drawImage(this.forestImage, x, yPosition, forestAdjustedWidth + 1, forestAdjustedHeight);
          }
        } else {
          // Transition is still visible or just passed - draw forest tiles after it
          for (let x = forestStartX; x < canvasWidth + 2; x += forestAdjustedWidth) {
            if (x > 0) {
              ctx.drawImage(this.forestImage, x, yPosition, forestAdjustedWidth + 1, forestAdjustedHeight);
            }
          }
        }
      }
    }
  }

  /**
   * Reset ground position
   */
  reset(): void {
    this.offsetX = 0;
    this.transitionStarted = false;
    this.transitionOffsetX = 0;
  }

  /**
   * Update dimensions if window is resized
   */
  updateDimensions(_width: number, _height: number): void {
    // Ground scales automatically based on canvas size
  }
}
