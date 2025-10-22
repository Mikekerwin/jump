/**
 * Audio Manager System
 * Handles all game sound effects and background music
 */

import {
  BOUNCE_SOUND_PATH,
  LASER_HIT_SOUND_PATH,
  BACKGROUND_MUSIC_PATH,
  BACKGROUND_MUSIC_VOLUME,
  BOUNCE_DEBOUNCE_MS,
} from '../config/gameConfig';

export class AudioManager {
  private bounceSound: HTMLAudioElement | null = null;
  private laserHitSound: HTMLAudioElement | null = null;
  private backgroundMusic: HTMLAudioElement | null = null;
  private lastBounceTime: number = 0;
  private isUnlocked: boolean = false;
  private hasPlayedJumpSound: boolean = false; // Track if jump sound played this press

  /**
   * Initialize audio system (must be called on user interaction)
   */
  initialize(): void {
    if (this.isUnlocked) return;

    // Create bounce sound
    this.bounceSound = new Audio(BOUNCE_SOUND_PATH);
    this.bounceSound.volume = 1;

    // Create laser hit sound
    this.laserHitSound = new Audio(LASER_HIT_SOUND_PATH);
    this.laserHitSound.volume = 1;

    // Create background music
    this.backgroundMusic = new Audio(BACKGROUND_MUSIC_PATH);
    this.backgroundMusic.loop = true;
    this.backgroundMusic.volume = BACKGROUND_MUSIC_VOLUME;

    // Start background music
    this.backgroundMusic.play().catch(() => {
      // Autoplay might be blocked
    });

    // Unlock bounce sound
    this.bounceSound
      .play()
      .then(() => {
        if (this.bounceSound) {
          this.bounceSound.pause();
          this.bounceSound.currentTime = 0;
        }
      })
      .catch(() => {
        // Autoplay might be blocked
      });

    this.isUnlocked = true;
  }

  /**
   * Play jump sound (only once per button press)
   */
  playJumpSound(): void {
    if (!this.bounceSound) return;
    if (this.hasPlayedJumpSound) return; // Don't play again until released

    this.bounceSound.currentTime = 0;
    this.bounceSound.volume = 1;
    this.bounceSound.play().catch(() => {
      // Playback might fail
    });

    this.hasPlayedJumpSound = true;
  }

  /**
   * Reset jump sound flag (call when button is released)
   */
  resetJumpSound(): void {
    this.hasPlayedJumpSound = false;
  }

  /**
   * Play bounce sound with volume control (for landing)
   */
  playBounce(volume: number = 1): void {
    if (!this.bounceSound) return;

    const now = performance.now();

    // Debounce rapid bounces
    if (now - this.lastBounceTime < BOUNCE_DEBOUNCE_MS) {
      return;
    }

    this.bounceSound.currentTime = 0;
    this.bounceSound.volume = Math.max(0, Math.min(1, volume));
    this.bounceSound.play().catch(() => {
      // Playback might fail
    });

    this.lastBounceTime = now;
  }

  /**
   * Play laser hit sound
   */
  playLaserHit(): void {
    if (!this.laserHitSound) return;

    this.laserHitSound.currentTime = 0;
    this.laserHitSound.volume = 1;
    this.laserHitSound.play().catch(() => {
      // Playback might fail
    });
  }

  /**
   * Play background music
   */
  playBackgroundMusic(): void {
    if (!this.backgroundMusic) return;
    this.backgroundMusic.play().catch(() => {
      // Autoplay might be blocked
    });
  }

  /**
   * Pause background music
   */
  pauseBackgroundMusic(): void {
    if (!this.backgroundMusic) return;
    this.backgroundMusic.pause();
  }

  /**
   * Set background music volume
   */
  setMusicVolume(volume: number): void {
    if (!this.backgroundMusic) return;
    this.backgroundMusic.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Cleanup audio resources
   */
  dispose(): void {
    if (this.bounceSound) {
      this.bounceSound.pause();
      this.bounceSound = null;
    }
    if (this.laserHitSound) {
      this.laserHitSound.pause();
      this.laserHitSound = null;
    }
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic = null;
    }
  }

  /**
   * Check if audio is unlocked
   */
  isAudioUnlocked(): boolean {
    return this.isUnlocked;
  }
}

/**
 * Hook for unlocking audio on first user interaction
 */
export const setupAudioUnlock = (audioManager: AudioManager): (() => void) => {
  const unlockAudio = () => {
    audioManager.initialize();
    cleanup();
  };

  const cleanup = () => {
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };

  window.addEventListener('click', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
  window.addEventListener('touchstart', unlockAudio);

  return cleanup;
};
