import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=us.opencourts.app';
const USES_KEY = 'opencourts-review-directions-uses';
const DISMISSED_KEY = 'opencourts-review-dismissed';
const REVIEWED_KEY = 'opencourts-review-link-opened';
const APP_SESSION_KEY = 'opencourts-play-app-session';
const COOLDOWN = 90 * 24 * 60 * 60 * 1000;

function inPlayApp() {
  if (!/Android/.test(navigator.userAgent)) return false;
  try {
    if (document.referrer.startsWith('android-app://us.opencourts.app')) {
      sessionStorage.setItem(APP_SESSION_KEY, '1');
      return true;
    }
    return sessionStorage.getItem(APP_SESSION_KEY) === '1';
  } catch {
    return document.referrer.startsWith('android-app://us.opencourts.app');
  }
}

export default function ReviewPrompt({ busy }: { busy: boolean }) {
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!inPlayApp()) return;
    const onDirections = () => {
      try {
        const uses = Number(localStorage.getItem(USES_KEY) || '0') + 1;
        localStorage.setItem(USES_KEY, String(uses));
        if (uses >= 2) setReady(true);
      } catch { /* Reviews are optional when storage is unavailable. */ }
    };
    window.addEventListener('opencourts:directions-used', onDirections);
    return () => window.removeEventListener('opencourts:directions-used', onDirections);
  }, []);

  useEffect(() => {
    if (!ready || busy) return;
    const onReturn = () => {
      if (document.hidden) return;
      try {
        if (localStorage.getItem(REVIEWED_KEY)) return;
        const dismissed = Number(localStorage.getItem(DISMISSED_KEY) || '0');
        if (dismissed && Date.now() - dismissed < COOLDOWN) return;
      } catch { return; }
      setVisible(true);
    };
    window.addEventListener('focus', onReturn);
    document.addEventListener('visibilitychange', onReturn);
    const timer = window.setTimeout(onReturn, 1500);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', onReturn);
      document.removeEventListener('visibilitychange', onReturn);
    };
  }, [ready, busy]);

  function dismiss() {
    setVisible(false);
    setReady(false);
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch { /* Optional storage. */ }
  }

  function openPlay() {
    setVisible(false);
    setReady(false);
    try { localStorage.setItem(REVIEWED_KEY, '1'); } catch { /* Optional storage. */ }
  }

  if (!visible || busy) return null;
  return <aside className="install-prompt" aria-labelledby="review-title">
    <button type="button" className="install-close" aria-label="Close review suggestion" onClick={dismiss}><X size={18}/></button>
    <div className="install-heading"><img src="/apple-touch-icon.png" width="44" height="44" alt=""/><strong id="review-title">Review Open Courts</strong></div>
    <p>Your review on Google Play can help other players find Open Courts.</p>
    <div className="install-actions"><a className="install-primary" href={PLAY_STORE_URL} onClick={openPlay}>Review on Google Play</a><button type="button" className="install-later" onClick={dismiss}>Not now</button></div>
  </aside>;
}
