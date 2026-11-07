export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=us.opencourts.app';
export const APP_STORE_URL = 'https://apps.apple.com/app/opencourts-tennis-courts/id6830325590?utm_source=chatgpt.com';

type Store = 'apple' | 'google';

function AppleLogo() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.05 12.54c-.02-2.17 1.77-3.22 1.85-3.27a3.98 3.98 0 0 0-3.13-1.69c-1.32-.14-2.58.79-3.25.79-.68 0-1.72-.77-2.83-.75a4.16 4.16 0 0 0-3.5 2.14c-1.51 2.62-.38 6.48 1.08 8.61.73 1.04 1.57 2.2 2.7 2.16 1.08-.04 1.49-.7 2.8-.7 1.31 0 1.68.7 2.82.67 1.17-.02 1.9-1.06 2.6-2.11a8.65 8.65 0 0 0 1.18-2.44 3.77 3.77 0 0 1-2.32-3.41ZM14.92 6.19a3.82 3.82 0 0 0 .87-2.74 3.9 3.9 0 0 0-2.51 1.3 3.64 3.64 0 0 0-.9 2.63 3.24 3.24 0 0 0 2.54-1.19Z"/></svg>;
}

function GooglePlayLogo() {
  return <svg viewBox="0 0 28 32" aria-hidden="true"><path fill="#00d7ff" d="m1.5 1.1 14.2 14.7L1.6 30.9A2.9 2.9 0 0 1 .4 28.7V3.3a2.9 2.9 0 0 1 1.1-2.2Z"/><path fill="#00f076" d="m1.5 1.1 16.4 9.5 4 4.1-6.2 1.1L1.5 1.1Z"/><path fill="#ffdf00" d="m15.7 15.8 6.2-1.1 4 4.1a2.9 2.9 0 0 1-.9 1.1l-8.7 5-6.2-6.4 5.6-2.7Z"/><path fill="#ff3b57" d="m1.6 30.9 14.1-14.8 6.2 6.4-18.8 10.8a2.9 2.9 0 0 1-1.5.4Z"/></svg>;
}

export function StoreBadge({ store }: { store: Store }) {
  const apple = store === 'apple';
  return <a className={`store-badge store-badge-${store}`} href={apple ? APP_STORE_URL : PLAY_STORE_URL} aria-label={apple ? 'Download on the App Store' : 'Get it on Google Play'}>
    {apple ? <AppleLogo/> : <GooglePlayLogo/>}
    <span className="store-badge-copy"><small>{apple ? 'Download on the' : 'GET IT ON'}</small><strong>{apple ? 'App Store' : 'Google Play'}</strong></span>
  </a>;
}
