# Plan: Progression System

## Goal
Unlockable boards, spots, and vehicles that give players goals and variety.

## Steps

### 1. Currency / Points
- Score from rides (time in pocket, maneuvers)
- Used to unlock items
- Persisted to localStorage

### 2. Boards
Each board has stats affecting gameplay:

```typescript
interface Board {
    id: string;
    name: string;
    cost: number;
    stats: {
        speed: number;      // max speed multiplier
        stability: number;  // wipeout threshold
        turnRate: number;   // how fast it carves
    };
}

const BOARDS = [
    { id: 'foamie', name: 'Foam Learner', cost: 0, stats: { speed: 0.8, stability: 1.3, turnRate: 0.7 } },
    { id: 'fish', name: 'Retro Fish', cost: 500, stats: { speed: 1.0, stability: 1.0, turnRate: 1.2 } },
    { id: 'shortboard', name: 'Performance', cost: 1500, stats: { speed: 1.2, stability: 0.8, turnRate: 1.0 } },
    { id: 'gun', name: 'Big Wave Gun', cost: 5000, stats: { speed: 1.4, stability: 0.6, turnRate: 0.8 } },
];
```

### 3. Spots
Different locations with wave characteristics:

```typescript
interface Spot {
    id: string;
    name: string;
    unlockCost: number;
    wave: {
        size: number;       // wave height
        speed: number;      // how fast wave moves
        pocketWidth: number; // difficulty
        length: number;     // ride duration
    };
    background: string;     // visual theme
}

const SPOTS = [
    { id: 'malibu', name: 'Malibu', unlockCost: 0, wave: { size: 1, speed: 1, pocketWidth: 1.5, length: 15 } },
    { id: 'huntington', name: 'Huntington', unlockCost: 1000, wave: { size: 1.2, speed: 1.2, pocketWidth: 1.2, length: 12 } },
    { id: 'pipeline', name: 'Pipeline', unlockCost: 5000, wave: { size: 2, speed: 1.5, pocketWidth: 0.8, length: 8 } },
];
```

### 4. Vehicles
Cosmetic + spot unlock requirements:

```typescript
interface Vehicle {
    id: string;
    name: string;
    cost: number;
    boardCapacity: number;  // how many boards you can bring
    unlocksSpots: string[]; // some spots require certain vehicles
}

const VEHICLES = [
    { id: 'bike', name: 'Beach Cruiser', cost: 0, boardCapacity: 1, unlocksSpots: ['malibu'] },
    { id: 'vwvan', name: 'VW Bus', cost: 2000, boardCapacity: 5, unlocksSpots: ['huntington', 'trestles'] },
    { id: 'truck', name: '4x4 Truck', cost: 8000, boardCapacity: 8, unlocksSpots: ['pipeline', 'jaws'] },
];
```

### 5. Save/Load
```typescript
interface SaveData {
    points: number;
    unlockedBoards: string[];
    unlockedSpots: string[];
    unlockedVehicles: string[];
    selectedBoard: string;
    selectedVehicle: string;
    highScores: Record<string, number>;
}
```

### 6. UI Screens
- Main menu: Play, Shop, Garage
- Shop: Browse/buy boards, vehicles
- Spot select: Choose wave (with vehicle constraint)
- Post-ride: Score, unlocks earned

## Success Criteria
- At least 3 boards with distinct feel
- At least 3 spots with different difficulty
- Progress persists between sessions
- Clear goals for players to work toward

## Files to Create
- `src/progression/boards.ts`
- `src/progression/spots.ts`
- `src/progression/vehicles.ts`
- `src/progression/save.ts`
- `src/ui/shop.ts`
