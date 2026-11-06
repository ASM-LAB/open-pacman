## PacMan like

Vamos a crear un juego de PacMan como el juego de PacMan original, pero con una interfaz gráfica más moderna y sencilla.

## Tecnologías

- Vanilla JS
- HTML
- CSS

# Spec Driven Development

El proyecto sirve para aprender este enfoque de desarrollo.

## Ejecución

Abre `src/index.html` directamente en un navegador. No se necesita servidor ni instalar dependencias.

## Pruebas

Desde la raíz del proyecto, ejecuta las pruebas automatizadas con el ejecutor integrado de Node.js:

```sh
node --test
```

## Comprobación manual

1. Abre `src/index.html` y pulsa **Start**; comprueba que aparecen los fantasmas rojo, rosa, cian y naranja.
2. Observa que salen de la casa escalonadamente: el primero al iniciar, y los siguientes cada dos segundos, siguiendo una ruta por la puerta.
3. Juega hasta perder una vida y comprueba que Pac-Man y los cuatro fantasmas vuelven a sus posiciones iniciales y se reinicia la secuencia de salida.
4. Come una pastilla de una esquina: debe sumar 50 puntos y los fantasmas deben ponerse azules durante seis segundos. Tócalos mientras estén azules para devolverlos a la casa sin perder una vida.
5. Revisa la consola del navegador y confirma que no aparecen errores.
