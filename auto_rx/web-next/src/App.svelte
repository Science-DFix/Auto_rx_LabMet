<script>
  import { onMount } from 'svelte';
  import MapView from './lib/MapView.svelte';
  import SondeTable from './lib/SondeTable.svelte';
  import LogPanel from './lib/LogPanel.svelte';
  import ControlPanel from './lib/ControlPanel.svelte';
  import SettingsPanel from './lib/SettingsPanel.svelte';
  import ScanChart from './lib/ScanChart.svelte';
  import HistoricalView from './lib/HistoricalView.svelte';
  import { connection, taskSummary, sondes, config, settings } from './lib/store.svelte.js';
  import { getConfig, getVersion } from './lib/api.js';
  import { initSocket } from './lib/socket.js';

  let controlsOpen = $state(false);
  let settingsOpen = $state(false);
  let view = $state('live'); // 'live' | 'historical'
  let versionInfo = $state(null);

  onMount(() => {
    let socket;

    (async () => {
      const cfg = await getConfig();
      if (cfg) Object.assign(config, cfg);
      socket = initSocket();
      versionInfo = await getVersion();
    })();

    // onMount only picks up a cleanup function from a *synchronous* return value,
    // so the teardown has to be registered here, not inside the async IIFE above.
    return () => socket?.disconnect();
  });

  const updateAvailable = $derived(
    versionInfo && versionInfo.latest !== 'Latest' && versionInfo.latest !== 'Unknown'
  );

  $effect(() => {
    if (settings.theme === 'auto') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', settings.theme);
    }
  });

  const sondeCount = $derived(Object.keys(sondes.byId).length);
</script>

<div class="layout">
  <header class="topbar">
    <div class="brand-group">
      <div class="brand">
        Radiosonde Auto-RX <span class="proto-badge">prototype</span>
        {#if versionInfo}
          <span class="version-tag">v{versionInfo.current}</span>
        {/if}
        {#if updateAvailable}
          <a
            class="update-tag"
            href="https://github.com/projecthorus/radiosonde_auto_rx/releases"
            target="_blank"
            rel="noreferrer"
          >
            atualização disponível: {versionInfo.latest}
          </a>
        {/if}
      </div>
      <nav class="view-switch">
        <button class:active={view === 'live'} onclick={() => (view = 'live')}>Ao vivo</button>
        <button class:active={view === 'historical'} onclick={() => (view = 'historical')}>Histórico</button>
      </nav>
    </div>
    <div class="status-group">
      <span class="badge">
        <span
          class="badge-dot"
          style="background:{connection.connected ? '#22c55e' : 'var(--danger)'}"
        ></span>
        {connection.connected ? 'Conectado' : 'Reconectando...'}
      </span>
      <span class="badge">Estação: {config.habitat_uploader_callsign}</span>
      <span class="badge">{sondeCount} sonde(s) ativa(s)</span>
      <button class="icon-btn" onclick={() => (settingsOpen = true)}>Config</button>
      <button class="icon-btn" onclick={() => (controlsOpen = true)}>Controles</button>
    </div>
  </header>

  {#if controlsOpen}
    <ControlPanel onClose={() => (controlsOpen = false)} />
  {/if}

  {#if settingsOpen}
    <SettingsPanel onClose={() => (settingsOpen = false)} />
  {/if}

  {#if !connection.connected}
    <div class="banner">Conexão com o servidor perdida - tentando reconectar...</div>
  {/if}

  {#if view === 'live'}
    <main class="grid">
      <section class="panel map-panel">
        <div class="panel-title">Mapa ao vivo</div>
        <div class="panel-body map-body">
          <MapView />
        </div>
        <div class="panel-title">Varredura de espectro</div>
        <div class="panel-body">
          <ScanChart />
        </div>
      </section>

      <section class="panel side">
        <div class="panel-title">Tarefas: {taskSummary.text || 'Idle'}</div>
        <div class="panel-body">
          <p class="tasks-detail">{taskSummary.details}</p>
        </div>
        <div class="panel-title">Sondes rastreadas</div>
        <div class="panel-body">
          <SondeTable />
        </div>
        <div class="panel-title">Log</div>
        <div class="panel-body log-body">
          <LogPanel />
        </div>
      </section>
    </main>
  {:else}
    <main class="historical-main">
      <HistoricalView />
    </main>
  {/if}
</div>

<style>
  .layout {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.7rem 1rem;
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .brand-group {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .brand {
    font-weight: 600;
    font-size: 1rem;
  }

  .view-switch {
    display: flex;
    gap: 0.2rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0.15rem;
  }

  .view-switch button {
    all: unset;
    cursor: pointer;
    font-size: 0.75rem;
    padding: 0.25rem 0.7rem;
    border-radius: 999px;
    color: var(--text-muted);
  }

  .view-switch button.active {
    background: var(--accent);
    color: #06131a;
    font-weight: 600;
  }

  .historical-main {
    flex: 1;
    min-height: 0;
  }

  .proto-badge {
    font-size: 0.65rem;
    color: var(--text-muted);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0.1rem 0.5rem;
    margin-left: 0.4rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .version-tag {
    font-size: 0.7rem;
    color: var(--text-muted);
    margin-left: 0.5rem;
  }

  .update-tag {
    font-size: 0.7rem;
    color: var(--accent);
    margin-left: 0.5rem;
  }

  .status-group {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: center;
  }

  .icon-btn {
    font-size: 0.75rem;
    padding: 0.2rem 0.7rem;
    border-radius: 999px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    color: var(--text);
    cursor: pointer;
  }

  .icon-btn:hover {
    border-color: var(--accent);
  }

  .banner {
    background: var(--danger);
    color: #1a0505;
    text-align: center;
    padding: 0.4rem;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .grid {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 0.8rem;
    padding: 0.8rem;
    min-height: 0;
  }

  @media (max-width: 900px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }

  .map-panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .map-body {
    flex: 1;
    min-height: 320px;
  }

  .side {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    min-height: 0;
  }

  .log-body {
    flex: 1;
    min-height: 0;
  }

  .tasks-detail {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin: 0;
  }
</style>
