import ManageSeries from './ManageSeries';
import CommunityLanding from './CommunityLanding';
import Notifications from './Notifications';
import Players from './Players';
import GameInvitation from './GameInvitation';
import PersonalFeed from './PersonalFeed';
import GroupInvitation from './GroupInvitation';
import Groups from './Groups';
import GroupDetails from './GroupDetails';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import PlayerAccount from './PlayerAccount';
import PlayTogether from './PlayTogether';
import CreateGame from './CreateGame';
import MyGames from './MyGames';
import GameDetails from './GameDetails';
import './styles.css';
import 'maplibre-gl/dist/maplibre-gl.css';

const path = location.pathname.replace(/\/$/, '');
const playTogetherEnabled = import.meta.env.DEV || import.meta.env.VITE_PLAY_TOGETHER === 'true';
const communityPage = path === '/play-together/manage-series' ? <ManageSeries/> : path === '/play-together/notifications' ? <Notifications/> : path === '/play-together/players' ? <Players/> : path === '/play-together/game-invitation' ? <GameInvitation/> : path === '/play-together/feed' ? <PersonalFeed/> : path === '/play-together/invitation' ? <GroupInvitation/> : ['/play-together/groups','/play-together/my-groups','/play-together/create-group'].includes(path) ? <Groups/> : path === '/play-together/group' ? <GroupDetails/> : path === '/account' ? <PlayerAccount/> : path === '/play-together/my-games' ? <MyGames/> : path === '/play-together/create' ? <CreateGame/> : path === '/play-together/game' ? <GameDetails/> : path === '/play-together' ? (location.hash||location.search?<PlayTogether/>:<CommunityLanding/>) : null;
const communityTitles:Record<string,string>={"/play-together/manage-series":"Manage series","/account": "Your account", "/play-together": "Find games", "/play-together/feed": "Your tennis feed", "/play-together/my-games": "My Games", "/play-together/notifications": "Notifications", "/play-together/players": "Find players", "/play-together/groups": "Find groups", "/play-together/my-groups": "My Groups", "/play-together/create-group": "Create group", "/play-together/group": "Group details", "/play-together/create": "Create game", "/play-together/game": "Game details", "/play-together/invitation": "Group invitation", "/play-together/game-invitation": "Game invitation"};
if(playTogetherEnabled && communityPage)document.title=communityTitles[path]+" \u00b7 OpenCourts";
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode>{playTogetherEnabled && communityPage ? communityPage : <App />}</React.StrictMode>);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}
