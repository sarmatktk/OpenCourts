import tokyo from '../data/international/tokyo.json';
import paris from '../data/international/paris.json';

type Bounds = { south: number; west: number; north: number; east: number };

/** Read-only regional snapshots; never used for US requests. */
export function findBundledInternationalCourts(countryCode: string, bounds: Bounds) {
  for (const catalog of [tokyo, paris]) {
    if (countryCode !== catalog.countryCode) continue;
    const elements = catalog.elements.filter(court => court.lat >= bounds.south && court.lat <= bounds.north
      && court.lon >= bounds.west && court.lon <= bounds.east);
    // An absent mapped feature is not proof of coverage. Uncovered searches can
    // still try D1 and live providers, without returning another city's courts.
    if (!elements.length) continue;
    return { elements, catalog: { region: catalog.region, source: catalog.source, sourceUrl: catalog.sourceUrl,
      sourceUpdatedAt: catalog.sourceUpdatedAt, attributionUrl: catalog.attributionUrl, license: catalog.license } };
  }
  return undefined;
}
