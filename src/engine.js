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
    confirm: ['List for Transfer']
  };
  NS.TXT = TXT;

  const E = (NS.engine = {
    state: 'idle',   // idle | running
    count: 0,        // vueltas completadas
    fails: 0
  });

  const emit = () => NS.listeners.state.forEach((f) => f(E));
  const setState = (s) => { E.state = s; emit(); };

  const confirmBtn = () => NS.findByText(TXT.confirm);
  const confirmReady = () => {
    const b = confirmBtn();
    return b && NS.enabled(b) ? b : null;
  };

  const loop = async () => {
    while (E.state === 'running') {
      const bin = NS.findByText(TXT.lowestBin);
      if (!bin) {
        NS.log('No veo el boton del precio mas bajo. Esperando...', 'warn');
        await NS.sleep(1500);
        continue;
      }

      NS.click(bin);
      await NS.sleep(400); // que la UI se entere del clic antes de mirar el estado

      // la espera se corta sola si el usuario para a mitad
      const ready = await NS.waitFor(
        () => (E.state !== 'running' ? true : confirmReady()),
        NS.config.waitTimeout,
        200
      );
      if (E.state !== 'running') break;

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
      if (!gone) NS.log(`Vuelta ${E.count}: pulsada la L, pero el boton sigue ahi.`, 'warn');
      else NS.log(`Vuelta ${E.count}: publicado.`, 'ok');
      emit();

      await NS.pause(NS.config.afterList);
    }

    NS.keepAwake(false);
    setState('idle');
    NS.log(`Parado. ${E.count} publicados en esta tanda.`, 'ok');
  };

  E.start = () => {
    if (E.state === 'running') return;
    E.count = 0;
    E.fails = 0;
    setState('running');
    if (NS.config.background) NS.keepAwake(true);
    NS.log(`En marcha (reloj: ${NS.timerMode()}). Esc o Parar para cortar.`, 'ok');
    loop();
  };

  E.stop = () => {
    if (E.state !== 'running') return;
    setState('idle');
    NS.log('Parando...', 'warn');
  };
})();
