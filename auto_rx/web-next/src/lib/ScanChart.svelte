<script>
  import { scanData, config } from './store.svelte.js';

  const W = 800;
  const H = 180;
  const PAD = { top: 10, right: 10, bottom: 20, left: 36 };

  const hasData = $derived(scanData.freq.length > 0);

  const xScale = $derived.by(() => {
    const min = scanData.freq[0] ?? 0;
    const max = scanData.freq[scanData.freq.length - 1] ?? 1;
    return (f) => PAD.left + ((f - min) / (max - min || 1)) * (W - PAD.left - PAD.right);
  });

  const yDomain = $derived.by(() => {
    if (!hasData) return [0, 1];
    const all = scanData.power;
    return [Math.min(...all, scanData.threshold), Math.max(...all)];
  });

  const yScale = $derived.by(() => {
    const [min, max] = yDomain;
    return (p) => PAD.top + (1 - (p - min) / (max - min || 1)) * (H - PAD.top - PAD.bottom);
  });

  const spectrumPath = $derived.by(() => {
    if (!hasData) return '';
    return scanData.freq
      .map((f, i) => `${i === 0 ? 'M' : 'L'} ${xScale(f).toFixed(1)} ${yScale(scanData.power[i]).toFixed(1)}`)
      .join(' ');
  });

  const thresholdY = $derived(yScale(scanData.threshold + (config.snr_threshold ?? 0)));

  const peaks = $derived(
    (scanData.peak_freq ?? []).map((f, i) => ({
      x: xScale(f),
      y: yScale(scanData.peak_lvl[i]),
      freq: f,
    }))
  );
</script>

<div class="scan-chart">
  {#if !hasData}
    <p class="empty">Sem dados de varredura ainda.</p>
  {:else}
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="none" class="chart-svg">
      <line
        x1={PAD.left}
        x2={W - PAD.right}
        y1={thresholdY}
        y2={thresholdY}
        stroke="var(--danger)"
        stroke-dasharray="4 3"
        stroke-width="1"
      />
      <path d={spectrumPath} fill="none" stroke="var(--accent)" stroke-width="1.2" />
      {#each peaks as p (p.freq)}
        <circle cx={p.x} cy={p.y} r="3" fill="#facc15" />
      {/each}
    </svg>
    <div class="axis-labels">
      <span>{scanData.freq[0]?.toFixed(3)} MHz</span>
      <span>{scanData.freq[scanData.freq.length - 1]?.toFixed(3)} MHz</span>
    </div>
  {/if}
</div>

<style>
  .scan-chart {
    width: 100%;
  }
  .chart-svg {
    width: 100%;
    height: 160px;
    display: block;
  }
  .axis-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.7rem;
    color: var(--text-muted);
    padding: 0 0.2rem;
  }
  .empty {
    color: var(--text-muted);
    font-size: 0.85rem;
  }
</style>
