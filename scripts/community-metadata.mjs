export const communityRoutes = {
 '/play-together': ['Find Tennis Games & Players | OpenCourts Play Together','Find tennis games, meet players and organize local tennis groups with OpenCourts Play Together.',true],
 '/play-together/groups': ['Find Tennis Groups | OpenCourts Play Together','Discover local tennis groups, request membership and organize games with your tennis community.',true],
 '/account': ['Your Account | OpenCourts','Manage your OpenCourts profile, sign-in methods, privacy choices and notifications.'],
 '/play-together/create': ['Create a Tennis Game | OpenCourts','Organize a tennis game and invite players.'],
 '/play-together/game': ['Tennis Game | OpenCourts','View a tennis game with your current access.'],
 '/play-together/my-games': ['My Games | OpenCourts','Manage your tennis schedule and requests.'],
 '/play-together/my-groups': ['My Groups | OpenCourts','View your tennis group memberships.'],
 '/play-together/create-group': ['Create a Tennis Group | OpenCourts','Organize your tennis community.'],
 '/play-together/group': ['Tennis Group | OpenCourts','View a tennis group with your current access.'],
 '/play-together/invitation': ['Group Invitation | OpenCourts','Review a tennis group invitation.'],
 '/play-together/game-invitation': ['Game Invitation | OpenCourts','Review a tennis game invitation.'],
 '/play-together/feed': ['Your Tennis Feed | OpenCourts','View activity from your tennis groups and games.'],
 '/play-together/players': ['Find Tennis Players | OpenCourts','Sign in to find players who choose to be discoverable.'],
 '/play-together/notifications': ['Notifications | OpenCourts','Review your private tennis activity notifications.'],
 '/play-together/manage-series': ['Manage Tennis Schedule | OpenCourts','Manage dates for your tennis games.'],
};
const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
export function communityHtml(html,path){
 const [title,description,indexable]=communityRoutes[path];const url='https://opencourts.us'+path;
 let result=html.replace(/<title>.*?<\/title>/,`<title>${escape(title)}</title>`)
  .replace(/(<meta (?:name="description"|property="og:description"|name="twitter:description") content=")[^"]*("\s*\/>)/g,(_,a,b)=>a+escape(description)+b)
  .replace(/(<meta (?:property="og:title"|name="twitter:title") content=")[^"]*("\s*\/>)/g,(_,a,b)=>a+escape(title)+b)
  .replace(/(<meta property="og:url" content=")[^"]*("\s*\/>)/,`$1${url}$2`)
  .replace(/(<link rel="canonical" href=")[^"]*("\s*\/>)/,`$1${url}$2`)
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,'');
 result=result.replace('</head>',`<meta name="robots" content="${indexable?'index,follow':'noindex,follow'}" />\n</head>`);
 return result;
}
