import AccountAvatar from './AccountAvatar';
import NotificationBell from './NotificationBell';
import { useState } from 'react';
import { CalendarDays, ListIcon, Menu, Rss, Search, UsersRound, X } from 'lucide-react';
import TennisBall from './TennisBall';

export default function PlayTogetherHeader({ account = false }: { account?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const path = window.location.pathname.replace(/\/$/, '');
  const tabs = [
    { href: '/#explore', label: 'Courts', Icon: ListIcon, active: false },
    { href: '/play-together/feed', label: 'My Feed', Icon: Rss, active: path.endsWith('/feed') },
    { href: '/play-together', label: 'Find games', Icon: Search, active: path === '/play-together' || path.endsWith('/create') || path.endsWith('/game'), featured: true },
    { href: '/play-together/my-games', label: 'My Games', Icon: CalendarDays, active: path.endsWith('/my-games') },
    { href: '/play-together/groups', label: 'Groups', Icon: UsersRound, active: /\/(groups|group|my-groups|create-group|invitation)$/.test(path) },
  ];
  return <><header className="topbar">
    <a className="brand" href="/" aria-label="OpenCourts home"><span className="brand-mark"><TennisBall size={20}/></span><span>open<span className="brand-light">courts</span></span></a>
    <nav className={menuOpen ? 'nav open' : 'nav'} aria-label="Main navigation"><a href="/#explore">Explore courts</a><a href="/#conditions">Weather</a><a href="/play-together" aria-current={tabs[2].active ? 'page' : undefined} onClick={() => setMenuOpen(false)}>Play Together</a><a href="/play-together/feed" aria-current={tabs[1].active ? 'page' : undefined}>My Feed</a><a href="/play-together/my-games" aria-current={tabs[3].active ? 'page' : undefined}>My Games</a><a href="/play-together/groups" aria-current={tabs[4].active ? 'page' : undefined}>Groups</a><a href="/play-together/players" aria-current={path.endsWith('/players') ? 'page' : undefined}>Players</a><a href="/support">Support</a></nav>
    <div className="top-actions"><NotificationBell/><a className="pt-account-link" href="/account" aria-label="Account and settings" aria-current={account || path==='/account' ? 'page' : undefined}><AccountAvatar/></a><button className="mobile-menu" aria-label="Toggle menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X/> : <Menu/>}</button></div>
  </header><nav className="mobile-bottom-nav pt-bottom-nav" aria-label="Play Together quick navigation">
    {tabs.map(({href,label,Icon,active,featured})=><a key={href} href={href} className={`${featured?'mobile-nav-search ':''}${active?'active':''}`} aria-current={active?'page':undefined}><span className={featured?'mobile-nav-search-icon':undefined}><Icon size={featured?23:21} strokeWidth={featured?2.2:1.9} aria-hidden="true"/></span><span>{label}</span></a>)}
  </nav></>;
}
