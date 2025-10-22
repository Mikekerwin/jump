# Jump - Game Refactoring Guide

## Overview

This document describes the refactored architecture of the Jump game. The game has been restructured from a single monolithic file into a modular, maintainable codebase.

## Project Structure

```
src/
├── config/
│   └── gameConfig.ts          # All game constants and configuration
├── types/
│   └── game.ts                # TypeScript type definitions
├── systems/
│   ├── playerPhysics.ts       # Player movement and physics
│   ├── laserPhysics.ts        # Laser/enemy mechanics
│   ├── audioManager.ts        # Sound effects and music
│   └── backgroundStars.ts     # Starfield animation
├── components/
│   ├── Player.tsx             # Player ball component
│   ├── Enemy.tsx              # Enemy launcher component
│   ├── Laser.tsx              # Laser projectile component
│   ├── Background.tsx         # Stars canvas component
│   ├── GameOver.tsx           # Game over screen
│   └── ScoreDisplay.tsx       # Score display
├── hooks/
│   └── useGameLoop.ts         # Main game loop and orchestration
└── App.tsx                    # Main game container

```

## Architecture Overview

### 1. Configuration Layer (`config/`)

**gameConfig.ts** - Centralized game constants
- Physics parameters (gravity, energy loss, boost values)
- Entity sizes and dimensions
- Laser configuration and difficulty scaling
- Audio file paths and volumes
- Layout positioning constants

**Benefits:**
- Easy game balancing - change values in one place
- Clear separation of game tuning from logic
- Easy to create difficulty presets

### 2. Type System (`types/`)

**game.ts** - TypeScript interfaces
- `PlayerState` - Player position, velocity, scaling
- `LaserState` - Laser position and status
- `GameState` - Overall game state
- `AudioState` - Audio system state
- `GameDimensions` - Screen dimensions and positioning

**Benefits:**
- Type safety throughout the codebase
- Self-documenting code
- Better IDE autocomplete

### 3. Game Systems (`systems/`)

#### **playerPhysics.ts** - Player Physics System
Handles all player-related physics:
- Gravity simulation
- Jump mechanics (initial boost + hold boost)
- Floor and ceiling collision
- Bounce physics with energy loss
- Squash and stretch animation
- Velocity-based bounce volume calculation

**Key Methods:**
- `update()` - Update player physics each frame
- `startJump()` - Handle jump input
- `endJump()` - Handle jump release
- `shouldPlayBounceSound()` - Bounce detection
- `reset()` - Reset player state

#### **laserPhysics.ts** - Laser/Enemy Physics System
Manages laser projectiles and enemy behavior:
- Laser spawning and movement
- Collision detection with player
- Score tracking (hit/pass/jump detection)
- Dynamic laser count based on score
- Progressive speed increase
- Enemy position synchronization

**Key Methods:**
- `update()` - Update all lasers and check collisions
- `updateLaserCount()` - Scale difficulty with score
- `reset()` - Reset laser system

#### **audioManager.ts** - Audio System
Controls all game audio:
- Background music playback
- Bounce sound effects
- Volume control
- Audio unlock for mobile browsers
- Debouncing rapid sounds

**Key Methods:**
- `initialize()` - Setup audio on user interaction
- `playBounce()` - Play bounce with dynamic volume
- `playBackgroundMusic()` - Start background track
- `dispose()` - Cleanup audio resources

#### **backgroundStars.ts** - Background Animation
Renders parallax starfield:
- Random star generation
- Horizontal scrolling
- Canvas rendering
- Screen wrapping

**Key Methods:**
- `update()` - Move stars each frame
- `render()` - Draw to canvas
- `reset()` - Randomize positions

### 4. React Components (`components/`)

Each component is a pure presentational component:

- **Player.tsx** - Renders player ball with physics-based transform
- **Enemy.tsx** - Renders enemy launcher with smooth transitions
- **Laser.tsx** - Renders individual laser projectiles
- **Background.tsx** - Canvas wrapper for star rendering
- **GameOver.tsx** - Game over screen with restart
- **ScoreDisplay.tsx** - Score UI element

**Benefits:**
- Reusable components
- Easy to style and modify visually
- Separation of rendering from logic

### 5. Game Loop (`hooks/`)

**useGameLoop.ts** - Central orchestration
Coordinates all game systems:
- Initializes all physics systems
- Runs main game loop
- Handles window resize
- Manages game state
- Provides input handlers

**Returns:**
- Game state (score, gameOver, etc.)
- Entity states (player, lasers, enemy)
- System references (backgroundStars)
- Event handlers (jump, restart)

### 6. Main App (`App.tsx`)

Simplified to ~130 lines (from 398):
- Uses `useGameLoop` hook
- Renders components
- Sets up input listeners
- Manages canvas rendering

## How the Systems Work Together

```
┌─────────────┐
│   App.tsx   │  Main container
└──────┬──────┘
       │
       ├─► useGameLoop()  ◄────┐ Orchestrates everything
       │                       │
       ├─► PlayerPhysics  ◄────┤ Updates player state
       │                       │
       ├─► LaserPhysics   ◄────┤ Updates lasers & collision
       │                       │
       ├─► AudioManager   ◄────┤ Plays sounds
       │                       │
       └─► BackgroundStars ◄───┘ Animates background
```

## Benefits of This Architecture

### Maintainability
- Each system has a single responsibility
- Easy to locate and fix bugs
- Changes to one system don't affect others

### Testability
- Each system can be unit tested independently
- Mock systems easily for integration tests
- Clear input/output contracts

### Scalability
- Easy to add new features:
  - New enemy types → create new class in `systems/`
  - Power-ups → new component + physics system
  - Multiple levels → configuration presets
  - Particle effects → new rendering system

### Readability
- Small, focused files (50-200 lines each)
- Clear naming conventions
- Self-documenting structure

## How to Add Features

### Example: Adding a Power-Up System

1. **Add configuration** (`config/gameConfig.ts`):
```typescript
export const POWERUP_SIZE = 30;
export const POWERUP_SPAWN_INTERVAL = 10000;
```

2. **Add types** (`types/game.ts`):
```typescript
export interface PowerUpState {
  position: Position;
  type: 'shield' | 'double-score';
  active: boolean;
}
```

3. **Create system** (`systems/powerUpPhysics.ts`):
```typescript
export class PowerUpPhysics {
  update() { /* movement logic */ }
  checkCollision() { /* collision detection */ }
}
```

4. **Create component** (`components/PowerUp.tsx`):
```typescript
export const PowerUp: React.FC<PowerUpProps> = ({ ... }) => {
  return <div style={{ ... }} />;
};
```

5. **Integrate in hook** (`hooks/useGameLoop.ts`):
```typescript
const powerUpPhysics = new PowerUpPhysics();
// Update in game loop
```

6. **Render in App** (`App.tsx`):
```tsx
<PowerUp position={powerUp.position} type={powerUp.type} />
```

## Configuration & Tuning

All game balance parameters are in `config/gameConfig.ts`. To adjust difficulty:

**Make game easier:**
- Decrease `GRAVITY` (slower fall)
- Increase `BOOST` (higher jumps)
- Decrease `LASER_SPEED_INCREMENT` (slower progression)

**Make game harder:**
- Increase `GRAVITY` (faster fall)
- Decrease `BOOST` (lower jumps)
- Increase `SCORE_PER_LASER_UNLOCK` (faster laser unlocks)
- Increase `LASER_SPEED_INCREMENT` (faster speed ramp)

## Development Workflow

1. **Modify game balance** → Edit `config/gameConfig.ts`
2. **Fix physics bugs** → Edit specific system in `systems/`
3. **Change visuals** → Edit components in `components/`
4. **Add new mechanics** → Create new system + component
5. **Adjust game flow** → Edit `hooks/useGameLoop.ts`

## Performance Considerations

- Physics systems use class instances (single allocation)
- React components are pure and memo-friendly
- Canvas rendering for background (efficient)
- DOM elements for game entities (hardware accelerated)
- Refs used for direct DOM manipulation where needed

## Next Steps

Potential improvements:
- [ ] Add particle effects system
- [ ] Implement local high score persistence
- [ ] Add difficulty levels (easy/normal/hard configs)
- [ ] Create power-up system
- [ ] Add visual effects (screen shake, hit flash)
- [ ] Implement combo system
- [ ] Add mobile touch controls UI
- [ ] Create level progression system
- [ ] Add achievement system
- [ ] Implement WebGL renderer for better performance

## Conclusion

The refactored architecture provides a solid foundation for game development. Each system is independent, testable, and easy to modify. The modular structure makes it simple to add features, fix bugs, and maintain the codebase as it grows.
