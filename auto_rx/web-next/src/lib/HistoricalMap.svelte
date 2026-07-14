<script>
  import { onMount, onDestroy } from 'svelte';
  import L from 'leaflet';
  import 'leaflet/dist/leaflet.css';
  import { buildTileLayers, defaultLayerId } from './mapLayers.js';

  // path: array of [lat, lon, alt]
  let { path = [] } = $props();

  let mapEl;
  let map;
  let pathLine;
  let burstMarker;

  onMount(() => {
    map = L.map(mapEl, { attributionControl: false }).setView([0, 0], 3);
    const tileLayers = buildTileLayers();
    tileLayers[defaultLayerId(tileLayers)].addTo(map);
    pathLine = L.polyline([], { color: '#38bdf8', weight: 3 }).addTo(map);
  });

  onDestroy(() => {
    map?.remove();
  });

  $effect(() => {
    if (!map || path.length === 0) return;
    const latlngs = path.map((p) => [p[0], p[1]]);
    pathLine.setLatLngs(latlngs);
    map.fitBounds(pathLine.getBounds(), { padding: [20, 20] });

    const burstIdx = path.reduce((maxI, p, i) => (p[2] > path[maxI][2] ? i : maxI), 0);
    burstMarker?.remove();
    burstMarker = L.circleMarker(latlngs[burstIdx], {
      radius: 6,
      color: '#111827',
      weight: 1,
      fillColor: '#facc15',
      fillOpacity: 1,
    })
      .bindTooltip(`Estouro: ${path[burstIdx][2].toFixed(0)} m`)
      .addTo(map);
  });
</script>

<div class="map" bind:this={mapEl}></div>

<style>
  .map {
    width: 100%;
    height: 100%;
    min-height: 280px;
  }
</style>
