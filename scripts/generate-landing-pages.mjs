import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ball = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M6 4.9c2.5 2.2 4 4.6 4 7.1s-1.5 4.9-4 7.1M18 4.9c-2.5 2.2-4 4.6-4 7.1s1.5 4.9 4 7.1" stroke="currentColor" stroke-width="1.5"/></svg>';
const guideIcons = {
  'best-time-to-play-tennis.html': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v2m4.93.93-1.41 1.41M20 12h2M2 12h2m4-7.07L6.59 6.34"/><path d="M12 9a4 4 0 0 1 4 4"/><path d="M7 18a4 4 0 0 1 1.8-7.6A6 6 0 0 1 19 15a3 3 0 0 1-1 5H8a3 3 0 0 1-1-2Z"/></svg>',
  'tennis-courts-after-rain.html': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 16.6A4.5 4.5 0 0 0 18 8a6 6 0 0 0-11.6 1.6A4.5 4.5 0 0 0 6 18"/><path d="M9 15v5m4-7v5m4-3v5"/></svg>',
  'public-tennis-courts-fairfax-va.html': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
};
const guideArrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>';
const pages = [
  {
    file: 'best-time-to-play-tennis.html', title: 'Best Time to Play Tennis | Seven-Day Weather Planner | OpenCourts',
    description: 'Compare daylight tennis play windows using rain chance, wind, temperature, and local forecasts. See what changes the OpenCourts play score.',
    social: 'social-play-weather.png', socialAlt: 'OpenCourts tennis weather share image with sun and weather factor labels.',
    photo: 'landing-weather.webp', photoAlt: 'Outdoor tennis court in warm morning light under a partly cloudy sky.',
    photoCaption: 'Illustrative photograph. Check the live forecast for your location.',
    kicker: 'TENNIS WEATHER', heading: 'Pick the hour, not just the day.',
    intro: 'The morning can be calm even when the afternoon turns windy. Compare daylight playing windows for your location, then see which conditions are pulling the score down.',
    primary: 'View the seven-day planner', primaryHref: '/#conditions',
    facts: [['7 days', 'of local forecast'], ['Daylight', 'playing windows'], ['Score factors', 'shown with each window']],
    detailKicker: 'READ THE FORECAST', detailTitle: 'A play score with context.',
    detailIntro: 'The number helps you compare times. The conditions beside it explain the tradeoffs.',
    details: [
      ['Rain chance', 'A low chance makes a small difference; a high chance lowers the score much more. Look at the percentage shown for the actual playing window.'],
      ['Temperature and wind', 'Temperatures from 60°F to 78°F have no temperature penalty. Wind up to 8 mph has no wind penalty. When humidity data is available, hot-weather scoring uses the estimated heat index.'],
      ['Winter conditions', 'Forecast snow or ice caps the play score at 20/100. The caution can continue after the forecast event, so check the court surface before playing.'],
    ],
    practicalKicker: 'MAKE A PLAN', practicalTitle: 'Choose a time, then a court.',
    practical: [
      ['Find your location', 'Search an address, city, or ZIP code so the forecast follows the place you plan to play.'],
      ['Compare nearby hours', 'Check the score, rain percentage, temperature, wind, and the listed score factors for each daylight window.'],
      ['Check the court', 'Use the map for access and amenities, then confirm local conditions before leaving.'],
    ],
    note: 'Play scores describe forecast conditions in an area. They do not measure a court surface or guarantee that play is safe.',
    closing: 'Find a good window. Then find a court.', secondary: 'Explore nearby courts', secondaryHref: '/#explore', relatedLabel: 'Best time to play',
  },
  {
    file: 'tennis-courts-after-rain.html', title: 'Tennis Courts After Rain | Compare Recent Radar Rain | OpenCourts',
    description: 'Check recent radar precipitation near tennis courts. Compare one-, three-, and six-hour estimates, then inspect the court before playing.',
    social: 'social-after-rain.png', socialAlt: 'OpenCourts after-rain share image with a rain cloud and radar time-window labels.',
    photo: 'landing-after-rain.webp', photoAlt: 'Wet outdoor tennis court reflecting the sky after a passing rain shower.',
    photoCaption: 'Illustrative photograph. Radar does not measure how dry a court surface is.',
    kicker: 'AFTER THE RAIN', heading: 'The rain stopped. Is the court ready?',
    intro: 'Rain can miss one court and soak another. Compare recent radar estimates around nearby courts to decide which places are worth checking first.',
    primary: 'Compare recent rain near courts', primaryHref: '/#rain-planner-title',
    facts: [['1 hour', 'recent radar estimate'], ['3 hours', 'recent radar estimate'], ['6 hours', 'recent radar estimate']],
    detailKicker: 'WHAT THE DATA MEANS', detailTitle: 'Radar narrows the search.',
    detailIntro: 'OpenCourts compares estimated precipitation at court locations. It cannot tell you whether the playing surface has dried.',
    details: [
      ['Compare readings', 'Look at the one-, three-, and six-hour estimates. When complete readings are available, courts with less recent estimated rain appear first.'],
      ['Check radar quality', 'The quality label describes whether readings are complete and consistent. It is not a confidence rating that a court is dry.'],
      ['Account for what radar misses', 'A new shower, shade, drainage, and court material can change conditions. Forecast snow and ice cautions are shown separately from radar scores.'],
    ],
    practicalKicker: 'BEFORE YOU PLAY', practicalTitle: 'Use the estimate, then inspect the court.',
    practical: [
      ['Start with the lower-rain locations', 'A lower estimate points you toward courts to check; it does not clear them for play.'],
      ['Look at the surface', 'Watch for standing water, slippery patches, and shaded areas that remain wet.'],
      ['Respect closures', 'Check venue notices or posted rules before using a court after rain.'],
    ],
    note: 'Radar samples precipitation over an area, not at the net. If readings are incomplete, OpenCourts may not show a court ranking.',
    closing: 'See which courts had less rain nearby.', secondary: 'Open the live comparison', secondaryHref: '/#rain-planner-title', relatedLabel: 'Courts after rain',
  },
  {
    file: 'public-tennis-courts-fairfax-va.html', title: 'Public Tennis Courts in Fairfax, VA | Map and Weather | OpenCourts',
    description: 'Find public tennis courts around Fairfax, Virginia. Start with verified city and county park locations, then compare mapped courts, amenities, recent rain, and forecast.',
    social: 'social-fairfax-courts.png', socialAlt: 'OpenCourts Fairfax tennis court share image with a location pin.',
    photo: 'landing-fairfax.webp', photoAlt: 'Illustrative view of outdoor tennis courts in a leafy suburban park; not a specific Fairfax park.',
    photoCaption: 'Illustrative photograph, not a photo of a named Fairfax park.',
    kicker: 'FAIRFAX, VIRGINIA', heading: 'Find a court around Fairfax.',
    intro: 'Start with three city and county parks that list tennis courts, or open the live map to compare courts across the Fairfax area by location, surface, access, and listed lights.',
    primary: 'Explore the Fairfax map', primaryHref: '/#explore', cityPreset: true,
    facts: [['3 parks', 'city and county listings'], ['Map + list', 'nearby court details'], ['Forecast', 'plan for local weather']],
    detailKicker: 'START HERE', detailTitle: 'Three Fairfax area parks with tennis courts.',
    detailIntro: 'Choose a park to see nearby courts on the live map. City and county listings are linked on each card so you can check official details before you visit.',
    places: [
      { name: 'Van Dyck Park', slug: 'van-dyck', address: '3720 Blenheim Boulevard, Fairfax, VA 22030', detail: 'The city lists tennis courts and parking at this park.', url: 'https://www.fairfaxva.gov/Fun-Facilities/Parks/Parks-Directory/Van-Dyck-Park' },
      { name: 'Providence Park', slug: 'providence', address: '10715 West Drive, Fairfax, VA 22030', detail: 'The city lists tennis courts and parking at this park.', url: 'https://www.fairfaxva.gov/Fun-Facilities/Parks/Parks-Directory/Providence-Park' },
      { name: 'Greenbriar Park', slug: 'greenbriar', address: '4600 Stringfellow Road, Fairfax, VA 22033', detail: 'Fairfax County lists two lighted tennis courts here, plus separate pickleball courts.', url: 'https://www.fairfaxcounty.gov/parks/node/819', linkLabel: 'County park locator' },
    ],
    practicalKicker: 'FIND YOUR COURT', practicalTitle: 'Check the details before you go.',
    practical: [
      ['Compare locations', 'Open the map or list, then search a Fairfax address or ZIP code to narrow the area.'],
      ['Review what is listed', 'Filter for confirmed public access, surface, distance, and lights. An unknown label means the detail has not been mapped.'],
      ['Check park rules', 'The city says its tennis courts are first come, first served except when scheduled activities use them. Check county guidance separately for Greenbriar.'],
    ],
    cityRulesUrl: 'https://www.fairfaxva.gov/Fun-Facilities/Parks',
    note: 'Court details in OpenCourts come from OpenStreetMap contributors and can be incomplete. The photograph is illustrative; use the city’s park pages and county park locator for official details.',
    closing: 'See courts, rain, and weather for Fairfax.', secondary: 'Open the Fairfax court map', secondaryHref: '/#explore', relatedLabel: 'Fairfax courts',
  },
];

function detailMarkup(page) {
  if (page.places) return `<div class="landing-places">${page.places.map(place => `<article><div><h3>${place.name}</h3><p>${place.address}</p><small>${place.detail}</small><a class="landing-source-link" href="${place.url}" target="_blank" rel="noopener noreferrer" data-analytics-event="landing_official_link_click" data-analytics-label="${place.name}">${place.linkLabel || 'City park details'}</a></div><a class="landing-park-link" href="/?park=${place.slug}#explore" data-analytics-event="landing_park_map_click" data-analytics-label="${place.name}">View nearby courts</a></article>`).join('')}</div>`;
  return `<div class="landing-detail-list">${page.details.map(([title, body]) => `<article><h3>${title}</h3><p>${body}</p></article>`).join('')}</div>`;
}

function render(page) {
  const url = `https://opencourts.us/${page.file}`;
  const image = `https://opencourts.us/${page.social}`;
  const cityPreset = page.cityPreset ? 'data-city-preset="fairfax-va"' : '';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#123d32" />
  <meta name="description" content="${page.description}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="OpenCourts" />
  <meta property="og:title" content="${page.title}" />
  <meta property="og:description" content="${page.description}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:secure_url" content="${image}" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${page.socialAlt}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${page.title}" />
  <meta name="twitter:description" content="${page.description}" />
  <meta name="twitter:image" content="${image}" />
  <meta name="twitter:image:alt" content="${page.socialAlt}" />
  <link rel="canonical" href="${url}" />
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <script src="/theme.js"></script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-7T3S2D1410"></script>
  <script>window.dataLayer = window.dataLayer || []; function gtag(){window.dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'G-7T3S2D1410');</script>
  <script defer src="/landing-analytics.js"></script>
  <link rel="stylesheet" href="/pages.css" />
  <link rel="stylesheet" href="/landing.css" />
  <title>${page.title}</title>
</head>
<body>
  <header class="page-header landing-header"><div class="page-header-inner">
    <a class="page-brand" href="/" aria-label="OpenCourts home" data-analytics-event="landing_nav_click" data-analytics-label="home"><span class="page-brand-mark">${ball}</span><span>open<span class="page-brand-light">courts</span></span></a>
    <nav id="landing-nav" class="landing-nav" aria-label="Main navigation"><a href="/#explore" data-analytics-event="landing_nav_click" data-analytics-label="explore">Explore courts</a><a href="/#conditions" data-analytics-event="landing_nav_click" data-analytics-label="weather">Weather</a><a href="/#about" data-analytics-event="landing_nav_click" data-analytics-label="about">About</a><a href="/support.html" data-analytics-event="landing_nav_click" data-analytics-label="support">Support</a></nav>
    <div class="landing-actions"><button type="button" data-near-me data-analytics-event="landing_near_me_click" data-analytics-label="near_me" class="landing-near"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg><span>Near me</span></button><button type="button" data-theme-toggle data-analytics-event="landing_theme_click" data-analytics-label="toggle" class="landing-theme" aria-label="Switch to dark mode"><svg class="landing-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg><svg class="landing-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-17.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg></button><button type="button" data-menu-toggle class="landing-menu" aria-label="Toggle menu" aria-expanded="false" aria-controls="landing-nav"><svg class="landing-menu-open" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg><svg class="landing-menu-close" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
  </div></header>
  <main class="landing-main">
    <section class="landing-hero"><div class="landing-copy"><p class="landing-kicker">${page.kicker}</p><h1>${page.heading}</h1><p class="landing-intro">${page.intro}</p><a class="landing-primary" href="${page.primaryHref}" ${cityPreset} data-analytics-event="landing_cta_click" data-analytics-label="primary">${page.primary}</a></div><figure class="landing-photo"><img src="/${page.photo}" alt="${page.photoAlt}" width="1280" height="853" fetchpriority="high"/><figcaption>${page.photoCaption}</figcaption></figure></section>
    <div class="landing-facts" aria-label="At a glance">${page.facts.map(([strong, label]) => `<div><strong>${strong}</strong><span>${label}</span></div>`).join('')}</div>
    <section class="landing-detail" aria-labelledby="detail-title"><div class="landing-detail-heading"><p class="landing-kicker">${page.detailKicker}</p><h2 id="detail-title">${page.detailTitle}</h2><p>${page.detailIntro}</p></div>${detailMarkup(page)}</section>
    <section class="landing-practical" aria-labelledby="practical-title"><div class="landing-practical-heading"><p class="landing-kicker">${page.practicalKicker}</p><h2 id="practical-title">${page.practicalTitle}</h2></div><div class="landing-steps">${page.practical.map(([title, body], index) => `<article><span>0${index + 1}</span><div><h3>${title}</h3><p>${body}${page.cityRulesUrl && index === 2 ? ` <a class="landing-text-link" href="${page.cityRulesUrl}" target="_blank" rel="noopener noreferrer" data-analytics-event="landing_official_link_click" data-analytics-label="city_court_rules">Read city court guidance</a>.` : ''}</p></div></article>`).join('')}</div></section>
    <p class="landing-caveat">${page.note}</p>
    <section class="landing-next"><div><p class="landing-kicker">PLAN WITH OPENCOURTS</p><h2>${page.closing}</h2></div><a href="${page.secondaryHref}" ${cityPreset} data-analytics-event="landing_cta_click" data-analytics-label="secondary">${page.secondary}</a></section>
    <nav class="landing-related" aria-label="More OpenCourts guides"><span class="landing-related-label">More guides</span><div class="landing-related-links">${pages.filter(other => other.file !== page.file).map(other => `<a href="/${other.file}" data-analytics-event="landing_related_click" data-analytics-label="${other.file}">${guideIcons[other.file]}<span>${other.relatedLabel}</span>${guideArrow}</a>`).join('')}</div></nav>
  </main>
  <footer class="page-footer"><a class="page-brand" href="/" aria-label="OpenCourts home"><span class="page-brand-mark">${ball}</span><span>open<span class="page-brand-light">courts</span></span></a><span>Find Your Court. Play Your Game.</span><nav class="page-footer-nav" aria-label="Footer"><a href="/support.html">Support</a><a href="/about.html">About</a><a href="/privacy.html">Privacy</a><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Data &amp; attribution</a><a href="/contact.html">Contact</a></nav><span class="page-copyright">© 2026 OpenCourts</span></footer>
</body>
</html>
`;
}

for (const page of pages) writeFileSync(resolve(root, 'public', page.file), render(page));
