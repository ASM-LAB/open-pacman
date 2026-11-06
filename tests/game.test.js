const assert = require( 'node:assert/strict' );
const fs = require( 'node:fs' );
const path = require( 'node:path' );
const test = require( 'node:test' );
const vm = require( 'node:vm' );

const ROOT = path.resolve( __dirname, '..' );

function loadGame( includeRenderer = false ) {
  const context = { window: {}, performance: { now: () => 0 } };
  vm.createContext( context );
  const scripts = [ 'src/js/maze.js', 'src/js/game.js' ];
  if ( includeRenderer ) scripts.push( 'src/js/render.js' );
  for ( const script of scripts ) {
    vm.runInContext(
      fs.readFileSync( path.join( ROOT, script ), 'utf8' ),
      context,
      { filename: script }
    );
  }
  return context;
}

function openGrid() {
  return Array.from( { length: 31 }, ( _, y ) =>
    Array.from( { length: 28 }, ( _, x ) =>
      x === 0 || x === 27 || y === 0 || y === 30 ? 1 : 0
    )
  );
}

function chooseDirection( context, setup ) {
  const game = context.window.createGame();
  game.grid = openGrid();
  for ( const ghost of game.ghosts ) {
    ghost.x = 24;
    ghost.y = 24;
    ghost.dir = 'up';
  }

  const ghost = game.ghosts.find( ( candidate ) => candidate.kind === setup.kind );
  Object.assign( ghost, { x: setup.x, y: setup.y, dir: setup.dir } );
  const hunter = game.ghosts.find( ( candidate ) => candidate.kind === 'hunter' );
  if ( setup.kind !== 'hunter' ) {
    hunter.x = setup.hunterX ?? 20;
    hunter.y = setup.hunterY ?? 20;
  }
  Object.assign( game.pacman, {
    x: setup.pacmanX,
    y: setup.pacmanY,
    dir: setup.pacmanDir,
  } );

  context.testGame = game;
  context.testGhost = ghost;
  vm.runInContext( 'decideGhost(testGame, testGhost)', context );
  return ghost.dir;
}

function canMove( context, grid, x, y, direction, actor ) {
  Object.assign( context, {
    testGrid: grid,
    testX: x,
    testY: y,
    testDirection: direction,
    testActor: actor,
  } );
  return vm.runInContext(
    'canMove(testGrid, testX, testY, testDirection, testActor)',
    context
  );
}

test( 'una partida incorpora cuatro fantasmas distintos sin mutar MAZE', () => {
  const context = loadGame();
  const originalMaze = JSON.stringify( context.window.MAZE );
  const game = context.window.createGame();
  const ghosts = Array.from( game.ghosts, ( { x, y, kind } ) => ( { x, y, kind } ) );

  assert.deepEqual( ghosts, [
    { x: 13, y: 14, kind: 'hunter' },
    { x: 14, y: 14, kind: 'ambusher' },
    { x: 12, y: 14, kind: 'strategist' },
    { x: 15, y: 14, kind: 'territorial' },
  ] );
  assert.equal( new Set( ghosts.map( ( ghost ) => ghost.x + ',' + ghost.y ) ).size, 4 );
  assert.ok( game.ghosts.every( ( ghost ) => game.grid[ ghost.y ][ ghost.x ] === 0 ) );
  assert.equal( JSON.stringify( context.window.MAZE ), originalMaze );
} );

test( 'el tablero tiene cuatro pastillas de poder y todas las comidas cuentan para ganar', () => {
  const context = loadGame();
  const game = context.window.createGame();
  const corners = [ [ 1, 1 ], [ 26, 1 ], [ 1, 29 ], [ 26, 29 ] ];
  const powerPellets = [];
  for ( let y = 0; y < game.grid.length; y++ ) {
    for ( let x = 0; x < game.grid[ y ].length; x++ ) {
      if ( game.grid[ y ][ x ] === 4 ) powerPellets.push( [ x, y ] );
    }
  }

  assert.deepEqual( powerPellets, corners );
  assert.equal( game.pelletsRemaining, game.grid.flat().filter( ( tile ) => tile === 2 || tile === 4 ).length );
} );

test( 'comer una pastilla suma 50, activa poder seis segundos y al expirar vuelve a ser peligrosa', () => {
  const context = loadGame();
  const game = context.window.createGame();
  Object.assign( game.pacman, { x: 1, y: 1, speed: 0 } );
  game.ghosts.forEach( ( ghost ) => {
    Object.assign( ghost, { x: 20, y: 20, speed: 0, released: true, exited: true } );
  } );
  const remaining = game.pelletsRemaining;

  context.window.update( game, 1000 );
  assert.equal( game.grid[ 1 ][ 1 ], 0 );
  assert.equal( game.score, 50 );
  assert.equal( game.pelletsRemaining, remaining - 1 );
  assert.equal( game.powerUntil, 7000 );
  assert.equal( game.powerActive, true );

  context.window.update( game, 6999 );
  assert.equal( game.powerActive, true );
  context.window.update( game, 7000 );
  assert.equal( game.powerActive, false );
} );

test( 'tocar a un fantasma vulnerable lo devuelve a casa sin perder una vida', () => {
  const context = loadGame();
  const game = context.window.createGame();
  const ghost = game.ghosts[ 0 ];
  Object.assign( game.pacman, { x: 1, y: 1, speed: 0 } );
  game.ghosts.forEach( ( candidate ) => {
    Object.assign( candidate, { x: 20, y: 20, speed: 0, released: true, exited: true } );
  } );
  Object.assign( ghost, { x: 1, y: 1 } );

  context.window.update( game, 1000 );

  assert.equal( game.lives, 3 );
  assert.deepEqual( [ ghost.x, ghost.y ], [ 13, 14 ] );
  assert.equal( ghost.exited, false );
  assert.equal( ghost.released, false );
} );

test( 'el perseguidor elige una salida legal que acerca a Pacman', () => {
  const context = loadGame();
  const direction = chooseDirection( context, {
    kind: 'hunter', x: 5, y: 5, dir: 'up',
    pacmanX: 8, pacmanY: 5, pacmanDir: 'left',
  } );
  assert.equal( direction, 'right' );
} );

test( 'el emboscador apunta cuatro celdas delante de Pacman', () => {
  const context = loadGame();
  const direction = chooseDirection( context, {
    kind: 'ambusher', x: 5, y: 8, dir: 'up',
    pacmanX: 8, pacmanY: 8, pacmanDir: 'left',
  } );
  assert.equal( direction, 'left' );
} );

test( 'el estratega refleja el punto situado dos celdas delante del rojo', () => {
  const context = loadGame();
  const direction = chooseDirection( context, {
    kind: 'strategist', x: 14, y: 12, dir: 'left',
    pacmanX: 10, pacmanY: 10, pacmanDir: 'right',
    hunterX: 9, hunterY: 8,
  } );
  assert.equal( direction, 'left' );
} );

test( 'el territorial usa la esquina por debajo de ocho y persigue desde ocho', () => {
  const context = loadGame();
  const setup = {
    kind: 'territorial', x: 5, y: 5, dir: 'up',
    pacmanY: 5, pacmanDir: 'left',
  };
  assert.equal( chooseDirection( context, { ...setup, pacmanX: 12 } ), 'left' );
  assert.equal( chooseDirection( context, { ...setup, pacmanX: 13 } ), 'right' );
} );

test( 'los empates son deterministas y solo retrocede en un callejón', () => {
  const context = loadGame();
  assert.equal( chooseDirection( context, {
    kind: 'hunter', x: 5, y: 5, dir: 'up',
    pacmanX: 6, pacmanY: 4, pacmanDir: 'left',
  } ), 'right' );
  assert.equal( chooseDirection( context, {
    kind: 'hunter', x: 5, y: 5, dir: 'up',
    pacmanX: 5, pacmanY: 8, pacmanDir: 'left',
  } ), 'left' );

  const game = context.window.createGame();
  game.grid = Array.from( { length: 31 }, () => Array( 28 ).fill( 1 ) );
  game.grid[ 5 ][ 5 ] = 0;
  game.grid[ 6 ][ 5 ] = 0;
  const ghost = game.ghosts[ 0 ];
  Object.assign( ghost, { x: 5, y: 5, dir: 'up' } );
  context.testGame = game;
  context.testGhost = ghost;
  vm.runInContext( 'decideGhost(testGame, testGhost)', context );
  assert.equal( ghost.dir, 'down' );
} );

test( 'las paredes, la puerta de casa y el túnel conservan sus reglas', () => {
  const context = loadGame();
  const grid = context.window.createGame().grid;
  assert.equal( canMove( context, grid, 13, 13, 'up', 'ghost' ), true );
  assert.equal( canMove( context, grid, 13, 13, 'up', 'pacman' ), false );
  assert.equal( canMove( context, grid, 11, 13, 'left', 'ghost' ), false );
  assert.equal( canMove( context, grid, 0, 14, 'left', 'ghost' ), true );
  assert.equal( canMove( context, grid, 27, 14, 'right', 'ghost' ), true );
} );

test( 'los turnos de salida son 0, 2, 4 y 6 segundos desde el inicio', () => {
  const context = loadGame();
  const game = context.window.createGame();
  game.pacman.speed = 0;
  game.releaseStartTime = 1000;
  game.ghosts.forEach( ( ghost ) => { ghost.speed = 0; } );
  game.ghosts[ 1 ].speed = 0.1;

  assert.deepEqual( Array.from( game.ghosts, ( ghost ) => ghost.releaseAt ), [ 0, 2000, 4000, 6000 ] );
  context.window.update( game, 2999 );
  assert.deepEqual( Array.from( game.ghosts, ( ghost ) => ghost.released ), [ true, false, false, false ] );
  assert.equal( game.ghosts[ 1 ].x, 14 );
  assert.equal( game.ghosts[ 1 ].y, 14 );

  context.window.update( game, 3000 );
  assert.equal( game.ghosts[ 1 ].released, true );
  assert.equal( game.ghosts[ 1 ].y, 13.9 );
  context.window.update( game, 5000 );
  assert.equal( game.ghosts[ 2 ].released, true );
  context.window.update( game, 7000 );
  assert.equal( game.ghosts[ 3 ].released, true );
} );

test( 'cada fantasma alcanza una salida y después aplica su personalidad', () => {
  const context = loadGame();
  for ( const kind of [ 'hunter', 'ambusher', 'strategist', 'territorial' ] ) {
    const game = context.window.createGame();
    game.releaseStartTime = 0;
    Object.assign( game.pacman, { x: 1, y: 1, speed: 0 } );
    game.ghosts.forEach( ( ghost ) => {
      ghost.speed = 0;
      ghost.releaseAt = 999999;
    } );
    const ghost = game.ghosts.find( ( candidate ) => candidate.kind === kind );
    ghost.releaseAt = 0;
    ghost.speed = 0.1;

    for ( let frame = 0; frame < 100 && !ghost.exited; frame++ ) {
      context.window.update( game, frame * 16 );
    }
    assert.equal( ghost.exited, true, kind + ' debe alcanzar la salida' );
    assert.ok( ghost.x === 13 || ghost.x === 14 );
    assert.equal( ghost.y, 11 );

    context.window.update( game, 10000 );
    assert.notEqual( ghost.dir, 'up', kind + ' debe tomar decisiones fuera de la casa' );
  }
} );

test( 'perder una vida reinicia posiciones, turnos y reloj de salida', () => {
  const context = loadGame();
  const starts = context.window.GHOST_STARTS;
  const game = context.window.createGame();
  game.releaseStartTime = 0;
  Object.assign( game.pacman, { x: 5, y: 5, speed: 0 } );
  game.ghosts.forEach( ( ghost ) => {
    ghost.releaseAt = 999999;
    ghost.released = false;
    ghost.speed = 0;
  } );
  Object.assign( game.ghosts[ 0 ], { x: 5, y: 5 } );

  context.window.update( game, 9000 );

  assert.equal( game.lives, 2 );
  assert.equal( game.releaseStartTime, 9000 );
  assert.deepEqual( Array.from( game.ghosts, ( ghost ) => ghost.released ), [ false, false, false, false ] );
  assert.deepEqual( Array.from( game.ghosts, ( ghost ) => ghost.releaseAt ), [ 0, 2000, 4000, 6000 ] );
  assert.equal(
    JSON.stringify( Array.from( game.ghosts, ( ghost ) => [ ghost.x, ghost.y ] ) ),
    JSON.stringify( starts.map( ( ghost ) => [ ghost.x, ghost.y ] ) )
  );
} );

test( 'el renderizador usa los cuatro colores y mantiene el canvas de 560 por 620', () => {
  const context = loadGame( true );
  const fills = [];
  const radii = [];
  const ctx = {
    fillStyle: '',
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    arc( _x, _y, radius ) { radii.push( radius ); },
    closePath() {},
    fill() { fills.push( this.fillStyle ); },
    fillRect() {},
    fillText() {},
  };
  context.window.draw( ctx, context.window.createGame(), 0 );

  const colors = [ '#ff0000', '#ffb8ff', '#00ffff', '#ffb852' ];
  assert.deepEqual( fills.filter( ( color ) => colors.includes( color ) ), colors );
  assert.equal( radii.filter( ( radius ) => radius === 6 ).length, 4 );

  fills.length = 0;
  const poweredGame = context.window.createGame();
  poweredGame.powerActive = true;
  context.window.draw( ctx, poweredGame, 0 );
  assert.equal( fills.filter( ( color ) => color === '#2121ff' ).length, 4 );
  const html = fs.readFileSync( path.join( ROOT, 'src/index.html' ), 'utf8' );
  assert.match( html, /width="560" height="620"/ );
} );
