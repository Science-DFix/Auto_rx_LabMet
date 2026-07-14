import L from 'leaflet';
import 'leaflet-providers';

// Same base map coverage options as the legacy UI (OSM, satellite, terrain, etc),
// shared between the live MapView and the historical replay map.
// Note: the legacy UI's "Terrain" option (Stamen.Terrain) is gone from leaflet-providers -
// Stamen folded into Stadia Maps, which now requires an API key for that tile set. Using
// OpenTopoMap instead, which covers the same "terrain" need without requiring a key.
export const LAYER_DEFS = [
  { id: 'Mapnik', label: 'Ruas', provider: 'OpenStreetMap.Mapnik' },
  { id: 'WorldImagery', label: 'Satélite', provider: 'Esri.WorldImagery' },
  { id: 'DarkMatter', label: 'Escuro', provider: 'CartoDB.DarkMatter' },
  { id: 'Voyager', label: 'Voyager', provider: 'CartoDB.Voyager' },
  { id: 'OpenTopoMap', label: 'Topográfico', provider: 'OpenTopoMap' },
];

export function buildTileLayers() {
  const tileLayers = {};
  for (const { id, provider } of LAYER_DEFS) {
    try {
      tileLayers[id] = L.tileLayer.provider(provider, { edgeBufferTiles: 2 });
    } catch (err) {
      console.error(`Map layer "${id}" (${provider}) failed to load: ${err}`);
    }
  }
  return tileLayers;
}

export function defaultLayerId(tileLayers) {
  const saved = localStorage.getItem('map_layer');
  if (saved && tileLayers[saved]) return saved;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const preferred = prefersDark ? 'DarkMatter' : 'Mapnik';
  return tileLayers[preferred] ? preferred : Object.keys(tileLayers)[0];
}
