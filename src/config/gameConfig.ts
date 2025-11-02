/**
 * Game Configuration Constants
 * All game balance, physics, and layout parameters
 */

// 📐 RESPONSIVE SCALING CONFIGURATION
// Function to calculate responsive ball size based on viewport
export const calculateResponsiveBallSize = (width: number, height: number): number => {
  const aspectRatio = width / height;

  // Base size as percentage of viewport height
  let sizePercentage = 0.11; // 11% of viewport height for normal screens

  // Adjust for different aspect ratios
  if (aspectRatio > 2.5) {
    // Ultra-wide landscape (e.g., phone landscape)
    sizePercentage = 0.16; // Larger percentage but smaller actual size
  } else if (aspectRatio > 2.0) {
    // Wide landscape (e.g., tablet landscape)
    sizePercentage = 0.13;
  } else if (aspectRatio < 1.0) {
    // Portrait mode
    sizePercentage = 0.08;
  }

  const calculatedSize = height * sizePercentage;

  // Clamp between min and max sizes
  return Math.max(40, Math.min(100, calculatedSize));
};

// Function to calculate responsive horizontal ranges
export const calculateHorizontalRanges = (width: number) => {
  // Base ranges as percentage of screen width
  const leftRangePercent = 0.08; // 8% of width
  const rightRangePercent = 0.15; // 15% of width

  return {
    left: Math.max(50, Math.min(150, width * leftRangePercent)),
    right: Math.max(100, Math.min(250, width * rightRangePercent))
  };
};

// 🟦 PLAYER BALL CONFIGURATION
// These are now base values - actual values calculated responsively
export const BALL_SIZE = 80; // Base size for reference
export const HITBOX_SIZE = BALL_SIZE + 20;
export const PLAYER_HORIZONTAL_RANGE_LEFT = 100; // Pixels player can move left from center
export const PLAYER_HORIZONTAL_RANGE_RIGHT = 200; // Pixels player can move right from center
export const BALL_GROWTH_TRANSITION_DURATION = 0.65; // Duration in seconds for width/height/top/left growth animation

// 🟢 PLAYER SHOOTING (UNLOCKS AT SCORE 100+)
export const PLAYER_PROJECTILE_SPEED = 8;
export const PLAYER_PROJECTILE_WIDTH = 15;
export const PLAYER_PROJECTILE_HEIGHT = 4;

// Enemy growth every 20 hits — each level adds +25% to size
export const ENEMY_WIDTH_GROWTH_PER_CYCLE = BALL_SIZE * 0.25;
export const ENEMY_HEIGHT_GROWTH_PER_CYCLE = BALL_SIZE * 0.25;

// ⚙️ PHYSICS PARAMETERS (Base values for reference screen height of 800px)
export const BASE_SCREEN_HEIGHT = 800; // Reference screen height for physics calculations
export const GRAVITY = 0.42;
export const ENERGY_LOSS = 0.5; // Bounce energy retention
export const BOOST = 15.35; // Initial jump boost
export const HOLD_BOOST = 0.16; // Continuous boost while holding
export const MAX_HOLD_TIME = 2200; // Maximum hold duration in ms

// Function to calculate responsive physics based on screen height
// This ensures the player jumps to the same relative height regardless of screen size
export const calculateResponsivePhysics = (screenHeight: number) => {
  // Scale factor based on screen height
  // Smaller screens need weaker gravity/boost to maintain same relative jump height
  const heightScale = screenHeight / BASE_SCREEN_HEIGHT;

  return {
    gravity: GRAVITY * heightScale,
    boost: BOOST * heightScale,
    holdBoost: HOLD_BOOST * heightScale,
    energyLoss: ENERGY_LOSS, // Keep bounce retention constant
    maxHoldTime: MAX_HOLD_TIME, // Keep max hold time constant
  };
};

// Function to calculate responsive laser dimensions
export const calculateResponsiveLaserSize = (ballSize: number) => {
  // Laser width scales proportionally to ball size
  const width = (ballSize / 80) * 25; // Scale from base 25px at 80px ball
  const height = 2; // Keep height constant for visibility

  return {
    width: Math.max(15, Math.min(35, width)),
    height
  };
};

// 🔴 LASER CONFIGURATION
// These are now base values - actual values calculated responsively
export const LASER_WIDTH = 25;
export const LASER_HEIGHT = 2;
export const BASE_LASER_SPEED = 5.5; // Constant laser speed
export const MAX_LASERS = 4;
export const SCORE_PER_LASER_UNLOCK = 25; // Score needed to unlock new laser
export const WIDE_LASER_UNLOCK_SCORE = 100; // Score needed to enable wide lasers
export const WIDE_LASER_WIDTH = 125; // Width of the special wide laser
export const WIDE_LASER_HIT_VALUE = 5; // How many hits a wide laser counts for

// 🌪 LASER CHAOS / RANDOMNESS (increases every 5 points, resets every 25)
export const CHAOS_INCREMENT_INTERVAL = 5; // Points between chaos increases
export const BASE_LASER_RANDOMNESS = 1.0; // Base randomness factor (100% of available range - full randomness)
export const CHAOS_MULTIPLIER_PER_INTERVAL = 0.0; // No additional randomness (already at max)

// 🌌 BACKGROUND CONFIGURATION
export const NUM_STARS = 90;
export const STAR_SPEED = 1;
export const STARS_ENABLED = false; // Toggle stars on/off (keeping code for future use)

// Background image configuration (forest trees - far background)
export const BACKGROUND_IMAGE_PATH = process.env.PUBLIC_URL
  ? `${process.env.PUBLIC_URL}/forest_light_trees.jpg`
  : '/forest_light_trees.jpg';
export const BACKGROUND_SCROLL_SPEED = 0.5; // Speed for far background trees

// Ground image configuration (forest ground - foreground layer)
export const GROUND_IMAGE_PATH = process.env.PUBLIC_URL
  ? `${process.env.PUBLIC_URL}/forest_light_ground.png`
  : '/forest_light_ground.png';
export const GROUND_SCROLL_SPEED = 1; // Same speed as stars (faster than background for parallax)
export const GROUND_HEIGHT_EXTENSION = 50; // Extra pixels to extend ground upward (experiment with this value!)

// Background overlay gradient (applied over scrolling background, under stars)
// Gradient goes from bottom (start) to top (end) of screen
// Format: 'rgba(red, green, blue, alpha)' where alpha is 0 (transparent) to 1 (opaque)
export const BACKGROUND_OVERLAY_GRADIENT_START = 'rgba(0, 0, 0, .8)'; // Bottom: more opaque
export const BACKGROUND_OVERLAY_GRADIENT_END = 'rgba(0, 0, 0, .65)';   // Top: more transparent

// Function to calculate responsive floor position based on viewport
export const calculateResponsiveFloorPosition = (width: number, height: number): number => {
  const aspectRatio = width / height;

  // Base position as percentage from top
  let floorPosition = 0.75; // 75% for normal screens (iPad landscape)

  // Adjust for different aspect ratios
  if (aspectRatio > 2.5) {
    // Ultra-wide landscape (e.g., iPhone landscape) - floor needs to be lower to give more vertical space
    floorPosition = 0.65; // 65% from top = more space above
  } else if (aspectRatio > 2.0) {
    // Wide landscape (e.g., tablet landscape)
    floorPosition = 0.70; // 70% from top
  } else if (aspectRatio < 1.0) {
    // Portrait mode - floor needs to be higher to keep gameplay in reachable range
    floorPosition = 0.55; // 55% from top = less space above
  } else if (aspectRatio < 1.5) {
    // Square-ish screens
    floorPosition = 0.68;
  }

  return floorPosition;
};

// 🧭 LAYOUT CONFIGURATION
export const PLAYER_X_POSITION = 0.25; // 25% from left
export const FLOOR_Y_POSITION = 0.75;  // 75% from top (base value, overridden by responsive calculation)
export const ENEMY_X_POSITION = 0.9;   // 90% from left

// 🔊 AUDIO CONFIGURATION
// Use process.env.PUBLIC_URL to work with GitHub Pages deployment
export const BOUNCE_SOUND_PATH = `${process.env.PUBLIC_URL}/bounce.mp3`;
export const LASER_HIT_SOUND_PATH = `${process.env.PUBLIC_URL}/lazerHit.mp3`;
export const BACKGROUND_MUSIC_PATH = `${process.env.PUBLIC_URL}/audioTrack.mp3`;
export const BACKGROUND_MUSIC_VOLUME = 0.20;
export const BOUNCE_DEBOUNCE_MS = 150;

// 🎮 GAMEPLAY BALANCE
export const SCORE_UPDATE_INTERVAL = 200; // ms
export const MIN_BOUNCE_VELOCITY = 0.3;   // Minimum velocity to trigger bounce

// 🎯 GAME PROGRESSION
export const MAX_GROWTH_CYCLES = 5; // Maximum growth cycles before reset to original size
export const MAX_OUTS = 10; // Maximum outs before game over
export const HITS_PER_OUT = 20; // Hits needed to score an "out"

// 🔴 ENEMY MOVEMENT & BEHAVIOR
export const ENEMY_MOVE_SPEED = 0.015; // Smooth interpolation speed (0–1) - very slow for visible squash
export const ENEMY_MOVEMENT_DELAY = 0; // No delay - start moving immediately after shooting
