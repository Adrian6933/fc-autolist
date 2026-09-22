# FC AutoList

Extensión de Chrome para la Web App de EA FC. Hace una sola cosa, en bucle:

1. pulsa `List for Current Lowest BIN`
2. espera a que termine de procesar
3. pulsa `L` para publicar
4. vuelta a empezar, hasta que pares

Funciona **encima** de FC Enhancer: no busca precios ni toca el mercado, solo pulsa sus botones por ti.

## Instalar

1. Chrome → `chrome://extensions`
2. Activa "Modo de desarrollador" (arriba a la derecha).
3. "Cargar descomprimida" → elige la carpeta `fc-autolist`.
4. Abre la Web App. Aparece un panel flotante arriba a la derecha.

Cuando cambie el código, vuelve a `chrome://extensions` y pulsa recargar en la tarjeta de la extensión.

## Uso

**Iniciar** y ya. El número grande cuenta los publicados. Para cortar: botón **Parar** o la tecla `Esc`.

Si en algún momento no encuentra el botón (no hay jugador seleccionado, la web app está cargando),
no se rompe: avisa en el log y sigue mirando, así que en cuanto haya algo que listar continúa solo.

### Ajustes

| Ajuste | Para qué |
|---|---|
| Espera máxima | Cuánto aguanta a que el botón termine antes de reintentar |
| Pausa entre vueltas | Cuánto espera después de la `L` antes de la siguiente |
| Aleatorio extra | Margen variable que se suma a cada espera |
| Seguir en segundo plano | Que no se duerma al cambiar de pestaña o minimizar Chrome |

### Por qué hace falta lo de "segundo plano"

Chrome estrangula los temporizadores de las pestañas que no estás viendo (pasan a ~1 disparo por
segundo) y tras unos minutos ocultas puede congelar la pestaña entera. Por eso un bucle normal parece
"dejar de funcionar" al minimizar. Dos contramedidas, las dos en `src/timers.js`:

- **el reloj lo lleva un Web Worker**, que no sufre ese estrangulamiento;
- **mientras el bucle corre suena un audio inaudible**, porque Chrome no estrangula ni congela una
  pestaña que está reproduciendo sonido. Verás el icono de altavoz en la pestaña: es eso, y se apaga
  solo al parar.

Aun así, lo más seguro es dejar la ventana abierta a la vista (en otro monitor, o sin minimizar).

## Cómo está hecho

- `src/core.js` — configuración, clics sintéticos, esperas y búsqueda de botones **por texto**
  (las clases CSS de la web app cambian en cada parche; los textos no).
- `src/timers.js` — el reloj que no se duerme en segundo plano y el audio inaudible.
- `src/engine.js` — el bucle. Los textos que busca están arriba, en `NS.TXT`.
- `src/panel.js` — el panel flotante (Shadow DOM, así los estilos de EA no lo rompen).
- `src/boot.js` — arranque y `FCAL.diagnose()` (dime qué botones ve; se llama desde la consola).
- `test/mock.html` — maqueta de la web app para probar el bucle sin tocar tu cuenta.

Para probar la maqueta: servidor `fcautolist-mock` de `proyectos/.claude/launch.json` y abrir
`http://localhost:4340/fc-autolist/test/mock.html`.

## Aviso

EA prohíbe automatizar la Web App en sus condiciones de uso. Ritmos muy agresivos también hacen que
la web app te eche por exceso de peticiones. Úsalo con cabeza y bajo tu responsabilidad.
