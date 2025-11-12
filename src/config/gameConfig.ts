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

// 🟢 PLAYER SHOOTING (UNLOCKS AT SCORE 50 WHEN ENERGY REACHES 100%)
export const PLAYER_PROJECTILE_SPEED = 8;
export const PLAYER_PROJECTILE_WIDTH = 15;
export const PLAYER_PROJECTILE_HEIGHT = 3;

// Player/Enemy growth system
// Every 20 hits = 1 out = opponent grows 1 level
// When you get an out (hit opponent 20 times), you shrink 1 level
export const GROWTH_SCALE_PER_LEVEL = 0.25; // 50% size increase per level (experiment with this!)
export const MAX_GROWTH_LEVELS = 10; // Maximum 10 levels of growth (experiment with this!)

// Legacy constants (kept for compatibility)
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

// 🎬 INTRO ANIMATION CONFIGURATION
// Control the three bounces that play when the loading screen fades
export const INTRO_ANIMATION_DELAY = 2000;     // milliseconds - Delay before starting intro animation
export const INTRO_BOUNCE_1_HOLD_TIME = 0;     // milliseconds - Quick tap (just initial boost)
export const INTRO_BOUNCE_2_HOLD_TIME = 400;   // milliseconds - Short hold (medium height)
export const INTRO_BOUNCE_3_HOLD_TIME = 1275;  // milliseconds - Long hold (max height, transitions to hover)
export const INTRO_GROUND_WAIT_TIME = 300;     // milliseconds - Wait time on ground between bounces
export const INTRO_TRANSITION_DAMPING = 0.92;  // 0-1, higher = slower deceleration when transitioning to hover

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
export const STARS_ENABLED = false; // Toggle stars on/off (legacy system, replaced by forest dust WebGL layer)

// Forest dust / starfield WebGL layer configuration
export const FOREST_DUST_ENABLED = true;
export const FOREST_DUST_PARTICLE_COUNT = 90; // Increased for denser small dust
export const FOREST_DUST_PARTICLE_COUNT_MOBILE = 36;
export const FOREST_DUST_SCROLL_SPEED = 0.055; // Pixels per ms (scaled in shader for parallax)
export const FOREST_DUST_FADE_IN_DURATION = 2400; // ms
export const FOREST_DUST_FADE_OUT_DURATION = 1200; // ms
export const FOREST_DUST_COLOR = { r: 0.95, g: 0.82, b: 0.65 };
export const FOREST_DUST_MOBILE_SWIRL_SCALE = 0.4;
export const GRASS_PLATFORM_IMAGE_PATH = process.env.PUBLIC_URL
  ? `${process.env.PUBLIC_URL}/grassPlatform_Large.png`
  : '/grassPlatform_Large.png';
export const FLOATING_PLATFORM_VERTICAL_OFFSET = 100; // pixels above ground center
export const FLOATING_PLATFORM_SPEED_MULTIPLIER = 1.0;
export const FLOATING_PLATFORM_DEBUG_OVERLAY = false;
export const FLOATING_PLATFORM_DEBUG_COLOR = 'rgba(0, 255, 127, 0.35)';
export type ForestDustBucket = {
  ratio: number;
  minSizePercent: number; // Size as percentage of screen height
  maxSizePercent: number;
  minDepth: number;
  maxDepth: number;
  blur: number;
  clustered: boolean;
  minHeightPercent: number; // 0 = bottom
  maxHeightPercent: number;
};
export const FOREST_DUST_BUCKETS: ForestDustBucket[] = [
  // Small particles (sharp, energetic) - ~75% of particles
  {
    ratio: 0.80,
    minSizePercent: 0.0018, // 0.18% of screen height (≈2px on 1100px screen)
    maxSizePercent: 0.01,  // 0.6% of screen height
    minDepth: 0.08,
    maxDepth: 0.35,
    blur: 0.05, // Crisp
    clustered: false,
    minHeightPercent: 0.10,
    maxHeightPercent: 0.57,
  },
  // Medium particles (soft glow) - ~15% of particles
  {
    ratio: 0.17,
    minSizePercent: 0.025,
    maxSizePercent: 0.06,
    minDepth: 0.45,
    maxDepth: 0.7,
    blur: 0.7,
    clustered: false,
    minHeightPercent: 0.1,
    maxHeightPercent: 0.32,
  },
  // Large particles (bokeh) - ~5% of particles
  {
    ratio: 0.08,
    minSizePercent: 0.12,
    maxSizePercent: 0.22,
    minDepth: 0.8,
    maxDepth: 1.0,
    blur: 0.85,
    clustered: false,
    minHeightPercent: 0.15,
    maxHeightPercent: 0.23,
  },
];
export const FOREST_DUST_SMALL_CLUSTER_COUNT = 10;
export const FOREST_DUST_SMALL_CLUSTER_RADIUS = 140;

// Cloud background configuration (score 0-50)
export const CLOUD_SKY_IMAGE_PATH = process.env.PUBLIC_URL
  ? `${process.env.PUBLIC_URL}/cloud_light_sky.webp`
  : '/cloud_light_sky.webp';
export const CLOUD_GROUND_IMAGE_PATH = process.env.PUBLIC_URL
  ? `${process.env.PUBLIC_URL}/cloud_light_ground.webp`
  : '/cloud_light_ground.webp';

// Transition ground (appears once between cloud and forest at score 50)
export const TRANSITION_GROUND_IMAGE_PATH = process.env.PUBLIC_URL
  ? `${process.env.PUBLIC_URL}/cloud_light_ground_forest_transition.webp`
  : '/cloud_light_ground_forest_transition.webp';

// Forest background configuration (score 50+)
export const FOREST_TRANSITION_IMAGE_PATH = process.env.PUBLIC_URL
  ? `${process.env.PUBLIC_URL}/forestTransition.webp`
  : '/forestTransition.webp';
export const FOREST_TREES_IMAGE_PATH = process.env.PUBLIC_URL
  ? `${process.env.PUBLIC_URL}/forest_light_trees.webp`
  : '/forest_light_trees.webp';
export const FOREST_GROUND_IMAGE_PATH = process.env.PUBLIC_URL
  ? `${process.env.PUBLIC_URL}/forest_light_ground.webp`
  : '/forest_light_ground.webp';

// Background scroll speeds
export const BACKGROUND_SCROLL_SPEED = 0.5; // Speed for far background trees
export const GROUND_SCROLL_SPEED = 1; // Same speed as stars (faster than background for parallax)

// Background transition threshold
export const FOREST_UNLOCK_SCORE = 50; // Score at which forest theme unlocks (when energy bar reaches 100%)
export const GROUND_HEIGHT_EXTENSION_PERCENT = 0.025; // 2.5% of screen height. Replaces fixed pixel value.
export const GROUND_HEIGHT_EXTENSION = 20; // DEPRECATED: Kept for reference, but not used in calculations.

// Stars background gradient (applied over stars, used by backgroundStars system)
export const BACKGROUND_OVERLAY_GRADIENT_START = 'rgba(0, 0, 0, .8)'; // Bottom: more opaque
export const BACKGROUND_OVERLAY_GRADIENT_END = 'rgba(0, 0, 0, .65)';   // Top: more transparent

// Stars opacity mask gradient (fades stars based on vertical position)
// Stars fade from full opacity at bottom to transparent at top
export const STARS_FADE_START_POSITION = 0.5;  // 50% screen height - full opacity (1.0)
export const STARS_FADE_END_POSITION = 0.8;    // 80% screen height - zero opacity (0.0)
export const STARS_FADE_START_OPACITY = 1.0;   // Full opacity at start position
export const STARS_FADE_END_OPACITY = 0.0;     // Transparent at end position

// Ground gradient overlay (applied over scrolling background, under ground layer)
// Gradient goes from bottom (start) to top (end) of screen
// Format: 'rgba(red, green, blue, alpha)' where alpha is 0 (transparent) to 1 (opaque)
// Start: Black at 10% from bottom, then transitions smoothly
// End: Transparent at 90% from bottom (10% from top)
export const GRADIENT_OVERLAY_START_COLOR = 'rgba(0, 0, 0, 0.4)'; // Bottom: 40% opacity black
export const GRADIENT_OVERLAY_END_COLOR = 'rgba(0, 0, 0, 0)';     // Top: fully transparent
export const GRADIENT_OVERLAY_START_POSITION = 0.9; // Start at 90% height (10% from bottom)
export const GRADIENT_OVERLAY_END_POSITION = 0.1;   // End at 10% height (90% from bottom)

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

// 🎈 ENEMY FLOATING OSCILLATION (Makes enemy look like it's floating)
export const ENEMY_FLOAT_ENABLED = true; // Enable/disable floating effect
export const ENEMY_FLOAT_AMPLITUDE = 3; // How many pixels up/down to oscillate (try 2-5 for subtle, 5-10 for noticeable)
export const ENEMY_FLOAT_FREQUENCY = 0.04; // Speed of oscillation (try 0.02-0.06, lower = slower)
export const ENEMY_FLOAT_SETTLE_OSCILLATIONS = 2; // Number of dampened oscillations after reaching target position (2-4 looks natural)

// 🎯 ENEMY BOUNCE MODE (4th, 7th, 10th outs)
export const BOUNCE_MODE_LASER_THRESHOLD = 5; // Number of enemy lasers before returning to hover mode
