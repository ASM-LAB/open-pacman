# SPEC 01 — Cuatro fantasmas

> **Estado:** Aprobado  
> **Depende de:** Ninguna  
> **Fecha:** 2026-11-05  
> **Objetivo:** Incorporar cuatro fantasmas con comportamientos diferenciados inspirados en Pac-Man, incluido uno que persigue agresivamente a Pacman.

## Alcance

**Incluye:**

- Cuatro fantasmas con personalidades, posiciones iniciales y colores diferenciados.
- Salida escalonada de la casa de fantasmas al iniciar la partida y después de perder una vida.
- Mantener las reglas existentes de colisión, vidas y puntuación.

**Fuera de alcance (para futuras especificaciones):**

- Pastillas de poder y fantasmas vulnerables.
- Réplica exacta de las peculiaridades de la IA arcade original.
- Cambios a la velocidad de movimiento, las vidas o la puntuación.

## Comportamientos

- **Rojo — perseguidor:** apunta a la posición actual de Pacman en cada cruce. Entre las direcciones legales, elige la que más reduzca la distancia Manhattan. No retrocede salvo en un callejón. Es el perseguidor agresivo; no se aumenta su velocidad.
- **Rosa — emboscador:** apunta a la celda situada cuatro pasos delante de Pacman, según su dirección actual.
- **Cian — estratega:** calcula una posición dos pasos delante de Pacman y apunta al reflejo de esa posición respecto a la posición del fantasma rojo: `objetivo = 2 * puntoDelante - posicionRojo`.
- **Naranja — territorial:** persigue a Pacman cuando la distancia Manhattan entre ambos es de al menos ocho celdas. Si está más cerca, apunta a la esquina inferior izquierda del laberinto, celda `(1, 29)`.

Los fantasmas que eligen un objetivo aplican la misma regla en los cruces: descartan el giro de 180 grados mientras haya otra salida legal, eligen la salida que minimice la distancia Manhattan al objetivo y resuelven empates con un orden fijo de direcciones. En callejones pueden retroceder. Las decisiones se toman en celdas alineadas, respetando las paredes, la puerta de casa y el túnel según las reglas actuales.

## Modelo de datos

Se amplía `GHOST_STARTS` en `src/js/maze.js` a cuatro posiciones distintas dentro de la casa. Cada fantasma conserva su `kind` y sus datos de movimiento actuales. `src/js/game.js` añade estado de salida a cada fantasma y una marca temporal monotónica de inicio de partida para calcular los turnos de salida.

```js
// Forma conceptual de un fantasma dentro de game.ghosts.
{
  x: 13,
  y: 14,
  dir: 'up',
  speed: GHOST_SPEED,
  kind: 'hunter', // hunter | ambusher | strategist | territorial
  releaseAt: 0,  // milisegundos desde el inicio de la partida
  released: false,
}
```

Los tiempos de salida son 0, 2000, 4000 y 6000 ms. Los fantasmas esperan quietos hasta su turno. Al ser liberados, siguen una ruta legal hasta la salida de la casa, por las celdas `(13, 11)` o `(14, 11)`; luego comienzan a aplicar su personalidad. Tras perder una vida, posiciones y tiempos de salida vuelven al estado inicial. El reloj de salida se reinicia en cada partida y tras cada pérdida de vida.

## Plan de implementación

1. Ampliar `GHOST_STARTS` en `src/js/maze.js` a cuatro posiciones interiores distintas y asignar los cuatro tipos; verificar que `createGame()` los incorpora sin alterar `MAZE`.
2. Actualizar `src/js/render.js` para asociar los colores rojo, rosa, cian y naranja a los cuatro tipos, sin cambiar las dimensiones del canvas.
3. Implementar en `src/js/game.js` los objetivos y la selección determinista de dirección; conservar el movimiento actual y comprobar las cuatro personalidades en escenarios controlados.
4. Añadir el estado y la ruta de salida escalonada en `src/js/game.js` y conectar el inicio y los reinicios de reloj en `src/js/main.js`; verificar que los fantasmas esperan, salen y se reinician.
5. Añadir pruebas automatizadas sin dependencias en `tests/game.test.js`, usando el ejecutor integrado de Node (`node --test`), y documentar su ejecución y la comprobación manual en `README.md`.

## Criterios de aceptación

- [ ] Una partida nueva contiene exactamente cuatro fantasmas, con posiciones iniciales distintas y tipos `hunter`, `ambusher`, `strategist` y `territorial`.
- [ ] El perseguidor rojo elige una salida legal que reduce la distancia Manhattan a Pacman siempre que exista una opción que lo haga.
- [ ] El rosa apunta cuatro celdas delante de Pacman; el cian calcula el reflejo especificado; el naranja cambia de objetivo al umbral Manhattan de ocho celdas.
- [ ] Las decisiones en empates son deterministas y ningún fantasma da media vuelta salvo cuando no hay otra salida legal.
- [ ] Los fantasmas salen en los turnos de 0, 2, 4 y 6 segundos de tiempo monotónico de juego; antes de su turno permanecen quietos.
- [ ] Cada fantasma liberado puede alcanzar una de las celdas de salida indicadas y comienza entonces a aplicar su personalidad.
- [ ] Al perder una vida, los cuatro fantasmas regresan a sus posiciones iniciales y se reinicia el escalonamiento de salida.
- [ ] Los fantasmas siguen respetando paredes, puerta y túnel; el canvas permanece en 560 × 620 píxeles.
- [ ] Las pruebas `node --test` pasan y el juego se puede ejecutar abriendo `src/index.html` en un navegador sin errores en la consola.

## Decisiones

- **Sí:** usar estrategias inspiradas en los cuatro fantasmas clásicos, con reglas simplificadas y expresas para cada uno.
- **Sí:** perseguir mediante elecciones locales de distancia Manhattan en cruces, en vez de implementar búsqueda de ruta global.
- **No:** aumentar la velocidad del perseguidor; la agresividad se expresa en su selección persistente de dirección hacia Pacman.
- **Sí:** medir las salidas con tiempo monotónico real, no con fotogramas, para que no dependan de la frecuencia de actualización.
- **No:** añadir poderes, estados vulnerables u otras mecánicas; son alcance de otra especificación.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Una estrategia local de distancia Manhattan no garantiza la ruta global más corta y puede elegir objetivos inaccesibles detrás de paredes. | Respetar las salidas legales, desempatar de forma determinista y verificar la conducta en escenarios de prueba del laberinto actual. |
| Una salida inicial mal ubicada o una ruta bloqueada puede dejar fantasmas atrapados dentro de la casa. | Usar cuatro celdas de inicio interiores distintas y probar que cada una alcanza `(13, 11)` o `(14, 11)` antes de integrar las personalidades. |
| El escalonamiento basado en tiempo puede desincronizarse si el reloj no se reinicia en una colisión. | Restablecer el inicio de tiempo junto con las posiciones y verificarlo mediante pruebas. |

## Qué **no** está en esta especificación

- Pastillas de poder ni fantasmas vulnerables.
- Velocidades diferentes para los fantasmas.
- Réplica exacta de la IA arcade original.
- Cambios a vidas, puntuación o dimensiones del laberinto y del canvas.

Estos cambios requerirían especificaciones independientes si se desean más adelante.
