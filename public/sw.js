// Network-only worker: registration supports installation without caching live court data.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

// Fixed type-specific wording: never display arbitrary names, reasons or addresses from payloads.
const notificationMessages = {
 chat_message: 'You have new chat messages.',
 game_invited: 'You have received a game invitation.',
 requested: 'A player has requested to join your game.',
 withdrawn: 'A player withdrew their request to join your game.',
 approved: 'Your request to join a game was approved.',
 rejected: 'Your request to join a game was declined.',
 removed: 'You have been removed from a game.',
 game_cancelled: 'A game you are involved in has been cancelled.',
 cancelled: 'A player cancelled their place in your game.',
 guest_requested: 'You have a new guest request to review.',
 guest_approved: 'Your guest request was approved.',
 guest_rejected: 'Your guest request was declined.',
 guest_cancelled: 'A player cancelled their guest places.',
 discussion_post: 'Your group has a new post from an organizer.',
 discussion_reply: 'Someone replied to a group discussion you follow.',
  group_requested: 'You have a new group membership request to review.',
 group_active: 'Your group membership request was approved.',
 group_rejected: 'Your group membership request was declined.',
 group_removed: 'Your membership in a group has ended.',
 group_archived: 'A group you belong to has been archived.',
 schedule_changed: 'The time of a game you are involved in has changed.',
 game_reminder_24h: 'Reminder: Your game starts in about 24 hours.',
 game_reminder_3h: 'Reminder: Your game starts in about 3 hours.',
 waitlist_offer: 'A waitlist spot is available. Open OpenCourts to review your offer.',
};
function notificationTarget(target) {
  if (target && ['game','group'].includes(target.type) && typeof target.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target.id)) {
    return '/play-together/' + target.type + '?id=' + encodeURIComponent(target.id)+(target.type==='game'&&target.chat===true?'#chat':target.type==='group'&&typeof target.postId==='string'&&/^[0-9a-f-]{36}$/i.test(target.postId)?'#discussion-'+target.postId:'');
  }
  return '/play-together/notifications';
}
self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let payload = {};
    try { const data = event.data?.json(); payload = data && typeof data === 'object' ? data : {}; } catch { /* Always display a safe fallback. */ }
    await self.registration.showNotification('OpenCourts', {
      body: Object.prototype.hasOwnProperty.call(notificationMessages, payload.kind) ? notificationMessages[payload.kind] : 'You have a tennis activity update. Open OpenCourts to view it.',
      icon: '/android-chrome-192x192.png', badge: '/notification-badge.svg',
      tag: typeof payload.tag === 'string' ? payload.tag.slice(0, 100) : 'opencourts-update',
      data: {target: payload.target && {type:payload.target.type,id:payload.target.id,chat:payload.kind==='chat_message',postId:payload.target.postId}},
    });
  })());
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const url = new URL(notificationTarget(event.notification.data?.target), self.location.origin).href;
    const clients = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
    for (const client of clients) {
      if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
        await client.navigate(url); await client.focus(); return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
