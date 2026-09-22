/* FC AutoList - arranque y diagnostico */
(() => {
  const NS = window.FCAL;

  // Vuelca lo que la extension es capaz de ver. Sirve para afinar los textos
  // de los botones cuando EA o FC Enhancer cambian la interfaz.
  NS.diagnose = () => {
    NS.log('--- diagnostico ---');
    for (const [k, list] of Object.entries(NS.TXT)) {
      const hit = NS.findByText(list);
      NS.log(`Boton ${k}: ${hit ? '"' + hit.textContent.trim().slice(0, 40) + '"' : 'no visible ahora'}`);
    }
    NS.log('--- fin ---');
  };

  const started = Date.now();

  // La web app puede vivir dentro de un iframe: montamos el panel en el
  // documento que realmente contiene el juego, no en la pagina contenedora.
  const isWebApp = () => {
    if (!/ultimate-team\/web-app/i.test(location.href)) return false;
    if (document.querySelector('.listFUTItem, [class*="ut-"], .ut-navigation-bar-view')) return true;
    // si tras 15s no aparece nada reconocible, lo montamos en la pagina principal
    return window.top === window && Date.now() - started > 15000;
  };

  const boot = async () => {
    if (!isWebApp()) return;
    await NS.loadConfig();
    NS.mountPanel();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  // la web app es una SPA: si el panel desaparece en un redibujado, lo remontamos
  setInterval(() => {
    if (isWebApp() && !document.getElementById('fcal-root')) boot();
  }, 4000);
})();
