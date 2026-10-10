(() => {
  const storageKey = 'opencourts-theme';

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const button = document.querySelector('[data-theme-toggle]');
    if (button) {
      const dark = theme === 'dark';
      button.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      button.setAttribute('title', dark ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }

  let theme = 'light';
  try { theme = localStorage.getItem(storageKey) === 'dark' ? 'dark' : 'light'; } catch { /* storage optional */ }
  applyTheme(theme);

  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(theme);
    const button = document.querySelector('[data-theme-toggle]');
    button?.addEventListener('click', () => {
      theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(storageKey, theme); } catch { /* storage optional */ }
      applyTheme(theme);
    });
  });
})();
