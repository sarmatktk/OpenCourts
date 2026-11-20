document.addEventListener('click', event => {
  const target = event.target instanceof Element ? event.target.closest('[data-analytics-event]') : null;
  if (!target || typeof window.gtag !== 'function') return;
  window.gtag('event', target.dataset.analyticsEvent, {
    landing_page: window.location.pathname,
    action_label: target.dataset.analyticsLabel || '',
    destination: target.getAttribute('href') ? new URL(target.getAttribute('href'), location.origin).origin + new URL(target.getAttribute('href'), location.origin).pathname : undefined,
    transport_type: 'beacon',
  });
});
