# SPEC 02 — Pastillas de poder

> **Estado:** Aprobado  
> **Depende de:** SPEC 01 — Cuatro fantasmas  
> **Objetivo:** Añadir cuatro pastillas de poder, una en cada esquina transitable del tablero, y permitir que Pac-Man temporalmente neutralice a los fantasmas.

## Alcance

- Colocar pastillas en `(1, 1)`, `(26, 1)`, `(1, 29)` y `(26, 29)`.
- Al comer una pastilla, sumar 50 puntos y activar durante seis segundos el estado vulnerable de los fantasmas.
- Dibujar las pastillas de forma destacada y los fantasmas vulnerables en azul.
- Si Pac-Man toca un fantasma vulnerable, devolverlo a la casa sin perder una vida; el fantasma puede volver a salir siguiendo la ruta habitual.
- Contar las pastillas de poder junto con los dots para determinar cuándo se completa el tablero.

## Reglas

- Las pastillas usan el valor de celda `4`; los dots normales conservan el valor `2`.
- El tiempo de poder se mide con el reloj monotónico usado por el juego. Una nueva pastilla reinicia los seis segundos desde el momento en que se come.
- Fuera del periodo vulnerable, las colisiones conservan las reglas de vidas existentes.
- No cambian las velocidades, el tamaño del tablero, el canvas ni la puntuación de los dots normales.

## Criterios de aceptación

- [ ] Hay exactamente cuatro pastillas en las esquinas transitables especificadas.
- [ ] Comer una pastilla la elimina, suma 50 puntos y reduce el contador de elementos pendientes.
- [ ] Los cuatro fantasmas se muestran azules durante seis segundos.
- [ ] Tocar un fantasma vulnerable lo devuelve a su posición de inicio sin reducir las vidas; después puede salir de nuevo.
- [ ] Los fantasmas siguen causando pérdida de vida al tocarlos cuando no son vulnerables.
- [ ] El juego solo se gana después de recoger dots y pastillas de poder.
- [ ] Las pruebas `node --test` pasan y la partida sigue funcionando al abrir `src/index.html`.
