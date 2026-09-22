/* FC AutoList - nucleo: config, almacenamiento y utilidades de DOM */
(() => {
  const NS = (window.FCAL = window.FCAL || {});
  NS.VERSION = '0.3.0';

  /* ---------------------------------------------------------------- config */

  NS.DEFAULTS = {
    waitTimeout: 20000,  // cuanto espera a que el boton termine de procesar
    afterList: 1200,     // espera despues de pulsar L, antes de la siguiente vuelta
    jitter: 250,         // aleatorio que se suma a cada espera
    background: true     // seguir trabajando con la pestana de fondo o minimizada
  };

  NS.config = { ...NS.DEFAULTS };

  const STORE_KEY = 'fcal_config';

  // chrome.storage cuando corre como extension; localStorage si no esta (maqueta de pruebas)
  const hasChromeStore = () => {
    try { return !!(chrome && chrome.storage && chrome.storage.local); } catch { return false; }
  };

  const store = {
    get(keys) {
      return new Promise((res) => {
        if (hasChromeStore()) return chrome.storage.local.get(keys, res);
        const out = {};
        for (const k of keys) {
          try { out[k] = JSON.parse(localStorage.getItem(k)); } catch { /* nada guardado */ }
        }
        res(out);
      });
    },
    set(obj) {
      return new Promise((res) => {
        if (hasChromeStore()) return chrome.storage.local.set(obj, res);
        for (const [k, v] of Object.entries(obj)) {
          try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin espacio */ }
        }
        res();
      });
    }
  };

  NS.loadConfig = async () => {
    const data = await store.get([STORE_KEY]);
    const saved = data[STORE_KEY] || {};
    NS.config = { ...NS.DEFAULTS };
    // solo recuperamos las claves que siguen existiendo (versiones antiguas dejan basura)
    for (const k of Object.keys(NS.DEFAULTS)) {
      const v = saved[k];
      if (typeof v !== typeof NS.DEFAULTS[k]) continue;
      if (typeof v === 'number' && !Number.isFinite(v)) continue;
      NS.config[k] = v;
    }
    return NS.config;
  };

  NS.saveConfig = () => store.set({ [STORE_KEY]: NS.config });

  /* ------------------------------------------------------------------ log */

  NS.listeners = { log: [], state: [] };
  NS.on = (evt, fn) => NS.listeners[evt].push(fn);
  NS.log = (msg, kind = 'info') => {
    const line = { t: new Date(), msg, kind };
    NS.listeners.log.forEach((f) => f(line));
    if (kind === 'error') console.warn('[FC AutoList]', msg);
  };

  /* ------------------------------------------------------------- utilidades */

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  NS.sleep = sleep;

  // espera base + un aleatorio, para no ir mas rapido de lo que la UI puede procesar
  // (via NS.sleep: timers.js lo cambia por uno que no se duerme en segundo plano)
  NS.pause = (base) => NS.sleep(base + Math.floor(Math.random() * (NS.config.jitter || 0)));

  NS.norm = (s) =>
    (s || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  NS.visible = (el) => {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const st = getComputedStyle(el);
    return st.visibility !== 'hidden' && st.display !== 'none' && st.opacity !== '0';
  };

  NS.enabled = (el) =>
    el &&
    !el.disabled &&
    !el.classList.contains('disabled') &&
    el.getAttribute('aria-disabled') !== 'true';

  /* --------------------------------------------------- busqueda de botones */

  const CLICKABLE = 'button, a, [role="button"], .btn, .ut-button-control, div, span, li';

  // Devuelve el elemento clicable visible cuyo texto coincide con alguno de los
  // textos dados. Se compara por texto porque las clases de la web app (y las de
  // FC Enhancer) cambian con cada parche.
  NS.findByText = (texts, { root = document, all = false } = {}) => {
    const wanted = (Array.isArray(texts) ? texts : [texts]).map(NS.norm);
    const out = [];
    for (const el of root.querySelectorAll(CLICKABLE)) {
      if (!NS.visible(el)) continue;
      const t = NS.norm(el.textContent);
      if (!t || t.length > 60) continue;
      if (!wanted.some((w) => t === w || t.startsWith(w))) continue;
      // nos quedamos con el elemento mas interno que contiene ese texto
      const i = out.findIndex((o) => o.contains(el));
      if (i >= 0) out[i] = el;
      else out.push(el);
    }
    return all ? out : out[0] || null;
  };

  /* ------------------------------------------------------------- interaccion */

  NS.click = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2);
    const y = Math.round(r.top + r.height / 2);
    const opts = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0 };
    try {
      el.dispatchEvent(new PointerEvent('pointerdown', { ...opts, pointerId: 1, isPrimary: true }));
      el.dispatchEvent(new MouseEvent('mousedown', opts));
      el.dispatchEvent(new PointerEvent('pointerup', { ...opts, pointerId: 1, isPrimary: true }));
      el.dispatchEvent(new MouseEvent('mouseup', opts));
      el.dispatchEvent(new MouseEvent('click', opts));
      if (typeof el.click === 'function') el.click();
      return true;
    } catch (e) {
      NS.log('No se pudo pulsar un elemento: ' + e.message, 'error');
      return false;
    }
  };

  NS.pressKey = (key) => {
    const code = 'Key' + key.toUpperCase();
    const kc = key.toUpperCase().charCodeAt(0);
    for (const type of ['keydown', 'keypress', 'keyup']) {
      const ev = new KeyboardEvent(type, {
        key, code, keyCode: kc, which: kc, bubbles: true, cancelable: true, composed: true
      });
      document.dispatchEvent(ev);
      document.body.dispatchEvent(ev);
    }
  };

  // Espera a que fn() devuelva algo "verdadero". Devuelve ese valor o null.
  NS.waitFor = async (fn, timeout = 8000, interval = 150) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      try {
        const v = fn();
        if (v) return v;
      } catch { /* la UI puede estar redibujando */ }
      await NS.sleep(interval);
    }
    return null;
  };
})();
