# Imported international court catalogs

These read-only OpenStreetMap snapshots let covered international court searches
work when public live providers are unavailable. US requests do not use them.

`tokyo.json` and `paris.json` are extracted from their BBBike city OSM PBFs. Each contains mapped tennis
nodes and ways, retaining original OSM IDs, coordinates, tags, and restricted/fee
access information. Names of containing named park/school ways are added as
context where available. Relations are not imported by this small importer.
Coverage is limited to the source extract; this is not a complete court inventory
or a guarantee of public access. Existing court access filters still apply.

Source: https://download.bbbike.org/osm/bbbike/Tokyo/

Paris source: https://download.bbbike.org/osm/bbbike/Paris/

Map data © OpenStreetMap contributors, available under ODbL 1.0:
https://www.openstreetmap.org/copyright and https://opendatacommons.org/licenses/odbl/1-0/

Each JSON file includes the upstream Last-Modified timestamp, source URL, SHA-256,
attribution, and license. Importing does not claim the data is live or that access
and amenities have been independently verified.

## Refresh Tokyo

Use Python with `osmium==4.3.2` in a virtual environment or an ignored tool-only
directory. The web app does not require Python to run or build after import.
Download a current `Tokyo.osm.pbf` from the source above and verify its upstream
Last-Modified timestamp. Run from the repository root:

```sh
python3 scripts/import-international-pbf.py \
  --input .court-catalog-import/Tokyo.osm.pbf \
  --output functions/data/international/tokyo.json \
  --region Tokyo --country jp \
  --source-url https://download.bbbike.org/osm/bbbike/Tokyo/Tokyo.osm.pbf \
  --source-updated <verified-ISO-8601-source-timestamp>
```

On Windows use `python` if that is the available Python command. The importer
does not download files, execute SQL, or connect to D1. Inspect the generated diff
and run the catalog tests and build. Commit the small JSON catalog with its
metadata; keep raw PBF files and parser dependencies out of Git.

For another international region, import its extract separately and register its
catalog in `functions/lib/international-court-catalog.ts`. Never overwrite a US
dataset. Do not run the existing `import-court-catalog.mjs --execute` with only
international inputs: its replacement/removal logic can remove existing records.

The court handler checks a matching bundled catalog, then imported international
D1 data when configured, then the existing live international providers. A region
without matching catalog records still depends on those providers. Merely pulling
these files does not update the hosted API; build and deploy the updated Pages
Functions to make the imported catalog available to production/iOS clients.

Paris can be refreshed with the same importer using `--region Paris --country fr`,
the Paris PBF URL, `--output functions/data/international/paris.json`, and the
verified Paris source timestamp. Adding a city does not add country-wide coverage.
