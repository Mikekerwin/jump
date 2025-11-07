# Enemy Movement Refactor - Mental Model

## BEFORE: Current Architecture (The Problem)

```
┌─────────────────────────────────────────────────────┐
│                   useGameLoop                       │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │          LaserPhysics                        │  │
│  │  ┌────────────────────────────────────────┐ │  │
│  │  │  Enemy Position State                  │ │  │
│  │  │  - enemyY                              │ │  │
│  │  │  - targetEnemyY                        │ │  │
│  │  │  - pendingTargetY                      │ │  │
│  │  │  - floatPhase                          │ │  │
│  │  │  - transitionVelocity                  │ │  │
│  │  └────────────────────────────────────────┘ │  │
│  │                                              │  │
│  │  ┌────────────────────────────────────────┐ │  │
│  │  │  Laser State                           │ │  │
│  │  │  - lasers[]                            │ │  │
│  │  │  - numLasers                           │ │  │
│  │  │  - lastLaserFireTime                   │ │  │
│  │  └────────────────────────────────────────┘ │  │
│  │                                              │  │
│  │  update() {                                  │  │
│  │    // Spawn lasers at enemyY position       │  │
│  │    // Generate next target                  │  │
│  │    // Move enemyY to target                 │  │
│  │    // Apply floating oscillation            │  │
│  │  }                                           │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │          EnemyPhysics                        │  │
│  │  (Only used during intro & bounce mode)     │  │
│  │                                              │  │
│  │  - position.y                                │  │
│  │  - velocity                                  │  │
│  │  - isPhysicsEnabled                          │  │
│  │                                              │  │
│  │  update() {                                  │  │
│  │    // Apply gravity                          │  │
│  │    // Handle bouncing                        │  │
│  │  }                                           │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  CONFLICT: Both want to control enemy Y position!  │
└─────────────────────────────────────────────────────┘
```

### The Problem
- **LaserPhysics owns enemy position** during hover mode
- **EnemyPhysics owns enemy position** during physics mode
- When switching modes, they fight for control
- Line 291 in laserPhysics.ts checks `if (isEnemyInHoverMode)` but it's too late - LaserPhysics already owns the state

---

## AFTER: New Architecture (The Solution)

```
┌──────────────────────────────────────────────────────────┐
│                     useGameLoop                          │
│                  (System Orchestrator)                   │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │              EnemyMovement (NEW!)                  │ │
│  │        (Hover Mode Position Control)               │ │
│  │                                                    │ │
│  │  - enemyY                                          │ │
│  │  - targetEnemyY                                    │ │
│  │  - pendingTargetY                                  │ │
│  │  - floatPhase                                      │ │
│  │  - transitionVelocity                              │ │
│  │  - scaleX, scaleY                                  │ │
│  │                                                    │ │
│  │  getCurrentY() → number                            │ │
│  │  getScale() → {scaleX, scaleY}                     │ │
│  │  setTarget(y) → void                               │ │
│  │  startTransition(velocity, y) → void               │ │
│  │  update() → void {                                 │ │
│  │    // Move to target with ease-in                  │ │
│  │    // Apply floating oscillation                   │ │
│  │    // Apply settle oscillation                     │ │
│  │    // Update squash/stretch                        │ │
│  │  }                                                 │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │              EnemyPhysics                          │ │
│  │       (Physics Mode Position Control)              │ │
│  │                                                    │ │
│  │  - position.y                                      │ │
│  │  - velocity                                        │ │
│  │  - isPhysicsEnabled                                │ │
│  │                                                    │ │
│  │  getY() → number                                   │ │
│  │  isHoverMode() → boolean                           │ │
│  │  update() → PlayerState {                          │ │
│  │    // Apply gravity                                │ │
│  │    // Handle bouncing                              │ │
│  │  }                                                 │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │               LaserPhysics                         │ │
│  │          (ONLY Laser Management)                   │ │
│  │                                                    │ │
│  │  - lasers[]                                        │ │
│  │  - numLasers                                       │ │
│  │  - lastLaserFireTime                               │ │
│  │                                                    │ │
│  │  update(enemyY, ...) → {                           │ │
│  │    scoreChange,                                    │ │
│  │    wasHit,                                         │ │
│  │    laserFired,                                     │ │
│  │    targetY  // NEW! Suggests where enemy should go │ │
│  │  } {                                               │ │
│  │    // Spawn lasers at enemyY (passed in)           │ │
│  │    // Generate random target                       │ │
│  │    // RETURN target (don't move enemy yourself)    │ │
│  │    // Move lasers                                  │ │
│  │    // Check collisions                             │ │
│  │  }                                                 │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  Game Loop Logic:                                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 1. Get Enemy Y from correct source:              │  │
│  │    if (hover mode):                               │  │
│  │      enemyY = enemyMovement.getCurrentY()        │  │
│  │    else:                                          │  │
│  │      enemyY = enemyPhysics.getY()                │  │
│  │                                                   │  │
│  │ 2. Update LaserPhysics with enemy Y:             │  │
│  │    result = laserPhysics.update(enemyY, ...)     │  │
│  │                                                   │  │
│  │ 3. If laser fired, tell movement system:         │  │
│  │    if (result.targetY):                          │  │
│  │      enemyMovement.setTarget(result.targetY)     │  │
│  │                                                   │  │
│  │ 4. Update movement (if in hover):                │  │
│  │    if (hover mode):                               │  │
│  │      enemyMovement.update()                      │  │
│  │      setEnemyY(enemyMovement.getCurrentY())      │  │
│  │                                                   │  │
│  │ 5. Update physics (if in physics mode):          │  │
│  │    if (!hover mode):                              │  │
│  │      enemyState = enemyPhysics.update()          │  │
│  │      setEnemyY(enemyState.position.y)            │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## Key Behavioral Changes

### What Changes (Architecture Only)
- **Separation of concerns**: Each class has one job
- **Data flow direction**: Enemy Y is passed TO LaserPhysics, not owned BY it
- **Event-based coupling**: LaserPhysics suggests target, doesn't force movement
- **Clear mode switching**: useGameLoop decides which system controls position

### What DOESN'T Change (Exact Behavior Preserved)
- ✅ Laser spawn timing formulas (300ms for 1, distance-based for multiple)
- ✅ Enemy movement speed (ease-in from 1.5% to 6.5%)
- ✅ Floating oscillation (3px amplitude, 0.04 frequency)
- ✅ Settle bounce (2 oscillations, 0.95 decay per frame)
- ✅ Physics → Hover transition (0.92 damping)
- ✅ Laser mechanics (wide lasers, player lock, chaos, collisions)
- ✅ Visual appearance (enemy should move identically)

---

## Mode Transitions

### 1. Intro Animation → Hover Mode
**BEFORE:**
```typescript
// enemyPhysics finishes 3rd bounce
if (enemyPhysics.isReadyForHover()) {
  velocity = enemyPhysics.enableHoverMode();
  currentY = enemyPhysics.getY();
  laserPhysics.startHoverWithVelocity(velocity, currentY);
}
```

**AFTER:**
```typescript
// enemyPhysics finishes 3rd bounce
if (enemyPhysics.isReadyForHover()) {
  velocity = enemyPhysics.enableHoverMode();
  currentY = enemyPhysics.getY();
  enemyMovement.startTransition(velocity, currentY);  // NEW class!
}
```

### 2. Hover Mode → Bounce Mode (4th Out)
**BEFORE (BROKEN):**
```typescript
// 4th out reached
enemyPhysics.enablePhysicsModeWithState(currentY, -1);
// LaserPhysics fights for control - doesn't work!
```

**AFTER (FIXED):**
```typescript
// 4th out reached
currentY = enemyMovement.getCurrentY();
enemyPhysics.enablePhysicsModeWithState(currentY, -1);
// EnemyMovement stops updating, EnemyPhysics takes over - clean!
```

### 3. Bounce Mode → Hover Mode (After 5 Lasers)
**BEFORE (BROKEN):**
```typescript
// 5 lasers fired, at jump peak
velocity = enemyPhysics.enableHoverMode();
currentY = enemyPhysics.getY();
laserPhysics.startHoverWithVelocity(velocity, currentY);
// But LaserPhysics already had its own position - conflict!
```

**AFTER (FIXED):**
```typescript
// 5 lasers fired, at jump peak
velocity = enemyPhysics.enableHoverMode();
currentY = enemyPhysics.getY();
enemyMovement.startTransition(velocity, currentY);
// Clean handoff, no conflict!
```

---

## Common Issues to Watch For

### Issue 1: Position Sync on Mode Switch
**Problem:** Enemy might jump/snap when switching modes
**Cause:** Position not properly transferred between systems
**Fix:** Ensure exact Y value is passed when calling `enablePhysicsModeWithState()` or `startTransition()`

### Issue 2: Lasers Spawning from Wrong Position
**Problem:** Lasers spawn from stale position
**Cause:** Wrong enemy Y being passed to `laserPhysics.update()`
**Fix:** Verify `enemyY` comes from correct source (enemyMovement vs enemyPhysics)

### Issue 3: Enemy Not Moving in Hover Mode
**Problem:** Enemy frozen in place
**Cause:** `enemyMovement.update()` not being called, or `setTarget()` not being called when laser fires
**Fix:** Check that `result.targetY` is being passed to `setTarget()`

### Issue 4: Enemy Still Hovering in Bounce Mode
**Problem:** Enemy doesn't fall on 4th out
**Cause:** `enemyMovement.update()` still being called in physics mode
**Fix:** Ensure `if (hover mode)` check wraps `enemyMovement.update()`

### Issue 5: Timing Changed
**Problem:** Lasers spawn faster/slower than before
**Cause:** Accidentally modified spawn timing formula
**Fix:** Compare formulas line-by-line with original code

---

## Debug Commands (For Console)

When testing, you can add these to verify behavior:

```javascript
// In useGameLoop.ts, add logging:
console.log('[MODE]', {
  hover: enemyPhysicsRef.current?.isHoverMode(),
  enemyY: enemyY,
  source: enemyPhysicsRef.current?.isHoverMode() ? 'movement' : 'physics'
});

// After laser fires:
if (laserUpdate.laserFired && laserUpdate.targetY) {
  console.log('[LASER FIRED]', {
    currentY: enemyY,
    targetY: laserUpdate.targetY,
    distance: Math.abs(laserUpdate.targetY - enemyY)
  });
}

// During mode transitions:
console.log('[TRANSITION]', {
  from: 'hover',
  to: 'physics',
  startY: currentY,
  velocity: initialVelocity
});
```

---

## Success Criteria

### The refactor is successful if:
1. ✅ Intro animation looks identical (smooth transition at end)
2. ✅ Hover mode movement looks identical (speed, oscillation, settle bounce)
3. ✅ Laser spawn timing unchanged (measure with video)
4. ✅ Bounce mode works on 4th out (enemy falls and bounces!)
5. ✅ Returns to hover after 5 lasers (smooth transition at jump peak)
6. ✅ 10th out behavior works (falls, stays down, no shooting)
7. ✅ All special mechanics work (wide lasers, player lock, growth)
8. ✅ No visual glitches (snapping, jerking, discontinuities)

### Quick Visual Test Checklist:
- [ ] Enemy bobs up and down continuously (3px)
- [ ] Enemy does 2 small bounces after reaching new position
- [ ] Lasers shoot from center of enemy ball
- [ ] Enemy smoothly moves between positions (not instant)
- [ ] Intro animation ends with smooth deceleration
- [ ] 4th out: enemy falls with gravity
- [ ] After 5 lasers in bounce mode: enemy returns to hover at jump peak

---

## Rollback Plan

If the refactor breaks things badly:

1. **Git revert** to commit before refactor
2. **Alternative approach**: Instead of extracting EnemyMovement, try adding a `pauseMovement()` flag to LaserPhysics that stops it from updating position
3. **Hybrid approach**: Keep LaserPhysics as-is, but add override mechanism for EnemyPhysics to force position

---

## File Structure Summary

### NEW FILE:
- `src/systems/enemyMovement.ts` (~250 lines)
  - Extracted from laserPhysics.ts lines 36-52, 92-97, 290-342, 347-369, 383-411

### MODIFIED FILES:
- `src/systems/laserPhysics.ts` (~100 lines removed, ~20 lines modified)
  - Remove enemy position state
  - Change update() signature to accept enemyY parameter
  - Return targetY instead of setting pendingTargetY

- `src/hooks/useGameLoop.ts` (~30 lines modified)
  - Import EnemyMovement
  - Initialize enemyMovementRef
  - Orchestrate 3 systems in game loop
  - Handle mode transitions

---

## Ready to Proceed!

With this mental model documented, we can now execute the refactor. If anything breaks, we have:
- ✅ Clear before/after architecture diagrams
- ✅ List of exact behaviors that must be preserved
- ✅ Common issues and how to fix them
- ✅ Debug commands to diagnose problems
- ✅ Success criteria checklist
- ✅ Rollback plan if needed

Let's do it! 🚀
