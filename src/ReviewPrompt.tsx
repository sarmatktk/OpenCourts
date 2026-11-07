import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=us.opencourts.app';
const USES_KEY = 'opencourts-review-directions-uses';
const ENGAGEMENT_KEY = 'opencourts-review-engagement';
const DISMISSED_KEY = 'opencourts-review-dismissed';
const REVIEWED_KEY = 'opencourts-review-link-opened';
const APP_SESSION_KEY = 'opencourts-play-app-session';
const COOLDOWN = 90 * 24 * 60 * 60 * 1000;

type Engagement = { directions: number; courtIds: string[]; sections: string[] };

export function eligibleForReview({ directions, courtIds, sections }: Engagement) {
  return directions >= 2 || courtIds.length >= 3 ||
    (courtIds.length >= 1 && sections.includes('dry') && sections.includes('weather'));
}

function readEngagement(): Engagement {
  const saved = JSON.parse(localStorage.getItem(ENGAGEMENT_KEY) || '{}') as Partial<Engagement>;
  return {
    directions: Math.max(Number(saved.directions) || 0, Number(localStorage.getItem(USES_KEY)) || 0),
    courtIds: Array.isArray(saved.courtIds) ? saved.courtIds.filter(id => typeof id === 'string') : [],
    sections: Array.isArray(saved.sections) ? saved.sections.filter(section => typeof section === 'string') : [],
  };
}

function recordEngagement(action: { kind: 'directions' } | { kind: 'court'; id: string } | { kind: 'section'; section: string }) {
  const engagement = readEngagement();
  if (action.kind === 'directions') engagement.directions += 1;
  if (action.kind === 'court' && !engagement.courtIds.includes(action.id)) engagement.courtIds = [...engagement.courtIds, action.id].slice(-20);
  if (action.kind === 'section' && !engagement.sections.includes(action.section)) engagement.sections.push(action.section);
  localStorage.setItem(ENGAGEMENT_KEY, JSON.stringify(engagement));
  return eligibleForReview(engagement);
}

function inPlayApp() {
  if (!/Android/.test(navigator.userAgent)) return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
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

export default function ReviewPrompt({ busy, courtId }: { busy: boolean; courtId?: string }) {
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!inPlayApp()) return;
    try { if (eligibleForReview(readEngagement())) setReady(true); } catch { /* Optional storage. */ }
    const onDirections = () => {
      try { if (recordEngagement({ kind: 'directions' })) setReady(true); } catch { /* Reviews are optional when storage is unavailable. */ }
    };
    const onSection = () => {
      const section = window.location.hash === '#conditions' ? 'weather' : window.location.hash === '#rain-planner-title' ? 'dry' : '';
      if (!section) return;
      try { if (recordEngagement({ kind: 'section', section })) setReady(true); } catch { /* Optional storage. */ }
    };
    window.addEventListener('opencourts:directions-used', onDirections);
    window.addEventListener('hashchange', onSection);
    onSection();
    return () => {
      window.removeEventListener('opencourts:directions-used', onDirections);
      window.removeEventListener('hashchange', onSection);
    };
  }, []);

  useEffect(() => {
    if (!courtId || !inPlayApp()) return;
    try { if (recordEngagement({ kind: 'court', id: courtId })) setReady(true); } catch { /* Optional storage. */ }
  }, [courtId]);

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
  return <aside className="install-prompt review-prompt" aria-labelledby="review-title">
    <button type="button" className="install-close" aria-label="Close review suggestion" onClick={dismiss}><X size={18}/></button>
    <div className="install-heading"><img src="/apple-touch-icon.png" width="44" height="44" alt=""/><strong id="review-title">Review Open Courts</strong></div>
    <p>Your review on Google Play can help other players find Open Courts.</p>
    <div className="install-actions"><a className="install-primary" href={PLAY_STORE_URL} onClick={openPlay}>Review on Google Play</a><button type="button" className="install-later" onClick={dismiss}>Not now</button></div>
  </aside>;
}
