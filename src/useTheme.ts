import { useEffect, useState } from 'react';
export function useTheme() {
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  useEffect(() => {
    // Retire the former manual override; device preference is authoritative.
    try { localStorage.removeItem('opencourts-theme'); } catch { /* storage is optional */ }
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    const update = () => setSystemDark(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return { dark: systemDark };
}
