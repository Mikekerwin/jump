# Enemy Movement Timing - Adjustment Guide

## Where to Control the Speed

The red ball's movement speed is controlled by **one constant** in the config file:

### 📍 [gameConfig.ts](src/config/gameConfig.ts:50)

```typescript
// Enemy Movement
export const ENEMY_MOVE_SPEED = 0.08; // ← ADJUST THIS!
```

---

## How It Works

### The Physics Formula

In [laserPhysics.ts](src/systems/laserPhysics.ts:179):

```typescript
this.enemyY += (this.targetEnemyY - this.enemyY) * ENEMY_MOVE_SPEED;
```

This is called **lerp** (linear interpolation) or **exponential easing**.

### What This Means

Every frame (60 FPS), the enemy moves **8%** of the remaining distance to the target.

```
Frame 1: Distance = 200px → Move 16px  (200 * 0.08)
Frame 2: Distance = 184px → Move 14.7px (184 * 0.08)
Frame 3: Distance = 169px → Move 13.5px (169 * 0.08)
...continues slowing down naturally
```

**Result:** Natural easing - starts fast, slows down as it approaches!

---

## Timing Presets

### 🐌 Very Slow (Floaty, Dreamy)
```typescript
export const ENEMY_MOVE_SPEED = 0.03;
```
- Takes ~4-5 seconds to reach target
- Very smooth, gradual morphing
- Feels like moving through thick liquid
- Good for: Relaxed gameplay, emphasis on animation

---

### 🚶 Slow (Deliberate, Smooth)
```typescript
export const ENEMY_MOVE_SPEED = 0.05;
```
- Takes ~2-3 seconds to reach target
- Noticeable morphing animation
- Clear telegraphing of movement
- Good for: Giving players time to anticipate

---

### 🏃 Default (Balanced)
```typescript
export const ENEMY_MOVE_SPEED = 0.08; // ← Current setting
```
- Takes ~1-1.5 seconds to reach target
- Smooth but not too slow
- Visible morphing throughout
- Good for: Current gameplay balance

---

### 🏃‍♂️ Fast (Snappy, Responsive)
```typescript
export const ENEMY_MOVE_SPEED = 0.12;
```
- Takes ~0.8-1 second to reach target
- Quick, responsive movement
- Morphing visible but brief
- Good for: Faster gameplay, less predictable

---

### ⚡ Very Fast (Instant, Arcade)
```typescript
export const ENEMY_MOVE_SPEED = 0.20;
```
- Takes ~0.4-0.6 seconds to reach target
- Almost instant movement
- Minimal morphing visible
- Good for: Arcade-style, fast-paced gameplay

---

### 🎯 Instant (No Animation)
```typescript
export const ENEMY_MOVE_SPEED = 1.0;
```
- Snaps to target immediately
- No interpolation
- No morphing visible
- Good for: Testing, or instant teleport effect

---

## Understanding the Value

The `ENEMY_MOVE_SPEED` is a **percentage** (0.0 to 1.0):

| Value | Meaning | Speed |
|-------|---------|-------|
| 0.01 | Move 1% per frame | Extremely slow |
| 0.05 | Move 5% per frame | Slow |
| 0.08 | Move 8% per frame | **Default** |
| 0.12 | Move 12% per frame | Fast |
| 0.20 | Move 20% per frame | Very fast |
| 0.50 | Move 50% per frame | Instant |
| 1.00 | Move 100% per frame | Teleport |

---

## Why Not CSS `transition: 1s`?

CSS transitions are **time-based**:
```css
/* CSS - Fixed 1 second duration */
transition: transform 1s ease;
```

Our system is **physics-based**:
```typescript
// JavaScript - Adjusts to distance & slows naturally
enemyY += (targetY - enemyY) * 0.08;
```

### Comparison

**CSS Transition:**
- ✅ Simple to implement
- ❌ Fixed duration (always 1 second)
- ❌ Same speed regardless of distance
- ❌ Hard to sync with game physics
- ❌ Can't easily track velocity for morphing

**Physics Interpolation (Current):**
- ✅ Natural easing (auto slow-down)
- ✅ Adapts to distance (longer = longer time)
- ✅ Syncs perfectly with game loop
- ✅ Easy to track velocity for morphing
- ✅ Can be tuned with one value
- ✅ Matches blue ball physics

---

## Morphing Visibility vs Speed

### Slower Speed = More Morphing Visible

```typescript
ENEMY_MOVE_SPEED = 0.03 (slow)

Frame 1:  Y=500, moving 6px  → scaleY=1.12, scaleX=0.94
Frame 10: Y=450, moving 5px  → scaleY=1.10, scaleX=0.95
Frame 20: Y=410, moving 4px  → scaleY=1.08, scaleX=0.96
Frame 40: Y=350, moving 2px  → scaleY=1.04, scaleX=0.98
...morphing visible for 100+ frames
```

### Faster Speed = Less Morphing Visible

```typescript
ENEMY_MOVE_SPEED = 0.20 (fast)

Frame 1:  Y=500, moving 40px → scaleY=1.60, scaleX=0.70
Frame 2:  Y=460, moving 32px → scaleY=1.48, scaleX=0.76
Frame 5:  Y=360, moving 20px → scaleY=1.30, scaleX=0.85
Frame 10: Y=305, moving 5px  → scaleY=1.05, scaleX=0.98
...morphing visible for ~10 frames only
```

---

## Recommended Settings by Goal

### Goal: Maximum Visual Polish (Slow & Smooth)
```typescript
export const ENEMY_MOVE_SPEED = 0.04;
```
- Enemy floats gracefully
- Morphing animation very visible
- Players can clearly see anticipation
- Best for: Visual showcase, relaxed gameplay

---

### Goal: CSS `transition: 1s` Equivalent
```typescript
export const ENEMY_MOVE_SPEED = 0.06;
```
- Roughly matches a 1-second CSS transition
- Smooth but not too slow
- Good balance of speed and animation
- Best for: Natural, familiar timing

---

### Goal: Current Game Feel (Balanced)
```typescript
export const ENEMY_MOVE_SPEED = 0.08; // ← Current
```
- Fast enough to keep pace with gameplay
- Slow enough to show morphing
- Good telegraph for players
- Best for: Current game balance

---

### Goal: Fast-Paced Action
```typescript
export const ENEMY_MOVE_SPEED = 0.15;
```
- Quick, snappy movement
- Keeps up with fast laser speed
- Morphing still visible but brief
- Best for: Harder difficulty, faster gameplay

---

## How to Experiment

### 1. Open the Config File

**File:** [src/config/gameConfig.ts](src/config/gameConfig.ts:50)

```typescript
// Enemy Movement
export const ENEMY_MOVE_SPEED = 0.08; // ← Change this number
```

### 2. Try Different Values

Start with these and see what feels best:

```typescript
// Super slow (4+ seconds)
export const ENEMY_MOVE_SPEED = 0.03;

// Slow (2-3 seconds)
export const ENEMY_MOVE_SPEED = 0.05;

// Medium (1-2 seconds) - CSS transition: 1s feel
export const ENEMY_MOVE_SPEED = 0.06;

// Default (current)
export const ENEMY_MOVE_SPEED = 0.08;

// Fast (~0.5 seconds)
export const ENEMY_MOVE_SPEED = 0.15;
```

### 3. Save and See Changes

The game will hot-reload (if using `npm start`) and you'll see the difference immediately!

---

## Advanced: Frame-by-Frame Breakdown

### At 0.08 (Default)

```
Target: Y=300, Start: Y=500 (200px to move)

Frame 0:  Y=500.0  Distance=200  Move=16.0  (200 * 0.08)
Frame 1:  Y=484.0  Distance=184  Move=14.7  (184 * 0.08)
Frame 2:  Y=469.3  Distance=169  Move=13.5
Frame 3:  Y=455.8  Distance=156  Move=12.4
Frame 5:  Y=431.1  Distance=131  Move=10.5
Frame 10: Y=379.7  Distance=80   Move=6.4
Frame 20: Y=316.5  Distance=17   Move=1.3
Frame 30: Y=303.5  Distance=4    Move=0.3
Frame 40: Y=300.3  Distance=0.3  Move=0.02 ← Arrived!
```

Total time: **~40 frames = 0.67 seconds** (at 60 FPS)

---

### At 0.03 (Very Slow)

```
Target: Y=300, Start: Y=500 (200px to move)

Frame 0:   Y=500.0  Distance=200  Move=6.0   (200 * 0.03)
Frame 10:  Y=463.7  Distance=164  Move=4.9
Frame 20:  Y=430.7  Distance=131  Move=3.9
Frame 40:  Y=372.7  Distance=73   Move=2.2
Frame 80:  Y=319.5  Distance=20   Move=0.6
Frame 120: Y=303.7  Distance=4    Move=0.1
Frame 150: Y=300.5  Distance=0.5  Move=0.01 ← Arrived!
```

Total time: **~150 frames = 2.5 seconds** (at 60 FPS)

---

## Summary

**To make the enemy move slower (like `transition: 1s`):**

1. Open [src/config/gameConfig.ts](src/config/gameConfig.ts:50)
2. Change this line:
   ```typescript
   export const ENEMY_MOVE_SPEED = 0.06; // ← Try 0.06 for ~1 second feel
   ```
3. Save the file
4. Watch the smoother, slower animation!

**Lower values = Slower, more visible morphing ✨**
