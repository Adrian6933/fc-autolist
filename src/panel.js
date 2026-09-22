/* FC AutoList - panel flotante (shadow root para que los estilos de la web app
   no lo toquen) */
(() => {
  const NS = window.FCAL;

  const CSS = `
  :host { all: initial; }
  .wrap {
    position: fixed; top: 80px; right: 24px; z-index: 2147483647;
    width: 260px; display: flex; flex-direction: column;
    font: 12px/1.45 "Segoe UI", system-ui, sans-serif; color: #e8ecf5;
    background: #12172a; border: 1px solid #2c3552; border-radius: 10px;
    box-shadow: 0 18px 50px rgba(0,0,0,.55); overflow: hidden;
  }
  .wrap.min .body { display: none; }
  header {
    display: flex; align-items: center; gap: 8px; padding: 9px 10px;
    background: #1a2140; cursor: move; user-select: none;
  }
  header h1 { font-size: 12px; font-weight: 600; margin: 0; flex: 1; letter-spacing: .3px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #64748b; }
  .dot.running { background: #34d399; }
  .iconbtn { background: none; border: 0; color: #9aa6c4; cursor: pointer; font-size: 14px; padding: 0 4px; line-height: 1; }
  .body { padding: 10px; display: flex; flex-direction: column; gap: 9px; }
  button.act {
    width: 100%; padding: 10px 6px; border-radius: 6px; border: 1px solid #5566e0;
    background: #4453c7; color: #fff; cursor: pointer; font-size: 13px; font-weight: 600;
  }
  button.act.on { background: #7a2340; border-color: #a3335a; }
  .big { text-align: center; font-size: 26px; font-weight: 700; letter-spacing: .5px; }
  .big small { display: block; font-size: 10px; font-weight: 500; color: #9aa6c4; letter-spacing: .6px; text-transform: uppercase; }
  label.f { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11px; color: #a7b2d0; }
  label.f input {
    width: 84px; background: #0d1226; border: 1px solid #2c3552; color: #e8ecf5;
    border-radius: 4px; padding: 3px 5px; font-size: 11px;
  }
  details summary { cursor: pointer; color: #9aa6c4; font-size: 11px; outline: none; }
  details[open] summary { margin-bottom: 7px; }
  .fields { display: flex; flex-direction: column; gap: 6px; }
  .log { background: #0d1226; border: 1px solid #263055; border-radius: 6px; padding: 6px; height: 92px; overflow: auto; font-size: 10.5px; }
  .log div { margin-bottom: 2px; color: #9aa6c4; }
  .log .ok { color: #6ee7b7; }
  .log .warn { color: #fbbf24; }
  .log .error { color: #f87171; }
  `;

  const html = `
  <div class="wrap">
    <header>
      <span class="dot" id="dot"></span>
      <h1>FC AutoList</h1>
      <button class="iconbtn" id="min" title="Minimizar">_</button>
    </header>
    <div class="body">
      <div class="big"><span id="count">0</span><small>publicados</small></div>
      <button class="act" id="toggle">Iniciar</button>
      <details>
        <summary>Ajustes</summary>
        <div class="fields">
          <label class="f">Espera maxima (ms) <input type="number" id="waitTimeout" min="3000" step="1000"></label>
          <label class="f">Pausa entre vueltas (ms) <input type="number" id="afterList" min="200" step="100"></label>
          <label class="f">Aleatorio extra (ms) <input type="number" id="jitter" min="0" step="50"></label>
          <label class="f" title="Mantiene el ritmo aunque cambies de pestana o minimices Chrome">
            Seguir en segundo plano <input type="checkbox" id="background">
          </label>
        </div>
      </details>
      <div class="log" id="log"></div>
    </div>
  </div>`;

  NS.mountPanel = () => {
    if (document.getElementById('fcal-root')) return;
    const host = document.createElement('div');
    host.id = 'fcal-root';
    const sh = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = CSS;
    sh.appendChild(style);
    const holder = document.createElement('div');
    holder.innerHTML = html;
    sh.appendChild(holder);
    document.documentElement.appendChild(host);

    const $ = (id) => sh.getElementById(id);
    const wrap = sh.querySelector('.wrap');

    /* --------------------------------------------------------- arrastrar */
    const head = sh.querySelector('header');
    let drag = null;
    head.addEventListener('mousedown', (e) => {
      if (e.target.id === 'min') return;
      const r = wrap.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!drag) return;
      wrap.style.left = `${e.clientX - drag.dx}px`;
      wrap.style.top = `${e.clientY - drag.dy}px`;
      wrap.style.right = 'auto';
    });
    window.addEventListener('mouseup', () => (drag = null));
    $('min').onclick = () => wrap.classList.toggle('min');

    /* ----------------------------------------------------------- control */
    $('toggle').onclick = () => {
      if (NS.engine.state === 'running') NS.engine.stop();
      else NS.engine.start();
    };

    /* ----------------------------------------------------------- ajustes */
    ['waitTimeout', 'afterList', 'jitter', 'background'].forEach((id) => {
      const el = $(id);
      const check = el.type === 'checkbox';
      if (check) el.checked = !!NS.config[id];
      else el.value = NS.config[id] ?? '';
      el.onchange = () => {
        NS.config[id] = check ? el.checked : Number(el.value);
        NS.saveConfig();
        if (id === 'background' && NS.engine.state === 'running') NS.keepAwake(el.checked);
      };
    });

    /* -------------------------------------------------------- reacciones */
    NS.on('log', (l) => {
      const d = document.createElement('div');
      d.className = l.kind;
      d.textContent = `${l.t.toLocaleTimeString()}  ${l.msg}`;
      $('log').appendChild(d);
      $('log').scrollTop = $('log').scrollHeight;
      while ($('log').children.length > 200) $('log').removeChild($('log').firstChild);
    });

    NS.on('state', (E) => {
      const run = E.state === 'running';
      $('dot').className = 'dot' + (run ? ' running' : '');
      $('toggle').textContent = run ? 'Parar' : 'Iniciar';
      $('toggle').classList.toggle('on', run);
      $('count').textContent = E.count;
    });

    // parada de emergencia
    window.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Escape' && NS.engine.state === 'running') NS.engine.stop();
      },
      true
    );

    NS.log(`FC AutoList ${NS.VERSION} listo.`, 'ok');
  };
})();
