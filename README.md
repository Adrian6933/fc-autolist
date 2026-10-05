# FC AutoList

Extensión de Chrome para la Web App de EA FC. Hace una sola cosa, en bucle:

1. pulsa `List for Current Lowest BIN` (o `List for FUTNEXT`, según con qué botón inicies)
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

Hay dos botones de inicio, y hacen lo mismo salvo qué botón de FC Enhancer pulsan cada vuelta:

- **Lowest BIN** → `List for Current Lowest BIN`
- **FUTNEXT** → `List for FUTNEXT`

El número grande cuenta los publicados. Mientras corre, los dos botones se sustituyen por **Parar**
(dice con cuál arrancaste). También corta la tecla `Esc`.

Si en algún momento no encuentra el botón (no hay jugador seleccionado, la web app está cargando),
no se rompe: avisa en el log y sigue mirando, así que en cuanto haya algo que listar continúa solo.

### El botón "Remove"

Si sale un botón que diga exactamente **Remove**, lo pulsa (con un solo clic) y sigue. Solo el texto
exacto: "Remove All" o "Remove from club" no los toca. Lleva un freno: si tiene que pulsarlo **5 veces
seguidas sin publicar nada entre medias**, para y lo dice en el registro, para no seguir quitando
cosas si algo va mal.

### Ajustes

| Ajuste | Para qué |
|---|---|
| Espera máxima | Cuánto aguanta a que el botón termine antes de reintentar |
| Pausa entre vueltas | Cuánto espera después de la `L` antes de la siguiente |
| Aleatorio extra | Margen variable que se suma a cada espera |

## Cómo está hecho

- `src/core.js` — configuración, clics sintéticos, esperas y búsqueda de botones **por texto**
  (las clases CSS de la web app cambian en cada parche; los textos no).
- `src/engine.js` — el bucle. Los textos que busca están arriba, en `NS.TXT`.
- `src/panel.js` — el panel flotante (Shadow DOM, así los estilos de EA no lo rompen).
- `src/boot.js` — arranque y `FCAL.diagnose()` (dime qué botones ve; se llama desde la consola).
- `test/mock.html` — maqueta de la web app para probar el bucle sin tocar tu cuenta.

Para probar la maqueta: servidor `fcautolist-mock` de `proyectos/.claude/launch.json` y abrir
`http://localhost:4340/fc-autolist/test/mock.html`.

## Aviso

EA prohíbe automatizar la Web App en sus condiciones de uso. Ritmos muy agresivos también hacen que
la web app te eche por exceso de peticiones. Úsalo con cabeza y bajo tu responsabilidad.
