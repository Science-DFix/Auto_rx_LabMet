<script>
  import { sondes, settings } from './store.svelte.js';

  const GRAFANA_URL = 'http://localhost:3000';
  const DASHBOARD_PATH = '/d/autorx-live-eval/auto-rx-avaliacao-grafica-tempo-real';

  let selectedSonde = $state('');

  const sondeIds = $derived(Object.keys(sondes.byId));

  $effect(() => {
    if (!selectedSonde && sondeIds.length > 0) selectedSonde = sondeIds[0];
  });

  const grafanaTheme = $derived(settings.theme === 'light' ? 'light' : 'dark');

  const iframeSrc = $derived(
    `${GRAFANA_URL}${DASHBOARD_PATH}?orgId=1&kiosk=tv&refresh=5s&theme=${grafanaTheme}` +
      (selectedSonde ? `&var-sonde_id=${encodeURIComponent(selectedSonde)}` : '')
  );
</script>

<div class="grafana-view">
  <div class="toolbar">
    <span class="toolbar-label">Sonde:</span>
    {#if sondeIds.length === 0}
      <span class="muted">nenhuma sonde ativa no momento - abrindo o dashboard mesmo assim</span>
    {:else}
      <select bind:value={selectedSonde}>
        {#each sondeIds as id}<option value={id}>{id}</option>{/each}
      </select>
    {/if}
    <a class="open-link" href={iframeSrc.replace('&kiosk=tv', '')} target="_blank" rel="noreferrer">
      abrir em tela cheia no Grafana ↗
    </a>
  </div>
  <iframe class="grafana-frame" src={iframeSrc} title="Painéis Grafana - avaliação gráfica em tempo real"></iframe>
</div>

<style>
  .grafana-view {
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem 0.9rem;
    border-bottom: 1px solid var(--border);
    font-size: 0.82rem;
  }

  .toolbar-label {
    color: var(--text-muted);
  }

  select {
    background: var(--surface-2);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: 0.4rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
  }

  .open-link {
    margin-left: auto;
    color: var(--accent);
    font-size: 0.78rem;
    text-decoration: none;
  }

  .open-link:hover {
    text-decoration: underline;
  }

  .muted {
    color: var(--text-muted);
  }

  .grafana-frame {
    flex: 1;
    border: none;
    width: 100%;
    min-height: 0;
  }
</style>
