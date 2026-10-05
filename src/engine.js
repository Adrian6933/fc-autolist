/* FC AutoList - motor: pulsar el boton del precio mas bajo, esperar, pulsar L,
   y vuelta a empezar hasta que el usuario pare. */
(() => {
  const NS = window.FCAL;

  const TXT = {
    lowestBin: [
      'List for Current Lowest BIN',
      'Retrieve Current Lowest BIN',
      'Find lowest market price',
      'Cheapest'
    ],
    futnext: ['List for FUTNEXT'],
    confirm: ['List for Transfer'],
    remove: ['Remove']
  };
  NS.TXT = TXT;

  const E = (NS.engine = {
    state: 'idle',   // idle | running
    mode: 'lowestBin', // que boton se pulsa: 'lowestBin' | 'futnext'
    count: 0,        // vueltas completadas
    fails: 0,
    removed: 0,      // veces que se ha pulsado "Remove" en esta tanda
    removeStreak: 0  // ... seguidas, sin publicar nada entre medias
  });

  // Si sale el boton "Remove" se pulsa. Solo el texto EXACTO "Remove" (no
  // "Remove All", "Remove from club"...), como mucho una vez por segundo, y si
  // hay que pulsarlo REMOVE_MAX_STREAK veces seguidas sin publicar nada entre
  // medias, se para: algo raro pasa y no se debe seguir quitando cosas.
  const REMOVE_MAX_STREAK = 5;
  let lastRemove = 0;
  const tryRemove = () => {
    const btn = NS.findByText(TXT.remove, { exact: true });
    if (!btn || !NS.enabled(btn)) return false;
    if (Date.now() - lastRemove < 1000) return false;
    lastRemove = Date.now();
    NS.click(btn, { once: true });
    E.removed++;
    E.removeStreak++;
    NS.log(`Boton Remove pulsado (${E.removeStreak} seguidas).`, 'warn');
    return true;
  };
  const removeTooMuch = () => {
    if (E.removeStreak < REMOVE_MAX_STREAK) return false;
    NS.log(`Remove ha salido ${E.removeStreak} veces seguidas sin publicar nada. Paro para que lo mires.`, 'error');
    return true;
  };

  const MODE_NAME = { lowestBin: 'del precio mas bajo', futnext: 'List for FUTNEXT' };

  const emit = () => NS.listeners.state.forEach((f) => f(E));
  const setState = (s) => { E.state = s; emit(); };

  const confirmBtn = () => NS.findByText(TXT.confirm);
  const confirmReady = () => {
    const b = confirmBtn();
    return b && NS.enabled(b) ? b : null;
  };

  const loop = async () => {
    while (E.state === 'running') {
      if (tryRemove()) {
        if (removeTooMuch()) break;
        await NS.pause(NS.config.afterList);
        continue;
      }

      const bin = NS.findByText(TXT[E.mode]);
      if (!bin) {
        NS.log(`No veo el boton ${MODE_NAME[E.mode]}. Esperando...`, 'warn');
        await NS.sleep(1500);
        continue;
      }

      NS.click(bin);
      await NS.sleep(400); // que la UI se entere del clic antes de mirar el estado

      // la espera se corta sola si el usuario para a mitad
      let removedWhileWaiting = false;
      const ready = await NS.waitFor(
        () => {
          if (E.state !== 'running') return true;
          if (tryRemove()) { removedWhileWaiting = true; return true; }
          return confirmReady();
        },
        NS.config.waitTimeout,
        200
      );
      if (E.state !== 'running') break;
      if (removedWhileWaiting) {
        if (removeTooMuch()) break;
        await NS.pause(NS.config.afterList);
        continue; // se quito el jugador: no se pulsa la L
      }

      if (!ready) {
        E.fails++;
        NS.log(`No termino de procesar en ${NS.config.waitTimeout / 1000}s. Reintento.`, 'error');
        emit();
        await NS.pause(NS.config.afterList);
        continue;
      }

      NS.pressKey('l');

      // se ha publicado cuando el boton de confirmar deja de estar disponible
      const gone = await NS.waitFor(() => (confirmReady() ? null : true), 6000, 200);

      E.count++;
      E.removeStreak = 0; // publicar cuenta como "todo normal"
      if (!gone) NS.log(`Vuelta ${E.count}: pulsada la L, pero el boton sigue ahi.`, 'warn');
      else NS.log(`Vuelta ${E.count}: publicado.`, 'ok');
      emit();

      await NS.pause(NS.config.afterList);
    }

    setState('idle');
    NS.log(`Parado. ${E.count} publicados${E.removed ? `, ${E.removed} Remove pulsados` : ''} en esta tanda.`, 'ok');
  };

  E.start = (mode = 'lowestBin') => {
    if (E.state === 'running') return;
    if (!TXT[mode] || mode === 'confirm') mode = 'lowestBin';
    E.mode = mode;
    E.count = 0;
    E.fails = 0;
    E.removed = 0;
    E.removeStreak = 0;
    lastRemove = 0;
    setState('running');
    NS.log(`En marcha con ${mode === 'futnext' ? 'List for FUTNEXT' : 'Lowest BIN'}. Esc o Parar para cortar.`, 'ok');
    loop();
  };

  E.stop = () => {
    if (E.state !== 'running') return;
    setState('idle');
    NS.log('Parando...', 'warn');
  };
})();
