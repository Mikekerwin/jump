/**
 * Static Background System
 * Renders a non-scrolling background image (like cloud sky)
 * Uses offscreen canvas caching for better performance on mobile
 */

export class StaticBackground {
  private imageWidth: number = 0;
  private imageHeight: number = 0;
  private image: HTMLImageElement | null = null;
  private imageLoaded: boolean = false;
  private cachedCanvas: HTMLCanvasElement | null = null;
  private cachedWidth: number = 0;
  private cachedHeight: number = 0;

  constructor(imagePath: string) {
    this.image = new Image();
    this.image.onload = () => {
      this.imageWidth = this.image!.width;
      this.imageHeight = this.image!.height;
      this.imageLoaded = true;
      console.log(`Static background loaded: ${imagePath} (${this.imageWidth}x${this.imageHeight})`);
    };
    this.image.onerror = (error) => {
      console.error(`Failed to load static background: ${imagePath}`, error);
    };
    this.image.src = imagePath;
  }

  /**
   * Render the static background (no scrolling)
   * Covers full height while maintaining aspect ratio
   * Uses offscreen canvas caching to avoid re-rendering the same image
   */
  render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    if (!this.imageLoaded || !this.image) return;

    // Check if we need to recreate the cache (first time or canvas size changed)
    if (!this.cachedCanvas || this.cachedWidth !== canvasWidth || this.cachedHeight !== canvasHeight) {
      // Create offscreen canvas for caching
      this.cachedCanvas = document.createElement('canvas');
      this.cachedCanvas.width = canvasWidth;
      this.cachedCanvas.height = canvasHeight;
      this.cachedWidth = canvasWidth;
      this.cachedHeight = canvasHeight;

      const cacheCtx = this.cachedCanvas.getContext('2d');
      if (!cacheCtx) return;

      // Render to offscreen canvas once
      const scale = canvasHeight / this.imageHeight;
      const scaledWidth = this.imageWidth * scale;
      const scaledHeight = canvasHeight;
      const xOffset = (canvasWidth - scaledWidth) / 2;

      cacheCtx.drawImage(this.image, xOffset, 0, scaledWidth, scaledHeight);
      console.log(`📦 Static background cached at ${canvasWidth}x${canvasHeight}`);
    }

    // Just copy the cached canvas - much faster than re-rendering the image!
    ctx.drawImage(this.cachedCanvas, 0, 0);
  }

  /**
   * Reset (no-op for static background)
   */
  reset(): void {
    // Nothing to reset for static background
  }
}
