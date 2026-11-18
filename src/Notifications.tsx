import HostNotifications from './HostNotifications';
import PlayTogetherShell from './PlayTogetherShell';
export default function Notifications(){return <PlayTogetherShell><div className="pt-heading"><h1>Your inbox</h1><p>Game requests, group updates and decisions in one place.</p><a className="pt-secondary" href="/play-together/my-games">My Games</a></div><HostNotifications/></PlayTogetherShell>;}
