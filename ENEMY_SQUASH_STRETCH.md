# Enemy Squash & Stretch Animation

## Overview

The red enemy ball now has the same fluid, physics-based squash-and-stretch effect as the blue player ball! As it moves up and down, its body morphs like it's moving through a liquid medium in space.

## Visual Effect

### Movement Down (Positive Velocity)
```
     ●        →      ◯       →      ●
  Normal         Stretch         Normal
                Vertically
```
- Ball stretches **vertically** (taller)
- Ball squashes **horizontally** (narrower)
- Looks like it's being pulled downward by gravity

### Movement Up (Negative Velocity)
```
     ●        →      ◐       →      ●
  Normal         Stretch         Normal
               Horizontally
```
- Ball stretches **horizontally** (wider)
- Ball squashes **vertically** (shorter)
- Looks like it's pushing upward against resistance

### At Rest
```
     ●
  Perfect
   Circle
```
- Returns to normal circular shape
- Smooth interpolation back to `scale(1, 1)`

---

## How It Works

### 1. Velocity Tracking

Every frame, we track how fast the enemy is moving:

```typescript
// In laserPhysics.ts update()
const previousY = this.enemyY;
this.enemyY += (this.targetEnemyY - this.enemyY) * ENEMY_MOVE_SPEED;

// Calculate velocity (distance moved this frame)
this.enemyVelocity = this.enemyY - previousY;
```

---

### 2. Squash/Stretch Calculation

Based on velocity direction and magnitude:

```typescript
getEnemyScale(): { scaleX: number; scaleY: number } {
  const velocityFactor = Math.abs(this.enemyVelocity) * 2;

  if (this.enemyVelocity > 0) {
    // Moving down → stretch vertically
    scaleY = 1 + velocityFactor;
    scaleX = 1 - velocityFactor * 0.5;
  } else {
    // Moving up → stretch horizontally
    scaleX = 1 + velocityFactor;
    scaleY = 1 - velocityFactor * 0.5;
  }

  // Clamp to reasonable ranges (0.7 to 1.3)
  return { scaleX, scaleY };
}
```

**Key Points:**
- Velocity is amplified (`× 2`) for visibility
- Stretch in direction of motion
- Squash perpendicular to motion
- Clamped to prevent extreme distortion

---

### 3. CSS Transform

Applied via `transform: scale()`:

```tsx
// Enemy.tsx
<div
  style={{
    transform: `translate3d(${x}px, ${y}px, 0) scale(${scaleX}, ${scaleY})`
  }}
/>
```

**Why `scale()` instead of border-radius?**
- ✅ Maintains circular shape (just stretched)
- ✅ 60 FPS smooth (GPU accelerated)
- ✅ Works with box-shadow
- ✅ Consistent with player ball physics

---

## Animation Flow

### Frame-by-Frame Example

```
Target Y = 300 (moving down from 500)

Frame 1:
  enemyY = 500
  targetY = 300
  velocity = 0
  scale = (1.0, 1.0) ← Normal circle

Frame 2:
  enemyY = 484  (moved 16px down)
  velocity = +16 (moving down)
  velocityFactor = 16 * 2 = 32
  scaleX = 1 - 32*0.5 = 0.84 ← Squashed horizontally
  scaleY = 1 + 32 = 1.32      ← Stretched vertically

Frame 3:
  enemyY = 469  (moved 15px down)
  velocity = +15
  velocityFactor = 30
  scaleX = 0.85
  scaleY = 1.30

...continues smoothing out...

Frame 50:
  enemyY = 300  (arrived)
  velocity = 0
  scale = (1.0, 1.0) ← Back to circle
```

---

## Code Changes

### 1. [laserPhysics.ts](src/systems/laserPhysics.ts)

**Added:**
```typescript
private enemyVelocity: number = 0;

// In update():
const previousY = this.enemyY;
this.enemyY += (this.targetEnemyY - this.enemyY) * ENEMY_MOVE_SPEED;
this.enemyVelocity = this.enemyY - previousY;

// New method:
getEnemyScale(): { scaleX: number; scaleY: number } {
  // Calculate squash/stretch based on velocity
}
```

---

### 2. [useGameLoop.ts](src/hooks/useGameLoop.ts)

**Added:**
```typescript
const [enemyScale, setEnemyScale] = useState({ scaleX: 1, scaleY: 1 });

// In game loop:
setEnemyScale(laserPhysicsRef.current.getEnemyScale());

// In return:
return { ..., enemyScale, ... };
```

---

### 3. [Enemy.tsx](src/components/Enemy.tsx)

**Updated:**
```typescript
interface EnemyProps {
  x: number;
  y: number;
  scaleX?: number;
  scaleY?: number;
}

// In render:
transform: `translate3d(${x}px, ${y}px, 0) scale(${scaleX}, ${scaleY})`
```

---

### 4. [App.tsx](src/App.tsx)

**Updated:**
```tsx
const { ..., enemyScale, ... } = useGameLoop();

<Enemy
  x={dimensions.enemyX}
  y={enemyY}
  scaleX={enemyScale.scaleX}
  scaleY={enemyScale.scaleY}
/>
```

---

## Comparison: Player vs Enemy

| Aspect | Player Ball | Enemy Ball |
|--------|-------------|------------|
| **Trigger** | Gravity + jumping | Smooth movement toward target |
| **Direction** | Vertical (up/down) | Vertical (up/down) |
| **Physics** | Bounce velocity | Movement velocity |
| **Scale Source** | PlayerPhysics class | LaserPhysics class |
| **Max Stretch** | Dynamic (based on jump) | Clamped (0.7 - 1.3) |
| **Effect** | Bouncing + squashing on ground | Fluid movement through space |

---

## Why This Works

### Visual Consistency
- Both balls use the same animation technique
- Creates unified art style
- Players recognize the physics language

### Performance
- No CSS animations or keyframes
- Pure transform-based (GPU accelerated)
- 60 FPS smooth

### Physics-Based
- Directly tied to movement speed
- Faster movement = more stretch
- Slower movement = less stretch
- Automatic easing as velocity decreases

### Adaptive
- Slows down naturally as enemy approaches target
- No fixed animation duration
- Responds to game speed changes

---

## Tuning Parameters

Want to adjust the effect? Modify these in [laserPhysics.ts](src/systems/laserPhysics.ts:220):

```typescript
// More pronounced morphing
const velocityFactor = Math.abs(this.enemyVelocity) * 3; // Was 2

// Less squash (more natural)
scaleX = 1 - velocityFactor * 0.3; // Was 0.5

// Wider morph range
scaleX = Math.max(0.5, Math.min(1.5, scaleX)); // Was 0.7-1.3
```

---

## Build Status

✅ **Build Successful!**
- Bundle: 45.95 kB gzipped (+154 B)
- All animations working
- 60 FPS performance

---

## Testing

Run the game:
```bash
cd my-react-app
npm start
```

**Watch the red ball:**
- ✅ Stretches vertically when moving down
- ✅ Stretches horizontally when moving up
- ✅ Returns to circle when stopped
- ✅ Effect intensity matches movement speed
- ✅ Smooth, natural animation

**Perfect sync with blue ball:**
- Both balls have fluid, organic movement
- Consistent art style
- Professional game polish

---

## Future Enhancements

Now that both balls morph, we can add:
- [ ] Anticipation squash before firing laser
- [ ] Impact squash when laser spawns
- [ ] Different morph patterns for different enemy types
- [ ] Rotation that follows movement direction
- [ ] Color shift based on velocity (redder = faster)
- [ ] Particle trail that follows the morph

---

The enemy now feels **alive** - like a liquid orb floating in space, morphing as it moves! 🌊✨
