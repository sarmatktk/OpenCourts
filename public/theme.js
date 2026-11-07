(() => {
  const preference = window.matchMedia?.('(prefers-color-scheme: dark)');
  const readTheme = () => preference?.matches ? 'dark' : 'light';
  const setTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
  };
  setTheme(readTheme());
  preference?.addEventListener('change', () => setTheme(readTheme()));
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-menu-toggle]').forEach(button => button.addEventListener('click', () => {
      const nav = document.getElementById('landing-nav');
      const open = nav?.classList.toggle('open') ?? false;
      button.setAttribute('aria-expanded', String(open));
    }));
    document.querySelectorAll('[data-near-me]').forEach(button => button.addEventListener('click', () => {
      if (!navigator.geolocation) { window.location.href = '/#explore'; return; }
      button.disabled = true;
      navigator.geolocation.getCurrentPosition(position => {
        try { localStorage.setItem('opencourts-place-v2', JSON.stringify({ label: 'Your location', lat: position.coords.latitude, lon: position.coords.longitude })); } catch { /* Optional storage. */ }
        window.location.href = '/#explore';
      }, () => { button.disabled = false; window.location.href = '/#explore'; }, { enableHighAccuracy: true, timeout: 10000 });
    }));
    document.querySelectorAll('[data-city-preset="fairfax-va"]').forEach(link => link.addEventListener('click', () => {
      try { localStorage.setItem('opencourts-place-v2', JSON.stringify({ label: 'Fairfax, Virginia', lat: 38.8462, lon: -77.3064 })); } catch { /* Optional storage. */ }
    }));
  });
})();
