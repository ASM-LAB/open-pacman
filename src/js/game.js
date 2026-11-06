// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame
const POWER_DURATION = 6000;
const POWER_SCORE = 50;

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let pellets = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 || v === 4 ) pellets++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    pelletsRemaining: pellets,
    powerUntil: null,
    powerActive: false,
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g, i ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
      releaseAt: i * 2000,
      released: false,
      exited: false,
      exitX: g.x <= 13 ? 13 : 14,
    } ) ),
    releaseStartTime: null,
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado solo por pared (1)
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && actor === 'pacman' ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function movePacman( game, now ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot o pastilla de poder.
    const tile = grid[ p.y ][ p.x ];
    if ( tile === 2 || tile === 4 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += tile === 4 ? POWER_SCORE : 10;
      game.pelletsRemaining--;
      if ( tile === 4 ) {
        game.powerUntil = now + POWER_DURATION;
        game.powerActive = true;
      }
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

function pointAhead( actor, steps, width ) {
  const direction = DIRS[ actor.dir ];
  let x = Math.round( actor.x );
  let y = Math.round( actor.y );
  if ( !direction ) return { x, y };

  for ( let i = 0; i < steps; i++ ) {
    x += direction.x;
    y += direction.y;
    if ( y === TUNNEL_ROW && x < 0 ) x += width;
    else if ( y === TUNNEL_ROW && x >= width ) x -= width;
  }
  return { x, y };
}

function ghostTarget( game, g ) {
  const p = game.pacman;
  const pacmanCell = { x: Math.round( p.x ), y: Math.round( p.y ) };

  if ( g.kind === 'ambusher' ) return pointAhead( p, 4, game.grid[ 0 ].length );
  if ( g.kind === 'strategist' ) {
    const ahead = pointAhead( p, 2, game.grid[ 0 ].length );
    const hunter = game.ghosts.find( ( ghost ) => ghost.kind === 'hunter' ) || g;
    return {
      x: 2 * ahead.x - Math.round( hunter.x ),
      y: 2 * ahead.y - Math.round( hunter.y ),
    };
  }
  if ( g.kind === 'territorial' ) {
    const distance = Math.abs( g.x - pacmanCell.x ) + Math.abs( g.y - pacmanCell.y );
    return distance >= 8 ? pacmanCell : { x: 1, y: 29 };
  }
  return pacmanCell;
}

function manhattanDistance( x, y, target ) {
  return Math.abs( x - target.x ) + Math.abs( y - target.y );
}

function decideGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;
  const legal = Object.keys( DIRS ).filter(
    ( dir ) => canMove( grid, g.x, g.y, dir, 'ghost' )
  );
  const forwardChoices = legal.filter( ( dir ) => dir !== OPPOSITE[ g.dir ] );
  // Solo se permite retroceder cuando no hay otra salida legal.
  const choices = forwardChoices.length ? forwardChoices : legal;
  if ( !choices.length ) return;

  const target = ghostTarget( game, g );
  let best = choices[ 0 ];
  let bestDist = Infinity;
  for ( const dir of choices ) {
    const d = DIRS[ dir ];
    let nx = g.x + d.x;
    const ny = g.y + d.y;
    if ( ny === TUNNEL_ROW && nx < 0 ) nx += width;
    else if ( ny === TUNNEL_ROW && nx >= width ) nx -= width;
    const distance = manhattanDistance( nx, ny, target );
    if ( distance < bestDist ) {
      bestDist = distance;
      best = dir;
    }
  }
  // Object.keys(DIRS) fija el desempate en el orden left, right, up, down.
  g.dir = best;
}

function moveGhost( game, g, now ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( !g.released ) {
    if ( now - game.releaseStartTime < g.releaseAt ) return;
    g.released = true;
  }

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    if ( !g.exited ) {
      if ( g.x === g.exitX && g.y === 11 ) {
        g.exited = true;
        return;
      } else {
        g.dir = g.x === g.exitX ? 'up' : g.x < g.exitX ? 'right' : 'left';
        if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
        const d = DIRS[ g.dir ];
        g.x += d.x * g.speed;
        g.y += d.y * g.speed;
        wrapTunnel( g, width );
        return;
      }
    }
    decideGhost( game, g );
    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

function resetPositions( game, now ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.releaseStartTime = now;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOST_STARTS[ i ].x;
    g.y = GHOST_STARTS[ i ].y;
    g.dir = 'up';
    g.releaseAt = i * 2000;
    g.released = false;
    g.exited = false;
    g.exitX = g.x <= 13 ? 13 : 14;
  } );
}

function returnGhostHome( game, ghost ) {
  const start = GHOST_STARTS.find( ( candidate ) => candidate.kind === ghost.kind );
  ghost.x = start.x;
  ghost.y = start.y;
  ghost.dir = 'up';
  ghost.released = false;
  ghost.exited = false;
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game, now = performance.now() ) {
  if ( game.releaseStartTime === null ) game.releaseStartTime = now;
  game.powerActive = game.powerUntil !== null && now < game.powerUntil;
  movePacman( game, now );
  game.ghosts.forEach( ( g ) => moveGhost( game, g, now ) );

  for ( const g of game.ghosts ) {
    if ( collides( game.pacman, g ) ) {
      if ( game.powerActive ) {
        returnGhostHome( game, g );
        continue;
      }
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game, now );
      break;
    }
  }

  if ( game.pelletsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
