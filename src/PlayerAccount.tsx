import SiteSelect from './SiteSelect';
import LocationAutocomplete from './LocationAutocomplete';
import PhotoUpload from './PhotoUpload';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, LoaderCircle, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { useTheme } from './useTheme';
import PlayTogetherHeader from './PlayTogetherHeader';
import './play-together.css';

type Provider = 'google' | 'apple';
type Player = { id: string; displayName: string; bio: string; generalLocation: string; skillLevel: string; discoverable: boolean };
type Account = { player: Player | null; csrfToken: string | null; providers: Record<Provider, boolean>; connectedProviders: string[]; connectedAccounts?:{provider:Provider;email:string|null}[] };
const providerName = { google: 'Google', apple: 'Apple' };
const emptyProfile: Omit<Player, 'id'> = { displayName: '', bio: '', generalLocation: '', skillLevel: 'unspecified', discoverable: false };
async function accountRequest(path: string, options: RequestInit = {}, csrf?: string | null) {
  const response = await fetch(`/api/auth/${path}`, { ...options, credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(response.status === 404 ? 'Player accounts are not enabled in this environment yet.' : data.error || 'Account service is unavailable. Please try again.');
  return data;
}
function ProviderIcon({ provider }: { provider: Provider }) {
  // Neutral letter marks use the website's current text color, not a new palette.
  return <span className="pt-provider-mark" aria-hidden="true">{provider === 'google' ? 'G' : <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M16.8 12.7c0-2 1.6-3 1.7-3.1-1-1.4-2.4-1.6-3-1.6-1.3-.2-2.5.8-3.2.8-.6 0-1.6-.8-2.7-.7-1.4 0-2.7.8-3.4 2-1.4 2.4-.4 6 1 8 .6 1 1.4 2 2.4 1.9 1-.1 1.4-.6 2.6-.6s1.6.6 2.7.6 1.8-1 2.4-1.9c.8-1.1 1.1-2.2 1.1-2.3-.1 0-2.2-.9-2.2-3.1ZM14.7 6.7c.6-.8 1-1.8.9-2.8-.9 0-2 .6-2.7 1.3-.6.7-1.1 1.8-1 2.7 1 .1 2.1-.5 2.8-1.2Z"/></svg>}</span>;
}
export default function PlayerAccount() {
  const { dark } = useTheme();
  const [account, setAccount] = useState<Account | null>(null);
  const [draft, setDraft] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const draftDirty = useRef(false);
  const generation = useRef(0);
  const previousPlayer = useRef<string | null>(null);
  const reload = useCallback(async (initial = false) => {
    const ticket = ++generation.current;
    try {
      const data: Account = await accountRequest('me');
      if (ticket !== generation.current) return;
      setAccount(data);
      const changedPlayer = previousPlayer.current !== (data.player?.id ?? null);
      if (changedPlayer) { draftDirty.current = false; setDeleteOpen(false); setConfirmation(''); }
      previousPlayer.current = data.player?.id ?? null;
      if (initial || changedPlayer || !data.player || !draftDirty.current) setDraft(data.player ? { displayName: data.player.displayName, bio: data.player.bio, generalLocation: data.player.generalLocation, skillLevel: data.player.skillLevel, discoverable: data.player.discoverable } : emptyProfile);
      if (!data.player) { draftDirty.current = false; setDeleteOpen(false); }
      setError('');
    } catch (e) { if (ticket === generation.current) { setAccount(null); setDraft(emptyProfile); previousPlayer.current = null; draftDirty.current = false; setError((e as Error).message); } }
    finally { if (ticket === generation.current) setLoading(false); }
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.has('authError')) {
      const reasons: Record<string,string> = {
        'provider-invalid_client': 'The sign-in provider rejected the development credentials. The site administrator needs to check the client ID, signing key and team configuration.',
        'provider-invalid_grant': 'The sign-in authorization expired or was rejected. Please start sign-in again.',
        'client-credentials': 'The development signing key could not be used. The site administrator needs to check its configuration.',
        'apple-key-format': 'The Apple private key must contain the complete .p8 PEM text, including BEGIN PRIVATE KEY and END PRIVATE KEY lines.',
        'apple-key-import': 'The Apple private key could not be imported as a P-256 signing key. Check that it is the unmodified Sign in with Apple .p8 file.',
        'apple-key-sign': 'The Apple private key was imported, but signing failed. The development signing configuration needs review.',
        'token-signature': 'The sign-in response signature could not be verified. Please try again.',
        'token-exchange': 'The sign-in response could not be validated. Please try again.',
        'account-storage': 'Sign-in was verified, but the account could not be saved. Please try again.',
      };
      setNotice(params.get('authError') === 'linked' ? 'That sign-in method belongs to another OpenCourts account. Sign in with it separately; accounts were not merged.' : reasons[params.get('reason') ?? ''] ?? 'Sign-in was cancelled or could not be verified. Please try again.');
      history.replaceState(null, '', '/account');
    }
    void reload(true);
    const focus = () => { void reload(); };
    window.addEventListener('focus', focus);
    return () => { ++generation.current; window.removeEventListener('focus', focus); };
  }, [reload]);
  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  function edit<K extends keyof typeof emptyProfile>(key: K, value: typeof emptyProfile[K]) {
    draftDirty.current = true; setDraft(previous => ({ ...previous, [key]: value }));
  }
  async function start(provider: Provider, link = false) {
    await run(async () => {
      const data = await accountRequest(`${provider}/start`, { method: 'POST', body: JSON.stringify({ link }) }, account?.csrfToken);
      const url = new URL(data.url);
      if (!['accounts.google.com','appleid.apple.com'].includes(url.hostname) || url.protocol !== 'https:') throw new Error('Sign-in is temporarily unavailable.');
      window.location.assign(url.href);
    });
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    await run(async () => {
      await accountRequest('me', { method: 'PATCH', body: JSON.stringify(draft) }, account?.csrfToken);
      draftDirty.current = false; await reload(true); setNotice('Your player profile has been saved.');
    });
  }
  async function logout(all: boolean) {
    await run(async () => { await accountRequest(all ? 'logout-all' : 'logout', { method: 'POST', body: '{}' }, account?.csrfToken); draftDirty.current = false; await reload(true); setNotice(all ? 'Signed out on all devices.' : 'You have been signed out.'); });
  }
  async function removeAccount() {
    await run(async () => { await accountRequest('me', { method: 'DELETE', body: JSON.stringify({ confirm: confirmation }) }, account?.csrfToken); setDeleteOpen(false); draftDirty.current = false; await reload(true); setNotice('Your OpenCourts account and profile have been deleted.'); });
  }
  const hasChanges = Boolean(account?.player) && Object.keys(emptyProfile).some(key => draft[key as keyof typeof emptyProfile] !== account!.player![key as keyof typeof emptyProfile]);
  return <div className={dark ? 'app dark' : 'app'}>
    <PlayTogetherHeader account/>
    <main className="pt-page">
      <a className="pt-back" href="/play-together"><ArrowLeft size={16}/> Back to Play Together</a>
      <div className="pt-heading"><span className="section-kicker">PLAY TOGETHER</span><h1>{account?.player ? 'Your player profile.' : 'Good tennis starts with good company.'}</h1><p>{account?.player ? 'A little about your game. One OpenCourts account, wherever you play.' : 'Create your free OpenCourts player account. Your next game starts here.'}</p></div>
      {notice && <div className="pt-message" role="status">{notice}</div>}
      {error && <div className="pt-message pt-error" role="alert">{error}<button type="button" className="pt-text-button" disabled={busy} onClick={() => { setLoading(true); void reload(true); }}>Try again</button></div>}
      {loading ? <div className="pt-panel pt-loading" role="status"><LoaderCircle className="search-spinner" size={22}/> Loading your account…</div> : !account?.player ? <div className="pt-layout">
        <section className="pt-panel" aria-labelledby="signin-title"><div className="pt-panel-icon"><UserRound size={22}/></div><h2 id="signin-title">Join the court community</h2><p>Sign in or create an account with your preferred service.</p>
          <div className="pt-provider-list">{(['google','apple'] as Provider[]).map(provider => <button className="pt-provider" key={provider} disabled={busy || !account?.providers[provider]} onClick={() => void start(provider)}><ProviderIcon provider={provider}/><span>Continue with {providerName[provider]}</span><ChevronRight size={17}/></button>)}</div>
          {account && (!account.providers.google || !account.providers.apple) && <p className="pt-help">Some sign-in options are not available in this environment yet. You can still explore courts without an account.</p>}
          <p className="pt-help">By continuing, you acknowledge our <a href="/privacy">privacy policy</a>. Your email address is never part of your player profile.</p>
        </section>
        <aside className="pt-panel pt-aside"><span className="section-kicker">YOUR GAME. YOUR COMMUNITY.</span><h2>A place for your tennis.</h2><ul><li><Check size={18}/> Free player accounts</li><li><Check size={18}/> One account across your devices</li><li><LockKeyhole size={18}/> Private email and secure sign-in</li></ul><p>Games and groups are being built next. All first-release Play Together features will be free.</p><a className="pt-back" href="/#explore">Find a court <ChevronRight size={16}/></a></aside>
      </div> : <div className="pt-layout">
        <section className="pt-panel" aria-labelledby="profile-title"><h2 id="profile-title">{account.player.displayName ? 'About your game' : 'Let’s introduce you'}</h2><p>Use a display name you’re comfortable sharing. Location and bio are optional; don’t include a private address or contact details.</p>
          <PhotoUpload kind="player" id={account.player.id} csrf={account.csrfToken??''}/><form className="pt-form" onSubmit={save}>
            <label>Display name <input required maxLength={60} autoComplete="nickname" value={draft.displayName} onChange={e => edit('displayName', e.target.value)}/></label>
            <LocationAutocomplete label="General location" value={draft.generalLocation} onChange={value=>edit('generalLocation',value)} help="Enter a city or ZIP code. Address suggestions save only the general city/area, never the street address."/>
            <label>Skill level <SiteSelect value={draft.skillLevel} onValueChange={value => edit('skillLevel', value)}><option value="unspecified">Prefer not to say</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></SiteSelect><span className="pt-help">Self-reported; you can change it anytime.</span></label>
            <label>About you <textarea rows={4} maxLength={500} value={draft.bio} onChange={e => edit('bio', e.target.value)} placeholder="What do you enjoy about tennis?"/></label>
            <label className="pt-check"><input type="checkbox" checked={draft.discoverable} onChange={e => edit('discoverable', e.target.checked)}/><span>Allow my profile to appear in player discovery.<small>Off by default. Group membership and private activities stay separate.</small></span></label>
            <button className="pt-primary" type="submit" disabled={busy || !hasChanges}>{busy ? <LoaderCircle size={17} className="search-spinner"/> : <Check size={17}/>} {busy ? 'Saving...' : hasChanges ? 'Save profile' : 'Profile saved'}</button>
          </form>
        </section>
        <aside className="pt-panel pt-aside"><ShieldCheck size={25}/><h2>Account & privacy</h2><p>Only Google and Apple are used to sign in. We don’t store a password for you.</p>
          <h3>Connected sign-in methods</h3><div className="pt-provider-list">{(['google','apple'] as Provider[]).map(provider => <div key={provider}>{account.connectedProviders.includes(provider) ? <div className="pt-connected"><ProviderIcon provider={provider}/><span className="pt-signin-identity"><strong>{providerName[provider]}</strong><small>{account.connectedAccounts?.find(a=>a.provider===provider)?.email??'Email not supplied by this provider'}</small></span><Check size={17}/></div> : <button className="pt-provider" disabled={busy || !account.providers[provider]} onClick={() => void start(provider, true)}><ProviderIcon provider={provider}/>Connect {providerName[provider]}<ChevronRight size={16}/></button>}</div>)}</div>
          <p className="pt-help">Your sign-in email is visible only to you. Apple may show a private relay address. Connect a second method while signed in to use the same account on other devices. Matching emails never merge accounts automatically. Sign in again if your session is older than 15 minutes.</p>
          <div className="pt-account-actions"><a className="pt-secondary" href="/play-together/players">Find players and safety settings</a><button className="pt-secondary" disabled={busy} onClick={() => void logout(false)}>Sign out</button><button className="pt-secondary" disabled={busy} onClick={() => void logout(true)}>Sign out on all devices</button></div>
          <div className="pt-delete"><h3>Delete account</h3><p className="pt-help">Permanently remove your profile, organized public games, sign-in connections and sessions. Transfer or archive owned groups first; your archived groups are deleted with your account. You must have signed in within the last 15 minutes.</p>
            {!deleteOpen ? <button className="pt-text-button" disabled={busy} onClick={() => setDeleteOpen(true)}>Delete my account</button> : <div className="pt-form"><label>Type DELETE to confirm<input value={confirmation} autoComplete="off" onChange={e => setConfirmation(e.target.value)}/></label><button className="pt-secondary" disabled={busy || confirmation !== 'DELETE'} onClick={() => void removeAccount()}>Permanently delete</button><button className="pt-text-button" disabled={busy} onClick={() => { setDeleteOpen(false); setConfirmation(''); }}>Keep my account</button></div>}
          </div>
        </aside>
      </div>}
      <div className="pt-footer"><a href="/privacy">Privacy policy</a><span>OpenCourts · Play Together</span></div>
    </main>
  </div>;
}
