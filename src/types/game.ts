/**
 * Game Type Definitions
 */

export interface Position {
  x: number;
  y: number;
}

export interface PlayerState {
  position: Position;
  velocity: number;
  scaleX: number; // Kept for compatibility, now used for bounce offset X
  scaleY: number; // Kept for compatibility, now used for bounce offset Y
  bounceOffsetX: number; // Horizontal offset for squash/stretch animation
  bounceOffsetY: number; // Vertical offset for squash/stretch animation
  hasJumped: boolean;
  isHolding: boolean;
  holdStartTime: number;
}

export interface LaserState {
  x: number;
  y: number;
  hit: boolean;
  scored: boolean;
  passed: boolean;
  nextY?: number; // Pre-calculated Y position for next spawn
  width?: number; // Custom width for special lasers (e.g., double-width at score 100)
  isOscillating?: boolean; // Whether this laser oscillates in size (score 125+)
  oscillationPhase?: number; // Phase offset for oscillation animation
}

export interface PlayerProjectile {
  x: number;
  y: number;
  active: boolean;
}

export interface Star {
  x: number;
  y: number;
  r: number; // radius
}

export type GameLevel = 1 | 2 | 3;

export interface GameState {
  score: number;
  gameOver: boolean;
  numLasers: number;
  laserSpeed: number;
  level: GameLevel;
  enemyHits: number; // Track how many times enemy has hit the player (Level 2)
  playerOuts: number; // Track player outs (0-10)
  enemyOuts: number; // Track enemy outs (0-10)
  shootGameOver: boolean; // Special game over when player reaches 10 outs
}

export interface AudioState {
  bounceSound: HTMLAudioElement | null;
  backgroundMusic: HTMLAudioElement | null;
  lastBounceTime: number;
}

export interface GameDimensions {
  width: number;
  height: number;
  centerY: number;
  playerStartX: number;
  enemyX: number;
}
