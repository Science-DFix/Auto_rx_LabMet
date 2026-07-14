<script>
  import { logLines } from './store.svelte.js';
  import { fmtTime } from './units.js';
</script>

<div class="log-panel">
  {#if logLines.length === 0}
    <p class="empty">Sem eventos de log ainda.</p>
  {:else}
    {#each logLines as line, i (i)}
      <div class="line" class:important={line.level === 'ERROR' || line.level === 'CRITICAL'}>
        <span class="time">{fmtTime(line.timestamp)}</span>
        <span class="level">{line.level}</span>
        <span class="msg">{line.msg}</span>
      </div>
    {/each}
  {/if}
</div>

<style>
  .log-panel {
    max-height: 100%;
    overflow-y: auto;
    font-size: 0.8rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .line {
    padding: 0.25rem 0;
    border-bottom: 1px solid var(--border);
    display: flex;
    gap: 0.5rem;
  }
  .line.important .msg {
    color: var(--danger);
  }
  .time {
    color: var(--text-muted);
    white-space: nowrap;
  }
  .level {
    font-weight: 600;
    white-space: nowrap;
  }
  .empty {
    color: var(--text-muted);
  }
</style>
