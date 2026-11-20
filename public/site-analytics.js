/* Enhanced measurement must remain OFF in the GA web stream (owner confirmed).
 * Explicit events only. Never add form contents, identity, queries or fragments.
 */
(() => {
  if (!['opencourts.us', 'www.opencourts.us'].includes(location.hostname) || window.__openCourtsAnalyticsLoaded) return;
  window.__openCourtsAnalyticsLoaded = true;
  const measurementId = 'G-7T3S2D1410';
  const pages = {
    '/': 'Court finder', '/about': 'About', '/contact': 'Contact', '/privacy': 'Privacy',
    '/terms': 'Terms', '/delete-account': 'Delete account', '/support': 'Support',
    '/play-together-help': 'Help and safety', '/account': 'Account',
    '/play-together': 'Play Together', '/play-together/groups': 'Find groups',
    '/play-together/my-groups': 'My groups', '/play-together/create-group': 'Create group',
    '/play-together/group': 'Group details', '/play-together/create': 'Create game',
    '/play-together/game': 'Game details', '/play-together/my-games': 'My games',
    '/play-together/feed': 'Personal feed', '/play-together/players': 'Find players',
    '/play-together/notifications': 'Notifications', '/play-together/manage-series': 'Manage series',
    '/play-together/invitation': 'Group invitation', '/play-together/game-invitation': 'Game invitation',
    '/best-time-to-play-tennis': 'Tennis weather guide', '/tennis-courts-after-rain': 'Tennis rain guide',
    '/public-tennis-courts-fairfax-va': 'Fairfax courts', '/public-tennis-courts-los-angeles': 'Los Angeles courts',
    '/public-tennis-courts-atlanta': 'Atlanta courts', '/public-tennis-courts-dallas': 'Dallas courts',
    '/public-tennis-courts-miami': 'Miami courts',
  };
  const path = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  const route = Object.hasOwn(pages, path) ? path : '/404';
  const safePage = {page_location: 'https://opencourts.us' + route, page_referrer: '', page_title: (pages[route] || 'Page not found') + ' | OpenCourts'};
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('set', safePage);
  window.gtag('config', measurementId, {...safePage, send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false});
  window.gtag('event', 'page_view', {...safePage, send_to: measurementId});
  const script = document.createElement('script');
  script.async = true;
  script.referrerPolicy = 'no-referrer';
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
  document.head.appendChild(script);
})();
