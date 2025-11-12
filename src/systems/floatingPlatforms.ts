import {
  GRASS_PLATFORM_IMAGE_PATH,
  FLOATING_PLATFORM_VERTICAL_OFFSET,
  FLOATING_PLATFORM_SPEED_MULTIPLIER,
  FLOATING_PLATFORM_DEBUG_OVERLAY,
  FLOATING_PLATFORM_DEBUG_COLOR,
} from '../config/gameConfig';

interface PlatformInstance {
  id: number;
  x: number; // world coordinate
  surfaceY: number; // center position where player should be placed when standing
  renderY: number;
  width: number;
  height: number;
  speedMultiplier: number;
  active: boolean;
}

export interface PlatformCollision {
  surfaceY: number;
  left: number;
  right: number;
}

interface PlayerBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export class FloatingPlatforms {
  private platforms: PlatformInstance[] = [];
  private nextId: number = 0;
  private image: HTMLImageElement | null = null;
  private imageLoaded: boolean = false;
  private imageWidth: number = 0;
  private imageHeight: number = 0;

  constructor() {
    if (typeof Image === 'undefined') return;
    this.image = new Image();
    this.image.onload = () => {
      this.imageWidth = this.image?.width || 0;
      this.imageHeight = this.image?.height || 0;
      this.imageLoaded = true;
    };
    this.image.onerror = () => {
      this.imageLoaded = false;
    };
    this.image.src = GRASS_PLATFORM_IMAGE_PATH;
  }

  spawn(worldX: number, groundCenterY: number, ballSize: number): void {
    if (!this.imageLoaded) return;
    const plat = this.platforms.find(p => !p.active) || this.createPlatform();
    const verticalOffset = FLOATING_PLATFORM_VERTICAL_OFFSET;
    const surfaceCenterY = groundCenterY - verticalOffset;
    const renderY = surfaceCenterY + ballSize / 2 - this.imageHeight;

    plat.x = worldX + 10; // Position hitbox 5px to the right

    // surfaceY is where player.position.y should be to land on the platform
    // Player position.y = top of player, player bottom = position.y + ballSize
    // Platform visual landing spot (middle of image) = renderY + imageHeight / 2
    // We want: position.y + ballSize = platformMiddle
    // Therefore: position.y = platformMiddle - ballSize
    const platformMiddle = renderY + this.imageHeight / 2;
    plat.surfaceY = platformMiddle - ballSize;
    plat.renderY = renderY;
    plat.width = this.imageWidth - 22; // Make hitbox 15px narrower
    plat.height = this.imageHeight;
    plat.speedMultiplier = FLOATING_PLATFORM_SPEED_MULTIPLIER;
    plat.active = true;

    console.log(`[PLATFORM SPAWN] X=${worldX.toFixed(0)} SurfaceY=${plat.surfaceY.toFixed(0)} PlatformMiddle=${platformMiddle.toFixed(0)} RenderY=${renderY.toFixed(0)} GroundY=${groundCenterY.toFixed(0)}`);
  }

  update(deltaMs: number, cameraX: number, canvasWidth: number, groundSpeed: number): void {
    if (!this.imageLoaded) return;
    const leftCull = cameraX - canvasWidth * 1.5;
    this.platforms.forEach((platform) => {
      if (!platform.active) return;
      const effectiveSpeed = groundSpeed * platform.speedMultiplier || 0;
      platform.x -= effectiveSpeed;
      if (platform.x + platform.width < leftCull) {
        platform.active = false;
      }
    });
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    if (!this.imageLoaded || !this.image) return;
    const image = this.image;
    this.platforms.forEach((platform) => {
      if (!platform.active) return;
      const screenX = platform.x - cameraX;
      if (FLOATING_PLATFORM_DEBUG_OVERLAY) {
        ctx.fillStyle = FLOATING_PLATFORM_DEBUG_COLOR;
        // Draw hitbox with 5px offset to the right
        ctx.fillRect(screenX + 5, platform.renderY, platform.width, platform.height);
      }
      ctx.drawImage(image, screenX, platform.renderY);
    });
  }

  getSupportingPlatform(
    currentBounds: PlayerBounds,
    previousBounds: PlayerBounds,
    playerVelocity: number
  ): PlatformCollision | null {
    const playerHeight = currentBounds.bottom - currentBounds.top;
    const tolerance = Math.max(2, playerHeight * 0.05);

    for (const platform of this.platforms) {
      if (!platform.active) continue;

      const platformLeft = platform.x;
      const platformRight = platform.x + platform.width;
      // platform.surfaceY is where player's TOP should be when standing on platform
      // So player's BOTTOM should be at surfaceY + playerHeight
      const platformBottomCollision = platform.surfaceY + playerHeight;

      const horizontalOverlap = !(
        currentBounds.right < platformLeft ||
        currentBounds.left > platformRight
      );
      if (!horizontalOverlap) continue;

      const descending = playerVelocity <= 0 || currentBounds.bottom > previousBounds.bottom;
      const approachingFromAbove = previousBounds.top + tolerance <= platform.surfaceY;
      const crossedThisFrame =
        descending &&
        approachingFromAbove &&
        previousBounds.bottom <= platformBottomCollision + tolerance &&
        currentBounds.bottom >= platformBottomCollision - tolerance;
      const resting =
        Math.abs(currentBounds.bottom - platformBottomCollision) <= tolerance &&
        Math.abs(playerVelocity) < 0.8;

      if (crossedThisFrame || resting) {
        return {
          surfaceY: platform.surfaceY,
          left: platformLeft,
          right: platformRight,
        };
      }
    }
    return null;
  }

  reset(): void {
    this.platforms.forEach(p => {
      p.active = false;
    });
  }

  private createPlatform(): PlatformInstance {
    const platform: PlatformInstance = {
      id: this.nextId++,
      x: 0,
      surfaceY: 0,
      renderY: 0,
      width: this.imageWidth,
      height: this.imageHeight,
      speedMultiplier: FLOATING_PLATFORM_SPEED_MULTIPLIER,
      active: false,
    };
    this.platforms.push(platform);
    return platform;
  }
}
