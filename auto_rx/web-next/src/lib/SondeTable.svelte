<script>
  import { sondes } from './store.svelte.js';
  import { fmtAlt, fmtVelV } from './units.js';

  const rows = $derived(
    Object.entries(sondes.byId)
      .map(([id, entry]) => ({ id, ...entry.telem, ageSec: (Date.now() - entry.updatedAt) / 1000, colour: entry.colour }))
      .sort((a, b) => a.id.localeCompare(b.id))
  );
</script>

<div class="table-wrap">
  {#if rows.length === 0}
    <p class="empty">Nenhuma sonde sendo rastreada no momento.</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th></th>
          <th>ID</th>
          <th>Tipo</th>
          <th>Freq</th>
          <th>Alt</th>
          <th>Vel V</th>
          <th>Idade (s)</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row (row.id)}
          <tr>
            <td><span class="dot" style="background:{row.colour}"></span></td>
            <td>{row.id}</td>
            <td>{row.type ?? '-'}</td>
            <td>{row.freq ?? '-'}</td>
            <td>{fmtAlt(row.alt)}</td>
            <td>{fmtVelV(row.vel_v)}</td>
            <td>{row.ageSec.toFixed(0)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<style>
  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  th, td {
    text-align: left;
    padding: 0.35rem 0.6rem;
    border-bottom: 1px solid var(--border);
  }
  th {
    color: var(--text-muted);
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.7rem;
    letter-spacing: 0.04em;
  }
  .dot {
    display: inline-block;
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;
  }
  .empty {
    color: var(--text-muted);
    font-size: 0.9rem;
  }
</style>
