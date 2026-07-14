<script>
  import { onMount, onDestroy } from 'svelte';
  import L from 'leaflet';
  import 'leaflet/dist/leaflet.css';
  import { sondes, station } from './store.svelte.js';
  import { fmtAlt, fmtVelV } from './units.js';
  import { LAYER_DEFS, buildTileLayers, defaultLayerId } from './mapLayers.js';

  let mapEl;
  let containerEl;
  let map;
  let stationMarker;
  let isFullscreen = $state(false);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerEl.requestFullscreen();
    }
  }
  const layers = new Map(); // sonde id -> { marker, path }

  let activeLayerId = $state('');
  let tileLayers = {};
  let currentTileLayer;

  function setActiveLayer(id) {
    activeLayerId = id;
    localStorage.setItem('map_layer', id);
    if (currentTileLayer) map.removeLayer(currentTileLayer);
    currentTileLayer = tileLayers[id];
    currentTileLayer.addTo(map);
  }

  function onFullscreenChange() {
    isFullscreen = document.fullscreenElement === containerEl;
    // The map container just resized (entered/left fullscreen) - Leaflet caches
    // its size internally, so it needs to be told explicitly to remeasure.
    setTimeout(() => map?.invalidateSize(), 50);
  }

  onMount(() => {
    map = L.map(mapEl, { attributionControl: false }).setView([0, 0], 3);

    tileLayers = buildTileLayers();
    setActiveLayer(defaultLayerId(tileLayers));

    stationMarker = L.circleMarker([0, 0], {
      radius: 7,
      color: '#ffffff',
      weight: 2,
      fillColor: '#0ea5e9',
      fillOpacity: 1,
    }).bindTooltip('Station');

    document.addEventListener('fullscreenchange', onFullscreenChange);
  });

  onDestroy(() => {
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    map?.remove();
  });

  $effect(() => {
    if (!map || !station.lat) return;
    stationMarker.setLatLng([station.lat, station.lon]);
    if (!map.hasLayer(stationMarker)) stationMarker.addTo(map);
  });

  $effect(() => {
    if (!map) return;
    const seen = new Set();

    for (const [id, entry] of Object.entries(sondes.byId)) {
      seen.add(id);
      const { telem, path, colour } = entry;
      let layer = layers.get(id);

      if (!layer) {
        const marker = L.circleMarker([telem.lat, telem.lon], {
          radius: 6,
          color: '#111827',
          weight: 1,
          fillColor: colour,
          fillOpacity: 0.9,
        })
          .bindTooltip('', { permanent: false, direction: 'right' })
          .addTo(map);
        const polyline = L.polyline([], { color: colour, weight: 2 }).addTo(map);
        layer = { marker, polyline };
        layers.set(id, layer);
      }

      layer.marker.setLatLng([telem.lat, telem.lon]);
      layer.marker.setTooltipContent(
        `<b>${id}</b><br>${telem.type ?? ''}<br>${fmtAlt(telem.alt)} &middot; ${fmtVelV(telem.vel_v)}`
      );
      layer.polyline.setLatLngs(path.map((p) => [p[0], p[1]]));
    }

    // Drop layers for sondes no longer in the store.
    for (const [id, layer] of layers.entries()) {
      if (!seen.has(id)) {
        map.removeLayer(layer.marker);
        map.removeLayer(layer.polyline);
        layers.delete(id);
      }
    }
  });
</script>

<div class="map-container" class:fullscreen={isFullscreen} bind:this={containerEl}>
  <div class="map" bind:this={mapEl}></div>

  <button class="fullscreen-btn" onclick={toggleFullscreen} aria-label="Alternar tela cheia">
    {isFullscreen ? '⤡' : '⤢'}
  </button>

  <div class="layer-switcher">
    {#each LAYER_DEFS as layer (layer.id)}
      <button
        class:active={activeLayerId === layer.id}
        onclick={() => setActiveLayer(layer.id)}
      >
        {layer.label}
      </button>
    {/each}
  </div>
</div>

<style>
  .map-container {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 320px;
  }

  .map-container.fullscreen {
    background: var(--bg);
  }

  .map {
    width: 100%;
    height: 100%;
    min-height: 320px;
  }

  .fullscreen-btn {
    all: unset;
    position: absolute;
    top: 0.6rem;
    left: 0.6rem;
    z-index: 1000;
    cursor: pointer;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 0.4rem;
    padding: 0.25rem 0.5rem;
    font-size: 1rem;
    line-height: 1;
    color: var(--text);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
  }

  .fullscreen-btn:hover {
    border-color: var(--accent);
  }

  .layer-switcher {
    position: absolute;
    top: 0.6rem;
    right: 0.6rem;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    padding: 0.3rem;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
  }

  .layer-switcher button {
    all: unset;
    cursor: pointer;
    font-size: 0.72rem;
    padding: 0.25rem 0.55rem;
    border-radius: 0.35rem;
    color: var(--text-muted);
    white-space: nowrap;
    text-align: right;
  }

  .layer-switcher button:hover {
    background: var(--surface-2);
    color: var(--text);
  }

  .layer-switcher button.active {
    background: var(--accent);
    color: #06131a;
    font-weight: 600;
  }
</style>
