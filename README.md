# Ionwake

**Ride the ion storm.**

A top-down arcade shooter. Break the incoming fleet, chain combos, and grab
multi-shot, shield, and speed. Three lives. Auto-fire is always on.

![Ionwake title card](public/og.jpg)

<p align="center">
  <img src="screenshots/gameplay.png" alt="Wave 1 in progress" width="720" />
</p>

## Play

Open the title screen and hit **Play**. The ship fires on its own — your job is
to stay alive, pick up drops, and ride the combo as waves escalate.

- **Scouts** dart in sine and dive patterns
- **Fighters** seek and return fire
- **Bombers** hold the line every fifth wave and drop loot often
- Enemy HP ticks up every four waves

High scores stay on this device (local storage + IndexedDB). A top-8 run earns
a three-letter tag.

## Controls

| Action | Keyboard | Pointer | Gamepad |
| --- | --- | --- | --- |
| Move | WASD or arrow keys | Drag / mouse follow | Left stick or D-pad |
| Fire | Automatic | Automatic | Automatic |
| Pause | `Esc` or `P` | Pause button | Start |

Sound mute lives on the pause menu. Touch drag lifts the ship above your finger
so you can still see it.

## Scoring

| Event | Points |
| --- | --- |
| Scout | 100 |
| Fighter | 250 |
| Bomber | 600 |
| Pickup | 50 |
| Wave clear | `(wave − 1) × 250` |

Kills in a 0.7s window raise a combo. Each extra kill multiplies the next by
`1 + combo × 0.1`. Extra life at 10,000 points, then every 15,000 after that.

### Power-ups

| Drop | Effect |
| --- | --- |
| **Multi** | 3-way shot, then 5-way |
| **Shield** | Absorb one hit (stacks to 3) |
| **Speed** | Movement boost (stacks to 2) |
| **Life** | Extra ship |

Bombers drop often, fighters sometimes, scouts rarely. A hit without a shield
resets multi and speed.

## Stack

- [React 19](https://react.dev/) + [TanStack Start](https://tanstack.com/start) / Router
- [Vite](https://vite.dev/) + [Tailwind CSS v4](https://tailwindcss.com/)
- Canvas 2D game loop in `src/game/` (fixed 60 Hz step, Web Audio SFX)
- No accounts or server save — scores persist in the browser

## Layout

```
src/
  game/                 Canvas engine, HUD overlays, input, audio, save
    GameApp.tsx         Title / pause / game-over / scores chrome
    engine.ts           Waves, combat, FX
    input.ts            Keyboard, pointer, standard gamepad
    save.ts             High scores + mute
    sprites.ts          Atlas loader
  routes/               `/` mounts the game
  styles.css            Dark arcade tokens (Oxanium + Figtree)
public/sprites/         Runtime ship, enemy, bolt, FX, and pickup art
assets/sprites/         Source sheets + magenta chroma pipeline
screenshots/            Captured title, play, pause, and score screens
```

## Development

Requires **Node 22** and npm.

```bash
npm install
npm run dev
```

The dev server listens on `0.0.0.0:8080`.

```bash
npm run typecheck
npm run build
npm run preview          # production build, loopback :8081
npm test
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite + TanStack Start, HMR |
| `npm run build` | Production bundle |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Node tests under `scripts/` and `src/lib/` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Sprites

Runtime PNGs live in `public/sprites/`. Source sheets and pipeline metadata are
under `assets/sprites/`. `assets/sprites/chroma.py` keys out magenta backgrounds
and crops generated sheets into square sprites.

```
public/sprites/
  player.png  scout.png  fighter.png  bomber.png
  player-bolt.png  enemy-bolt.png
  explode-1.png … explode-4.png
  muzzle-1.png … muzzle-4.png
  power-multi.png  power-shield.png  power-speed.png  power-life.png
```
