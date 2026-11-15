# Next city landing pages: research and editorial priorities

Researched November 14, 2026. This is a planning brief, not published landing-page
copy or a ranking of cities by tennis participation.

## Recommendation

Start with **Los Angeles and Atlanta**. Prepare Dallas next once its free park
court details are independently verified. London is the first international
candidate, conditional on its published map and forecast working reliably.

These priorities reflect alignment with OpenCourts, authoritative information
available for useful original content, and a distinctive page topic. They are
**not based on measured keyword volumes, SEO difficulty scores, or a forecast of
traffic**. Search Console, Google Ads keyword estimates, and conversion data were
not available for this assessment. No such metrics have been invented.

## Ranked shortlist

| Priority | City | Proposed page | Main reason and limitation |
| --- | --- | --- | --- |
| 1 | Los Angeles | Free Public Tennis Courts in Los Angeles | Official open-play guidance offers a specific, useful page angle. Separate free courts from paid reservation facilities and distinguish LA city from nearby municipalities. |
| 2 | Atlanta | Public Tennis Courts in Atlanta: Free Play and Reservations | The city explains free first-come play and reservations; a substantial league community is documented by USTA Atlanta. Distinguish city park courts from racquet centers and private neighborhood facilities. |
| 3 | Dallas | Public Tennis Courts in Dallas: Parks, Lights and Booking | City sources identify five full-service public tennis centers, but public does not mean free. Verify free park alternatives before promising them in a title. Keep Dallas separate from Plano, Richardson and other suburbs. |
| 4 | London | Public Tennis Courts in London: Parks and Booking | English-language international expansion with LTA park-tennis guidance. Borough rules and operators differ; a free organized session does not establish free unrestricted court use. Published API reliability is a release gate. |
| 5 | Miami | Public Tennis Courts in Miami: Parks and Court Rules | Strong opportunity to explain locations and conditions clearly. Miami, Miami Beach, and Miami-Dade County have different authorities. Do not combine their facilities under a single fee or reservation policy. |
| 6 | New York City | NYC Tennis Courts: Permits and Public Access | Useful permit-guide topic, but a weaker fit for a finder that excludes tagged fee/permit courts. Explain this limitation before sending visitors to the map. Public courts must not be advertised as universally free. |

The order is an editorial judgment. It does not establish that Los Angeles has
more players than Atlanta or that one page will attract more search traffic.

## Evidence and page briefs

### 1. Los Angeles

The city distinguishes open-play courts from reservation courts. Its Riverside
facility page describes open play as free and first come, first served. USTA
Southern California reports growth to 2.6 million players across its section;
that regional figure is not an LA city participation count.

Sources:

- [LA Riverside court and open-play policy](https://recreation.parks.lacity.gov/sports/tennis/facility/riverside)
- [LA permits and reservations](https://recreation.parks.lacity.gov/sports/tennis/permits)
- [City court rules](https://recreation.parks.lacity.gov/sites/default/files/sports/tennis/pdf/rules_regs.pdf)
- [USTA Southern California participation context](https://ustasocal.com/news/southern-california-us-open-tennis-legacy/)

Target topics: `free tennis courts Los Angeles`, `public tennis courts Los Angeles`,
`Los Angeles open play tennis courts`. These are suggested query themes, not
verified search-volume estimates.

Include verified free-play examples, neighborhood/address, listed lighting,
official rules, and a city-centered map link. Explain how free play differs from
reservations. Do not infer tennis operating hours from general park hours.

### 2. Atlanta

USTA Atlanta states that it administers the largest USTA League and Junior Team
Tennis league programs in the country. That supports an active community, not a
count of all Atlanta players. The city describes a free first-come option for
park courts and provides separate reservation guidance.

Sources:

- [USTA Atlanta community context](https://www.ustaatlanta.com/about/)
- [City of Atlanta tennis and park-court guidance](https://www.atlantaga.gov/government/departments/department-parks-recreation/office-of-parks/city-of-atlanta-tennis)

Target topics: `public tennis courts Atlanta`, `free tennis courts Atlanta`,
`Atlanta tennis courts with lights`.

Include three to five independently verified city park locations. Explain
walk-up play versus reservations, shared-use restrictions, and the difference
between park courts, city racquet centers, and membership facilities. Link to
official sources instead of reproducing unverified current fees.

### 3. Dallas

Dallas Parks identifies five full-service public tennis centers and publishes a
fee-information link. The L.B. Houston facility page lists 16 lighted courts.
Neither fact proves that all Dallas park courts are free.

Sources:

- [Dallas public tennis centers](https://www.dallasparks.org/281/3160/Tennis-Centers)
- [L.B. Houston Tennis Center](https://www.dallasparks.org/facilities/facility/details/LB-Houston-Tennis-Center-52)

Target topics: `public tennis courts Dallas`, `Dallas tennis courts with lights`,
`Dallas park tennis courts`.

Before writing a free-court guide, verify individual park policies. A general
Dallas page can explain the distinction between public paid centers and park
facilities, but the current app must not be described as listing every paid center.

### 4. London

The LTA offers a London-specific tennis guide and organized free park-tennis
sessions. These are a useful starting point for local research, not proof of
uniform London-wide booking rules or unrestricted free court access.

Sources:

- [LTA London guide](https://www.lta.org.uk/play/tennis-near-you/london/)
- [LTA Park Tennis Project](https://www.lta.org.uk/what-we-do/park-tennis-project/)

Target topics: `public tennis courts London`, `London park tennis courts`,
`book a park tennis court London`.

Keep the initial guide focused on a few named boroughs with verified operator
links. Use international forecast-estimate language; do not promise NOAA radar or
court-surface dryness measurements. Test the deployed map and forecast before
publishing or promoting this page.

A fresh read-only check on November 14 against `https://opencourts.pages.dev`
passed for London's court and weather APIs: Geoapify returned 54 raw court records
in about 2.2 seconds, and WeatherAPI returned 72 forecast periods. This updates the
older failed-production observations from November 8, but does not establish
complete coverage, filtered court totals, every-country health, or working CTA
behavior in a future landing page.

### 5. Miami

The City of Miami lists tennis at Margaret Pace Park. Miami-Dade County separately
lists eight lighted courts at Continental Park. Miami Beach publishes its own
tennis-center and booking guidance. These are three distinct jurisdictions.

Sources:

- [City of Miami: Margaret Pace Park](https://www.miami.gov/Parks-Public-Places/Parks-Directory/Margaret-Pace-Park)
- [Miami-Dade County: Continental Park](https://www.miamidade.gov/global/recreation/park/continental-park.page)
- [City of Miami Beach tennis centers](https://www.miamibeachfl.gov/city-hall/parks-and-recreation/sports-centers-fields-and-courts/tennis-centers/)

Target topics: `public tennis courts Miami`, `Miami tennis courts with lights`.
Give Miami Beach a separate section or future page. Verify availability and
booking directly; avoid claiming that a mapped public facility has no fee.

### 6. New York City

NYC311 explains the Parks tennis permit system and seasonal rules. The Central
Park Conservancy lists 26 clay and four hard public courts at Central Park.
Those courts require the relevant Parks permit; their existence does not imply
that OpenCourts' current eligibility filters will show them.

Sources:

- [NYC311 tennis permits](https://portal.311.nyc.gov/article/?kanumber=KA-03053)
- [Central Park Conservancy tennis facilities](https://www.centralparknyc.org/activities/guides/tennis)

Target topics: `NYC tennis permits`, `how to play public tennis NYC`,
`public tennis courts NYC`.

Start as an informational permit/access guide, with official booking links. Do
not promise a complete NYC court inventory or label paid public facilities free.
Do not change US eligibility filters merely to support a landing page.

## Publication gates

For each chosen city:

1. Verify three to five named facilities from official sources, including access,
   fees/reservations, address, surface, and lighting where actually documented.
2. Test its map CTA against the deployed API and ensure it opens that city.
3. Clearly distinguish confirmed information from unknown details. Do not claim
   live court availability, complete coverage, or measured surface dryness.
4. Give the page unique useful content, title, description, canonical URL,
   crawlable internal links, and sitemap entry. Use a real content review date.
5. Preserve existing US court, weather, radar, scoring, and filtering behavior.

## Measurement after launch

Publish a small first batch. Compare Search Console impressions, queries,
clicks, and indexing over roughly six to eight weeks; low early traffic is not
proof a page has no potential. Track city-page map CTA clicks and successful
court-result loads separately. Check mobile usability and provider errors.

The existing site contains GA4 tagging and landing-page analytics hooks, but
their appearance in code does not prove live reporting is configured correctly.
Do not fabricate conversion rates or treat city population as keyword demand.
Expand only when reliable usage and search data identify the next opportunity.
