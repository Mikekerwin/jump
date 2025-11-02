/**
 * Game Configuration Constants
 * All game balance, physics, and layout parameters
 */

// 🟦 PLAYER BALL CONFIGURATION
export const BALL_SIZE = 80;
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

// ⚙️ PHYSICS PARAMETERS
export const GRAVITY = 0.42;
export const ENERGY_LOSS = 0.5; // Bounce energy retention
export const BOOST = 15.35; // Initial jump boost
export const HOLD_BOOST = 0.16; // Continuous boost while holding
export const MAX_HOLD_TIME = 2200; // Maximum hold duration in ms

// 🔴 LASER CONFIGURATION
export const LASER_WIDTH = 25;
export const LASER_HEIGHT = 2;
export const BASE_LASER_SPEED = 5.5; // Constant laser speed (no more incrementing)
export const LASER_SPEED_INCREMENT = 0; // Disabled - no longer incrementing speed
export const LASER_SPEED_REDUCTION_ON_UNLOCK = 0; // Disabled
export const LASER_SPEED_GRADUAL_REDUCTION = 0; // Disabled
export const LASER_SPEED_AT_SCORE_50 = 5; // Disabled (using constant speed)
export const LASER_SPEED_AT_SCORE_75 = 6; // Disabled (using constant speed)
export const LASER_SPEED_TRANSITION_DURATION = 150; // Disabled
export const MAX_LASERS = 4;
export const SCORE_PER_LASER_UNLOCK = 25; // Score needed to unlock new laser
export const WIDE_LASER_UNLOCK_SCORE = 100; // Score needed to enable wide lasers
export const WIDE_LASER_WIDTH = 125; // Width of the special wide laser
export const WIDE_LASER_HIT_VALUE = 5; // How many hits a wide laser counts for

// 🌪 LASER CHAOS / RANDOMNESS (increases every 5 points, resets every 25)
export const CHAOS_INCREMENT_INTERVAL = 5; // Points between chaos increases
export const BASE_LASER_RANDOMNESS = 1.0; // Base randomness factor (100% of available range - full randomness)
export const CHAOS_MULTIPLIER_PER_INTERVAL = 0.0; // No additional randomness (already at max)

// ⚡️ DIFFICULTY SCALING
export const SCORE_PER_SPEED_INCREMENT = 5;
export const SPEED_INCREMENTS_PER_CYCLE = 5;

// 🌌 BACKGROUND CONFIGURATION
export const NUM_STARS = 90;
export const STAR_SPEED = 1;
// Background image configuration
// In development, PUBLIC_URL is typically empty, so we use relative path
export const BACKGROUND_IMAGE_PATH = process.env.PUBLIC_URL
  ? `${process.env.PUBLIC_URL}/background.png`
  : '/background.png';
export const BACKGROUND_SCROLL_SPEED = 0.5; // Slower than stars
export const BACKGROUND_HEIGHT_SCALE = 1.4; // Make background 15% taller while maintaining ratio
// Background overlay gradient (applied over scrolling background, under stars)
// Gradient goes from bottom (start) to top (end) of screen
// Format: 'rgba(red, green, blue, alpha)' where alpha is 0 (transparent) to 1 (opaque)
export const BACKGROUND_OVERLAY_GRADIENT_START = 'rgba(0, 0, 0, .8)'; // Bottom: more opaque
export const BACKGROUND_OVERLAY_GRADIENT_END = 'rgba(0, 0, 0, .65)';   // Top: more transparent

// 🧭 LAYOUT CONFIGURATION
export const PLAYER_X_POSITION = 0.25; // 25% from left
export const FLOOR_Y_POSITION = 0.75;  // 75% from top
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
