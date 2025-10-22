# Jump Game - Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                           App.tsx                               │
│                     (Main Container)                            │
│  • Renders all components                                       │
│  • Sets up input listeners                                      │
│  • Manages canvas                                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     useGameLoop Hook                            │
│                  (Game Orchestration)                           │
│  • Initializes systems                                          │
│  • Runs main game loop (requestAnimationFrame)                 │
│  • Manages game state                                           │
│  • Provides event handlers                                      │
└───┬─────────┬─────────┬─────────┬─────────┬────────────────────┘
    │         │         │         │         │
    ▼         ▼         ▼         ▼         ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────────┐
│ Player  │ │ Laser   │ │ Audio   │ │ Bg Stars│ │ Config       │
│ Physics │ │ Physics │ │ Manager │ │ System  │ │ Constants    │
└─────────┘ └─────────┘ └─────────┘ └─────────┘ └──────────────┘
    │         │         │         │
    │         │         │         │
    ▼         ▼         ▼         ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ Player  │ │ Laser + │ │ Audio   │ │ Canvas  │
│ Comp.   │ │ Enemy   │ │ (HTML5) │ │ Render  │
│         │ │ Comps.  │ │         │ │         │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
```

## Data Flow

```
User Input (Mouse/Key/Touch)
         │
         ▼
   handleJumpStart/End
         │
         ▼
   PlayerPhysics.startJump()
         │
         ▼
   Game Loop (60 FPS)
         │
         ├─► PlayerPhysics.update() ──► Player position/velocity
         │                               │
         │                               ▼
         │                          Player Component
         │
         ├─► LaserPhysics.update() ──► Laser positions
         │       │                      │
         │       ├─► Collision?         ▼
         │       ├─► Score change   Laser Components
         │       └─► Enemy position     │
         │                               ▼
         │                          Enemy Component
         │
         ├─► BackgroundStars.update() ──► Star positions
         │                                  │
         │                                  ▼
         │                             Canvas Render
         │
         └─► AudioManager ──► Sound playback
                  │
                  ├─► Bounce sound (on collision)
                  └─► Background music (looping)
```

## Component Hierarchy

```
App
├── Canvas (Background Stars)
├── ScoreDisplay
│
├── Player
│   └── props: { playerState, isHit }
│
├── Enemy
│   └── props: { x, y }
│
├── Laser[] (array of lasers)
│   └── props: { x, y }
│
└── GameOver (conditional)
    └── props: { onRestart }
```

## System Responsibilities

### ⚙️ Physics Systems (Pure Logic)

```
PlayerPhysics
├── Gravity calculation
├── Jump boost mechanics
├── Collision detection (floor/ceiling)
├── Bounce physics
├── Squash & stretch animation
└── Sound trigger detection

LaserPhysics
├── Laser movement
├── Collision with player
├── Score calculation
├── Laser spawning/despawning
├── Difficulty scaling
└── Enemy position sync

AudioManager
├── Sound initialization
├── Bounce sound playback
├── Background music control
├── Volume management
└── Mobile audio unlock

BackgroundStars
├── Star generation
├── Parallax scrolling
├── Canvas rendering
└── Screen wrapping
```

### 🎨 React Components (Presentation)

```
Player Component
└── Renders player ball with transform

Enemy Component
└── Renders enemy launcher

Laser Component
└── Renders laser projectile

Background Component
└── Canvas wrapper for stars

GameOver Component
└── Game over overlay + restart

ScoreDisplay Component
└── Score text display
```

### ⚙️ Configuration

```
gameConfig.ts
├── Physics constants
├── Entity sizes
├── Difficulty parameters
├── Audio paths
└── Layout positions
```

## Execution Flow (One Frame)

```
1. requestAnimationFrame(loop)
   │
2. BackgroundStars.update()
   ├── Move stars left
   └── Wrap around screen edges
   │
3. BackgroundStars.render(canvas)
   ├── Clear canvas
   └── Draw all stars
   │
4. LaserPhysics.updateLaserCount(score)
   ├── Calculate new laser count
   └── Add/remove lasers as needed
   │
5. PlayerPhysics.update()
   ├── Apply gravity
   ├── Apply hold boost
   ├── Update position
   ├── Check floor collision
   ├── Calculate bounce
   └── Update squash/stretch
   │
6. Check bounce sound
   ├── shouldPlayBounceSound()?
   └── AudioManager.playBounce(volume)
   │
7. LaserPhysics.update(score, playerPos, hasJumped)
   ├── Move all lasers
   ├── Check collision with player
   ├── Check if player passed laser
   ├── Update score (±points)
   ├── Respawn off-screen lasers
   └── Return: { scoreChange, wasHit, newEnemyY }
   │
8. Update React state
   ├── setPlayerState(newState)
   ├── setLasers([...lasers])
   ├── setEnemyY(newY)
   ├── setWasHit(hitStatus)
   └── setScore(newScore)
   │
9. React re-renders components
   ├── Player (new position/scale)
   ├── Enemy (new Y position)
   ├── Lasers (new X positions)
   └── Score (new value)
   │
10. Check game over
    └── If score < 0: setGameOver(true)
    │
11. Loop back to step 1
```

## File Dependencies

```
App.tsx
├── imports useGameLoop
│   ├── imports PlayerPhysics
│   ├── imports LaserPhysics
│   ├── imports AudioManager
│   ├── imports BackgroundStars
│   ├── imports gameConfig
│   └── imports types
│
├── imports Player component
├── imports Enemy component
├── imports Laser component
├── imports GameOver component
└── imports ScoreDisplay component
```

## Configuration Flow

```
gameConfig.ts (Single Source of Truth)
    │
    ├─► PlayerPhysics (GRAVITY, BOOST, etc.)
    ├─► LaserPhysics (LASER_SPEED, etc.)
    ├─► AudioManager (AUDIO_PATHS, VOLUMES)
    ├─► BackgroundStars (NUM_STARS, STAR_SPEED)
    └─► Components (BALL_SIZE, LASER_SIZE)
```

## State Management

```
React State (in useGameLoop)
├── score (displayed to user)
├── gameOver (shows/hides game over screen)
├── playerState (rendered by Player component)
├── lasers[] (rendered by Laser components)
├── enemyY (rendered by Enemy component)
├── numLasers (determines laser count)
└── wasHit (triggers red flash effect)

Refs (persistent across renders)
├── playerPhysicsRef (physics instance)
├── laserPhysicsRef (physics instance)
├── audioManagerRef (audio instance)
├── backgroundStarsRef (stars instance)
├── scoreRef (for game loop)
└── dimensionsRef (screen dimensions)
```

## Event Flow

```
User Click/Touch/Keypress
         │
         ▼
Event Listener (App.tsx)
         │
         ▼
handleJumpStart() ──► PlayerPhysics.startJump()
                      │
                      ├─► Set velocity
                      ├─► Set hasJumped flag
                      ├─► Start hold timer
                      └─► AudioManager.playBounce()

handleJumpEnd() ──► PlayerPhysics.endJump()
                    │
                    └─► Clear isHolding flag

handleRestart() ──► Reset all systems
                    │
                    ├─► PlayerPhysics.reset()
                    ├─► LaserPhysics.reset()
                    ├─► BackgroundStars.reset()
                    └─► Reset React state
```

## Performance Optimizations

- **Class instances** - Reused across frames (no GC pressure)
- **Refs** - Avoid unnecessary re-renders
- **Canvas rendering** - Hardware accelerated background
- **Transform3d** - GPU-accelerated entity movement
- **Pure components** - Render only when props change
- **requestAnimationFrame** - Smooth 60 FPS rendering

## Adding New Features (Template)

```
1. Config (gameConfig.ts)
   └── Add feature constants

2. Types (types/game.ts)
   └── Add feature interfaces

3. System (systems/featurePhysics.ts)
   └── Create feature class with update() method

4. Component (components/Feature.tsx)
   └── Create feature rendering component

5. Hook (hooks/useGameLoop.ts)
   ├── Initialize feature system
   ├── Call system.update() in loop
   └── Return feature state

6. App (App.tsx)
   └── Render feature component
```
