<script>
  import { onMount } from 'svelte';
  import HistoricalMap from './HistoricalMap.svelte';
  import SkewT from './SkewT.svelte';
  import { getLogList, getLogBySerial, getLogDetail } from './api.js';
  import { fmtAlt } from './units.js';

  let logs = $state([]);
  let loadingLogs = $state(true);
  let selectedSerial = $state(null);
  let detail = $state(null);
  let skewtLevels = $state([]);
  let loadingDetail = $state(false);

  onMount(async () => {
    logs = (await getLogList()) ?? [];
    loadingLogs = false;
  });

  async function selectLog(serial) {
    selectedSerial = serial;
    detail = null;
    skewtLevels = [];
    loadingDetail = true;
    const [byId, withSkewt] = await Promise.all([getLogBySerial(serial), getLogDetail(serial, 25)]);
    detail = byId;
    skewtLevels = withSkewt?.skewt ?? [];
    loadingDetail = false;
  }

  function exportUrl(serials) {
    const b64 = btoa(JSON.stringify(serials));
    return `/export_log_files/${b64}`;
  }

  function kmlUrl(serials) {
    const b64 = btoa(JSON.stringify(serials));
    return `/generate_kml/${b64}`;
  }
</script>

<div class="historical">
  <aside class="log-list panel">
    <div class="panel-title list-header">
      <span>Voos registrados</span>
      {#if logs.length > 0}
        <a class="export-link" href="/export_all_log_files">Exportar tudo</a>
      {/if}
    </div>
    <div class="panel-body">
      {#if loadingLogs}
        <p class="muted">Carregando...</p>
      {:else if logs.length === 0}
        <p class="muted">Nenhum log encontrado no diretório de logs do servidor.</p>
      {:else}
        <ul>
          {#each logs as log (log.serial)}
            <li>
              <button class:active={selectedSerial === log.serial} onclick={() => selectLog(log.serial)}>
                <strong>{log.serial}</strong>
                <span class="meta">{log.type} &middot; {(log.freq).toFixed(3)} MHz</span>
                <span class="meta">{new Date(log.datetime).toLocaleString()}</span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </aside>

  <section class="detail panel">
    {#if !selectedSerial}
      <div class="panel-body"><p class="muted">Selecione um voo na lista para ver os detalhes.</p></div>
    {:else if loadingDetail}
      <div class="panel-body"><p class="muted">Carregando detalhes de {selectedSerial}...</p></div>
    {:else if !detail || !detail.path}
      <div class="panel-body"><p class="muted">Não foi possível carregar o log de {selectedSerial}.</p></div>
    {:else}
      <div class="panel-title">Trilha - {selectedSerial}</div>
      <div class="panel-body map-body">
        <HistoricalMap path={detail.path} />
      </div>
      <div class="panel-title list-header">
        <span>Resumo</span>
        <span class="export-group">
          <a class="export-link" href={exportUrl([selectedSerial])}>Exportar log</a>
          <a class="export-link" href={kmlUrl([selectedSerial])}>KML</a>
        </span>
      </div>
      <div class="panel-body stats">
        <div><span class="muted">Lançamento</span> {new Date(detail.first_time).toLocaleString()}</div>
        <div><span class="muted">Estouro</span> {fmtAlt(detail.burst?.[2])} em {new Date(detail.burst_time).toLocaleString()}</div>
        <div><span class="muted">Último ponto</span> {new Date(detail.last_time).toLocaleString()}</div>
        <div><span class="muted">Alcance no lançamento</span> {detail.first_range_km?.toFixed(1)} km</div>
        <div><span class="muted">Alcance final</span> {detail.last_range_km?.toFixed(1)} km</div>
      </div>
      <div class="panel-title">Perfil atmosférico (Skew-T)</div>
      <div class="panel-body">
        <SkewT data={skewtLevels} />
      </div>
    {/if}
  </section>
</div>

<style>
  .historical {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 0.8rem;
    padding: 0.8rem;
    height: 100%;
    min-height: 0;
  }

  @media (max-width: 900px) {
    .historical {
      grid-template-columns: 1fr;
    }
  }

  .log-list,
  .detail {
    overflow-y: auto;
    min-height: 0;
  }

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .export-group {
    display: flex;
    gap: 0.6rem;
  }

  .export-link {
    color: var(--accent);
    font-size: 0.7rem;
    text-transform: none;
    letter-spacing: normal;
    text-decoration: none;
  }

  .export-link:hover {
    text-decoration: underline;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  li button {
    all: unset;
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 0.5rem 0.6rem;
    border-radius: 0.4rem;
    cursor: pointer;
    font-size: 0.8rem;
  }

  li button:hover {
    background: var(--surface-2);
  }

  li button.active {
    background: var(--accent);
    color: #06131a;
  }

  li button.active .meta {
    color: #06131a;
    opacity: 0.8;
  }

  .meta {
    color: var(--text-muted);
    font-size: 0.72rem;
  }

  .map-body {
    height: 320px;
  }

  .stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.4rem;
    font-size: 0.82rem;
  }

  .stats .muted {
    display: block;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .muted {
    color: var(--text-muted);
  }
</style>
