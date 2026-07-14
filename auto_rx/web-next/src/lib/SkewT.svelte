<script>
  // Minimal Skew-T log-P diagram, hand-rolled (no d3 dependency - this is
  // just log/linear scales + a skew transform, doesn't need a charting lib).
  // Simplification vs. a full meteorological Skew-T: no dry/moist adiabat
  // or mixing-ratio lines, no wind barbs - just isobars, isotherms, and the
  // temperature/dewpoint trace. That covers the main "how did temp/humidity
  // change with altitude" read a radiosonde flight is usually checked for.
  let { data = [] } = $props();

  const W = 640;
  const H = 520;
  const PAD = { top: 16, right: 16, bottom: 30, left: 44 };
  const P_MAX = 1050; // hPa, bottom of chart
  const P_MIN = 100; // hPa, top of chart
  const T_MIN = -80; // degC, left edge at bottom
  const T_MAX = 40; // degC, right edge at bottom
  const SKEW = 1.0; // shear applied per unit of normalised height

  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  function yForPressure(p) {
    const clamped = Math.min(Math.max(p, P_MIN), P_MAX);
    const frac = (Math.log(P_MAX) - Math.log(clamped)) / (Math.log(P_MAX) - Math.log(P_MIN));
    return PAD.top + frac * chartH;
  }

  function xForTemp(t, y) {
    const heightFrac = (y - PAD.top) / chartH; // 0 at top, 1 at bottom
    const baseFrac = (t - T_MIN) / (T_MAX - T_MIN);
    const skewFrac = baseFrac + SKEW * (1 - heightFrac);
    return PAD.left + skewFrac * chartW * 0.55;
  }

  const isobars = [1000, 850, 700, 500, 400, 300, 200, 100].filter((p) => p >= P_MIN && p <= P_MAX);
  const isotherms = [];
  for (let t = -80; t <= 40; t += 10) isotherms.push(t);

  function tracePath(field) {
    if (!data.length) return '';
    return data
      .map((level, i) => {
        const y = yForPressure(level.press);
        const x = xForTemp(level[field], y);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }

  const tempPath = $derived(tracePath('temp'));
  const dewpPath = $derived(
    data.every((l) => l.dwpt > -900) ? tracePath('dwpt') : ''
  );
</script>

<div class="skewt">
  {#if data.length === 0}
    <p class="empty">Sem dados de sondagem suficientes para este voo.</p>
  {:else}
    <svg viewBox="0 0 {W} {H}" class="skewt-svg">
      <!-- Isobars -->
      {#each isobars as p (p)}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={yForPressure(p)}
          y2={yForPressure(p)}
          class="grid-line"
        />
        <text x={4} y={yForPressure(p) + 4} class="axis-label">{p}</text>
      {/each}

      <!-- Isotherms (skewed) -->
      {#each isotherms as t (t)}
        <line
          x1={xForTemp(t, H - PAD.bottom)}
          y1={H - PAD.bottom}
          x2={xForTemp(t, PAD.top)}
          y2={PAD.top}
          class="grid-line-temp"
        />
        <text x={xForTemp(t, H - PAD.bottom)} y={H - PAD.bottom + 14} class="axis-label" text-anchor="middle">
          {t}
        </text>
      {/each}

      {#if dewpPath}
        <path d={dewpPath} class="dewp-trace" />
      {/if}
      <path d={tempPath} class="temp-trace" />
    </svg>
    <div class="legend">
      <span class="legend-item"><span class="swatch temp"></span>Temperatura (°C)</span>
      {#if dewpPath}
        <span class="legend-item"><span class="swatch dewp"></span>Ponto de orvalho (°C)</span>
      {/if}
      <span class="legend-note">Eixo Y: pressão (hPa, log) &middot; simplificado - sem adiabáticas/vento</span>
    </div>
  {/if}
</div>

<style>
  .skewt {
    width: 100%;
  }
  .skewt-svg {
    width: 100%;
    height: auto;
    background: var(--surface-2);
    border-radius: 0.4rem;
  }
  .grid-line {
    stroke: var(--border);
    stroke-width: 1;
  }
  .grid-line-temp {
    stroke: var(--border);
    stroke-width: 0.6;
    stroke-dasharray: 2 2;
  }
  .axis-label {
    font-size: 9px;
    fill: var(--text-muted);
  }
  .temp-trace {
    fill: none;
    stroke: #f87171;
    stroke-width: 2;
  }
  .dewp-trace {
    fill: none;
    stroke: #38bdf8;
    stroke-width: 2;
  }
  .legend {
    display: flex;
    gap: 0.8rem;
    flex-wrap: wrap;
    font-size: 0.72rem;
    color: var(--text-muted);
    margin-top: 0.3rem;
  }
  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }
  .swatch {
    width: 0.7rem;
    height: 0.15rem;
    display: inline-block;
  }
  .swatch.temp {
    background: #f87171;
  }
  .swatch.dewp {
    background: #38bdf8;
  }
  .empty {
    color: var(--text-muted);
    font-size: 0.85rem;
  }
</style>
