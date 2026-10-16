import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
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

function installed() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export default function InstallPrompt({ courtOpen, busy }: { courtOpen: boolean; busy: boolean }) {
  const [visible, setVisible] = useState(false);
  const [instructions, setInstructions] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [timeReached, setTimeReached] = useState(false);
  const viewedCourt = useRef(false);
  const shownThisSession = useRef(false);
  const installedThisPage = useRef(false);
  const ua = navigator.userAgent;
  const apple = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const safari = apple && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  const android = /Android/.test(ua) && /Chrome|SamsungBrowser|EdgA/.test(ua) && !/Firefox|OPR/.test(ua);
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
    const onPrompt = (event: Event) => { event.preventDefault(); setInstallEvent(event as InstallEvent); };
    const onInstalled = () => { installedThisPage.current = true; setVisible(false); setInstallEvent(null); trackInstall('pwa_install_confirmed'); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    if (courtOpen) viewedCourt.current = true;
    if (busy) { setVisible(false); return; }
    if ((!timeReached && !viewedCourt.current) || !mobile || installed() || installedThisPage.current || shownThisSession.current || (!safari && !android)) return;
    try { if (sessionStorage.getItem(SESSION_KEY)) return; } catch { /* Session storage may be unavailable. */ }
    try {
      const dismissed = Number(localStorage.getItem(DISMISSED_KEY));
      if (dismissed && Date.now() - dismissed < COOLDOWN) return;
    } catch { /* Local storage may be unavailable. */ }
    shownThisSession.current = true;
    setVisible(true);
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* Storage may be unavailable. */ }
  }, [courtOpen, busy, timeReached, mobile, safari, android]);

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch { /* Storage may be unavailable. */ }
  }

  async function add() {
    if (installEvent) {
      setInstallEvent(null);
      try {
        await installEvent.prompt();
        const choice = await installEvent.userChoice;
        if (choice.outcome === 'accepted') setVisible(false);
        else dismiss();
      } catch { setInstructions(true); }
    } else setInstructions(true);
  }

  if (!visible || installed() || installedThisPage.current) return null;
  return <aside className="install-prompt" aria-labelledby="install-title">
    <button type="button" className="install-close" aria-label="Close installation suggestion" onClick={dismiss}><X size={18}/></button>
    <div className="install-heading"><img src="/apple-touch-icon.png" width="44" height="44" alt=""/><strong id="install-title">Keep Open Courts handy</strong></div>
    <p>Add Open Courts to your home screen for quick access anytime. No app store needed.</p>
    {instructions && (safari ? <ol><li>Tap the Share button in Safari.</li><li>Select “Add to Home Screen.”</li><li>If offered, turn on “Open as Web App,” then tap “Add.”</li></ol> : <p className="install-steps">Open your browser menu, then choose “Add to Home screen” or “Install app.”</p>)}
    <div className="install-actions"><button type="button" className="install-primary" onClick={add}>Add to Home Screen</button><button type="button" className="install-later" onClick={dismiss}>Maybe Later</button></div>
  </aside>;
}
