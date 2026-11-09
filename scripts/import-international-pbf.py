"""Extract a small, attributed international tennis catalog from an OSM PBF.

Requires osmium 4.3.2 (import tooling only). Reads the file twice to retain only
node locations needed by tennis features and named containing parks/schools.
Does not access D1 or change any US catalog records.
"""
import argparse
import hashlib
import json
from pathlib import Path
import osmium


def is_court(tags):
    return tags.get('leisure') in ('pitch', 'sports_centre') and 'tennis' in tags.get('sport', '').split(';')


def is_place(tags):
    return bool(tags.get('name')) and (tags.get('leisure') in ('park', 'recreation_ground') or tags.get('amenity') in ('school', 'college', 'university'))


def contains(point, ring):
    x, y = point
    inside = False
    for a, b in zip(ring, ring[1:] + ring[:1]):
        if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]:
            inside = not inside
    return inside


class Features(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.courts = []
        self.places = []
        self.refs = set()

    def node(self, node):
        if is_court(node.tags) and node.location.valid():
            self.courts.append(dict(type='node', id=node.id, lon=node.location.lon, lat=node.location.lat, tags=dict(node.tags)))

    def way(self, way):
        court = is_court(way.tags)
        if not court and not is_place(way.tags):
            return
        tags = dict(way.tags)
        refs = [n.ref for n in way.nodes]
        self.refs.update(refs)
        (self.courts if court else self.places).append(dict(type='way', id=way.id, tags=tags, refs=refs))


class Locations(osmium.SimpleHandler):
    def __init__(self, refs):
        super().__init__()
        self.refs = refs
        self.points = {}

    def node(self, node):
        if node.id in self.refs and node.location.valid():
            self.points[node.id] = (node.location.lon, node.location.lat)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--region', required=True)
    parser.add_argument('--country', required=True)
    parser.add_argument('--source-url', required=True)
    parser.add_argument('--source-updated', required=True, help='Verified upstream Last-Modified date in ISO format')
    args = parser.parse_args()
    features = Features()
    print('Reading tennis features and named park/school boundaries...', flush=True)
    with osmium.io.Reader(args.input) as reader:
        osmium.apply(reader, osmium.filter.KeyFilter('sport', 'leisure', 'amenity'), features)
    print(f'Found {len(features.courts)} tennis features; resolving {len(features.refs)} node references...', flush=True)
    locations = Locations(features.refs)
    with osmium.io.Reader(args.input) as reader:
        osmium.apply(reader, osmium.filter.IdFilter(features.refs), locations)
    polygons = []
    for place in features.places:
        refs = place['refs']
        if len(refs) >= 4 and refs[0] == refs[-1] and all(ref in locations.points for ref in refs):
            ring = [locations.points[ref] for ref in refs]
            bounds = (min(p[0] for p in ring), min(p[1] for p in ring), max(p[0] for p in ring), max(p[1] for p in ring))
            polygons.append((place['tags']['name'], ring, bounds))
    elements = []
    skipped = 0
    for court in features.courts:
        if court['type'] == 'way':
            refs = court.pop('refs')
            if not refs or any(ref not in locations.points for ref in refs):
                skipped += 1
                continue
            points = [locations.points[ref] for ref in refs]
            court['lon'] = (min(p[0] for p in points) + max(p[0] for p in points)) / 2
            court['lat'] = (min(p[1] for p in points) + max(p[1] for p in points)) / 2
        for name, ring, (west, south, east, north) in polygons:
            if west <= court['lon'] <= east and south <= court['lat'] <= north and contains((court['lon'], court['lat']), ring):
                court['tags']['opencourts:nearby_place'] = name
                court['tags']['opencourts:context_version'] = '2'
                break
        elements.append(court)
    if not elements:
        raise ValueError('No tennis courts found; refusing to overwrite the catalog')
    elements.sort(key=lambda court: (court['type'], court['id']))
    data = dict(region=args.region, countryCode=args.country.lower(), source='OpenStreetMap contributors via BBBike',
                sourceUrl=args.source_url, sourceUpdatedAt=args.source_updated, license='ODbL-1.0',
                attributionUrl='https://www.openstreetmap.org/copyright',
                sourceSha256=hashlib.sha256(Path(args.input).read_bytes()).hexdigest(),
                note='Mapped tennis nodes and ways; not a complete inventory or a guarantee of public access.', elements=elements)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Imported {len(elements)} tennis features; skipped {skipped} incomplete geometries. Output: {output}')


if __name__ == '__main__':
    main()
