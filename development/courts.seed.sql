-- Development seed: three access=yes OSM records from the checked-in Paris catalog.
-- ODbL-1.0; OpenStreetMap contributors: https://www.openstreetmap.org/copyright
-- Source snapshot: 2026-11-07. Mapped access is not a reservation or access guarantee.
INSERT INTO tennis_courts (osm_type, osm_id, lat, lon, tags_json) VALUES ('way', 40881080, 48.84528395, 2.1901775, '{"access":"yes","capacity":"2","leisure":"pitch","sport":"tennis","surface":"concrete"}') ON CONFLICT (osm_type, osm_id) DO NOTHING;
INSERT INTO tennis_courts (osm_type, osm_id, lat, lon, tags_json) VALUES ('way', 116909520, 48.86040705, 2.57693845, '{"access":"yes","covered":"yes","leisure":"pitch","lit":"yes","sport":"tennis","surface":"ground"}') ON CONFLICT (osm_type, osm_id) DO NOTHING;
INSERT INTO tennis_courts (osm_type, osm_id, lat, lon, tags_json) VALUES ('way', 147957420, 48.8394461, 2.55132795, '{"access":"yes","leisure":"pitch","sport":"tennis","surface":"paving_stones"}') ON CONFLICT (osm_type, osm_id) DO NOTHING;
