import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { StoreBadge } from './StoreBadge';

const DISMISSED_KEY = 'opencourts-install-dismissed';
const SESSION_KEY = 'opencourts-install-shown';
const INSTALL_TRACKED_KEY = 'opencourts-install-tracked';
const COOLDOWN = 14 * 24 * 60 * 60 * 1000;

function trackInstall(eventName: string) {
  if (!import.meta.env.PROD) return;
  try {
    if (localStorage.getItem(INSTALL_TRACKED_KEY)) return;
    localStorage.setItem(INSTALL_TRACKED_KEY, '1');
  } catch { /* Analytics can still run if storage is unavailable. */ }
  const analytics = window as Window & { gtag?: (...args: unknown[]) => void };
  analytics.gtag?.('event', eventName, { transport_type: 'beacon' });
}

function runningAndroidApp() {
  return /Android/.test(navigator.userAgent) &&
    document.referrer.startsWith('android-app://');
}

function installed() {
  return runningAndroidApp() ||
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export default function InstallPrompt({ courtOpen, busy }: { courtOpen: boolean; busy: boolean }) {
  const [visible, setVisible] = useState(false);
  const [timeReached, setTimeReached] = useState(false);
  const viewedCourt = useRef(false);
  const shownThisSession = useRef(false);
  const installedThisPage = useRef(false);
  const ua = navigator.userAgent;
  const apple = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  const mobile = apple || android;

  useEffect(() => {
    if (!mobile || timeReached || installed()) return;
    let elapsed = 0;
    let lastTick = Date.now();
    const timer = window.setInterval(() => {
      const now = Date.now();
      if (!document.hidden) elapsed += now - lastTick;
      lastTick = now;
      if (elapsed >= 45_000) setTimeReached(true);
    }, 1000);
    const onVisibility = () => { lastTick = Date.now(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisibility); };
  }, [mobile, timeReached]);

  useEffect(() => {
    if (apple && installed()) trackInstall('pwa_ios_standalone_first_open');
  }, [apple]);

  useEffect(() => {
    if (courtOpen) viewedCourt.current = true;
    if (busy) { setVisible(false); return; }
    if ((!timeReached && !viewedCourt.current) || !mobile || installed() || installedThisPage.current || shownThisSession.current || (!apple && !android)) return;
    try { if (sessionStorage.getItem(SESSION_KEY)) return; } catch { /* Session storage may be unavailable. */ }
    try {
      const dismissed = Number(localStorage.getItem(DISMISSED_KEY));
      if (dismissed && Date.now() - dismissed < COOLDOWN) return;
    } catch { /* Local storage may be unavailable. */ }
    shownThisSession.current = true;
    setVisible(true);
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* Storage may be unavailable. */ }
  }, [courtOpen, busy, timeReached, mobile, apple, android]);

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch { /* Storage may be unavailable. */ }
  }

  if (!visible || installed() || installedThisPage.current) return null;
  return <aside className="install-prompt" aria-labelledby="install-title">
    <button type="button" className="install-close" aria-label="Close installation suggestion" onClick={dismiss}><X size={18}/></button>
    <div className="install-heading"><img src="/apple-touch-icon.png" width="44" height="44" alt=""/><strong id="install-title">Keep Open Courts handy</strong></div>
    <p>{android ? 'Download Open Courts from Google Play for quick access anytime.' : 'Download Open Courts from the App Store for quick access anytime.'}</p>
    <div className="install-actions"><span onClick={() => setVisible(false)}><StoreBadge store={android ? 'google' : 'apple'} /></span><button type="button" className="install-later" onClick={dismiss}>Maybe Later</button></div>
  </aside>;
}
