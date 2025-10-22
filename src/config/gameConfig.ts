/**
 * Game Configuration Constants
 * All game balance, physics, and layout parameters
 */

// 🟦 PLAYER BALL CONFIGURATION
export const BALL_SIZE = 80;
export const HITBOX_SIZE = BALL_SIZE + 20;
export const PLAYER_HORIZONTAL_RANGE_LEFT = 100; // Pixels player can move left from center
export const PLAYER_HORIZONTAL_RANGE_RIGHT = 200; // Pixels player can move right from center

// 🟢 PLAYER SHOOTING (UNLOCKS AT SCORE 200+)
export const PLAYER_PROJECTILE_SPEED = 8;
export const PLAYER_PROJECTILE_WIDTH = 15;
export const PLAYER_PROJECTILE_HEIGHT = 4;

// Enemy growth every 20 hits — each level adds +25% to size
export const ENEMY_WIDTH_GROWTH_PER_CYCLE = BALL_SIZE * 0.25;
export const ENEMY_HEIGHT_GROWTH_PER_CYCLE = BALL_SIZE * 0.25;

// ⚙️ PHYSICS PARAMETERS
export const GRAVITY = 0.42;
export const ENERGY_LOSS = 0.55; // Bounce energy retention
export const BOOST = 15.35; // Initial jump boost
export const HOLD_BOOST = 0.16; // Continuous boost while holding
export const MAX_HOLD_TIME = 2000; // Maximum hold duration in ms

// 🔴 LASER CONFIGURATION
export const LASER_WIDTH = 25;
export const LASER_HEIGHT = 2;
export const BASE_LASER_SPEED = 4.5;
export const LASER_SPEED_INCREMENT = 1.2;
export const MAX_LASERS = 4;
export const SCORE_PER_LASER_UNLOCK = 25; // Score needed to unlock new laser

// 🌪 LASER CHAOS / RANDOMNESS (increases every 5 points, resets every 25)
export const CHAOS_INCREMENT_INTERVAL = 5; // Points between chaos increases
export const BASE_LASER_RANDOMNESS = 0.3; // Base randomness factor (30% of screen)
export const CHAOS_MULTIPLIER_PER_INTERVAL = 0.15; // Additional randomness per 5 points

// ⚡️ DIFFICULTY SCALING
export const SCORE_PER_SPEED_INCREMENT = 5;
export const SPEED_INCREMENTS_PER_CYCLE = 5;

// 🌌 BACKGROUND CONFIGURATION
export const NUM_STARS = 100;
export const STAR_SPEED = 1;

// 🧭 LAYOUT CONFIGURATION
export const PLAYER_X_POSITION = 0.25; // 25% from left
export const FLOOR_Y_POSITION = 0.75;  // 75% from top
export const ENEMY_X_POSITION = 0.9;   // 90% from left

// 🔊 AUDIO CONFIGURATION
// Use process.env.PUBLIC_URL to work with GitHub Pages deployment
export const BOUNCE_SOUND_PATH = `${process.env.PUBLIC_URL}/bounce.mp3`;
export const LASER_HIT_SOUND_PATH = `${process.env.PUBLIC_URL}/lazerHit.mp3`;
export const BACKGROUND_MUSIC_PATH = `${process.env.PUBLIC_URL}/audioTrack.mp3`;
export const BACKGROUND_MUSIC_VOLUME = 0.25;
export const BOUNCE_DEBOUNCE_MS = 150;

// 🎮 GAMEPLAY BALANCE
export const SCORE_UPDATE_INTERVAL = 200; // ms
export const MIN_BOUNCE_VELOCITY = 0.3;   // Minimum velocity to trigger bounce

// 🔴 ENEMY MOVEMENT & BEHAVIOR
export const ENEMY_MOVE_SPEED = 0.12; // Smooth interpolation speed (0–1)
export const ENEMY_MOVEMENT_DELAY = 500; // Delay before moving to next Y position
export const ENEMY_SETTLE_THRESHOLD = 15; // Distance threshold for oscillation start
export const ENEMY_BOUNCE_AMPLITUDE = 3; // Strength of enemy “settling” bounce
export const ENEMY_OSCILLATION_DAMPING = 0.75; // Energy retention of bounce
export const ENEMY_MIN_OSCILLATION_VELOCITY = 0.15; // Cutoff velocity to stop oscillating
export const LASER_PREP_DISTANCE = 500; // Distance from enemy where next laser is determined
