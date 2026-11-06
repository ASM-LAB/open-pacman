# Agent notes

- Dependency-free vanilla HTML/CSS/JS; there is no package manifest, build, lint, or test command. Run it by opening `src/index.html` in a browser; no server is required.
- Scripts are classic (non-module) and must load in the order used by `src/index.html`: `maze.js` → `game.js` → `render.js` → `main.js`. They share globals, and only some are explicitly attached to `window`; preserve the order and wiring when adding files.
- `src/js/maze.js` owns the 28×31 maze and tile encoding (`0` empty, `1` wall, `2` dot, `3` ghost-house door, `4` power pellet). Pac-Man treats `3` as a wall; ghosts may cross it. `createGame()` copies `MAZE` into `game.grid`, so mutate `game.grid` for per-game state and never `MAZE`.
- Movement is in cell units per frame, and turns are only applied when coordinates are aligned. Keep speeds such that they divide 1 evenly (currently `0.125` for Pac-Man, `0.1` for ghosts), or actors can overshoot cells and miss turns. The tunnel wraps only on `TUNNEL_ROW`.
- The canvas is 560×620 (`28×31` cells at `TILE = 20` in `render.js`); keep these dimensions consistent when changing the maze or renderer.
