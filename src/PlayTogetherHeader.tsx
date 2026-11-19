import {focusSearch} from './search-focus';
import AccountAvatar from './AccountAvatar';
import NotificationBell from './NotificationBell';
import { CalendarDays, MapIcon, Rss, Search, UserRound, UsersRound } from 'lucide-react';
import TennisBall from './TennisBall';

export default function PlayTogetherHeader({ account = false }: { account?: boolean }) {
  const path = window.location.pathname.replace(/\/$/, '');
  const tabs = [
    { href: '/play-together/feed', label: 'Feed', Icon: Rss, active: path.endsWith('/feed') },
    { href: '/play-together', label: 'Find games', Icon: Search, active: path === '/play-together' || path.endsWith('/create') || path.endsWith('/game'), search: true },
    { href: '/play-together/my-games', label: 'My Games', Icon: CalendarDays, active: path.endsWith('/my-games') },
    { href: '/play-together/groups', label: 'Groups', Icon: UsersRound, active: /\/(groups|group|my-groups|create-group|invitation)$/.test(path) },
    { href: '/play-together/players', label: 'Players', Icon: UserRound, active: path.endsWith('/players') },
  ];
  return <><header className="topbar">
    <a className="brand" href="/" aria-label="OpenCourts home"><span className="brand-mark"><TennisBall size={20}/></span><span>open<span className="brand-light">courts</span></span></a>
    <nav className="nav" aria-label="Main navigation"><a href="/#explore">Courts</a>{tabs.map(({href,label,active})=><a key={href} href={href==='/play-together'?href+'#search':href} aria-current={active?'page':undefined}>{label}</a>)}</nav>
    <div className="top-actions"><a className="site-area-switch" href="/#explore"><MapIcon size={17} aria-hidden="true"/><span>Courts</span></a><NotificationBell/><a className="pt-account-link" href="/account" aria-label="Account and settings" aria-current={account || path==='/account' ? 'page' : undefined}><AccountAvatar/></a></div>
  </header><nav className="mobile-bottom-nav pt-bottom-nav" aria-label="Play Together quick navigation">
    {tabs.map(({href,label,Icon,active,search})=><a key={href} href={search?href+'#search':href} onClick={e=>{if(search&&path==='/play-together'&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){e.preventDefault();focusSearch();}}} className={`${search?'mobile-nav-search ':''}${active?'active':''}`} aria-current={active?'page':undefined}><span><Icon size={21} strokeWidth={1.9} aria-hidden="true"/></span><span>{label}</span></a>)}
  </nav></>;
}
