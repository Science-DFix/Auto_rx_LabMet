<script>
  import { auth, config, tasks, setPassword } from './store.svelte.js';
  import { syncTaskList } from './socket.js';
  import * as api from './api.js';

  let { onClose } = $props();

  const SONDE_TYPES = [
    'RS92', 'RS41', 'DFM', 'M10', 'M20', 'IMET', 'IMET5', 'MK2LMS', 'LMS6',
    'MEISEI', 'MRZ', 'MTS01', 'UDP', 'WXR301', 'WXRPN9', 'IMETWIDE', 'RD94RD41',
  ];

  let passwordInput = $state('');
  let busy = $state(false);
  let statusMsg = $state('');

  let startFreq = $state('');
  let startType = $state('RS41');
  let stopFreq = $state('');
  let az = $state('0');
  let el = $state('0');

  const activeFreqs = $derived(
    Object.values(tasks.byDevice)
      .filter((t) => t.freq > 0)
      .map((t) => ({ freq: t.freq, label: `${(t.freq / 1e6).toFixed(3)} MHz${t.type ? ' ' + t.type : ''}` }))
  );

  async function withBusy(fn) {
    busy = true;
    statusMsg = '';
    try {
      await fn();
    } catch (err) {
      if (err.status === 403) {
        auth.verified = false;
        statusMsg = 'Senha incorreta.';
      } else if (err.status === 404) {
        statusMsg = 'Nada em execução para essa ação.';
      } else {
        statusMsg = `Erro: ${err.message}`;
      }
    } finally {
      busy = false;
      syncTaskList();
    }
  }

  function verify() {
    const pw = passwordInput || auth.password;
    setPassword(pw);
    withBusy(async () => {
      await api.checkPassword(pw);
      auth.verified = true;
      statusMsg = 'Senha OK.';
    });
  }

  function doStartDecoder() {
    const freqFloat = parseFloat(startFreq);
    if (freqFloat > config.max_freq || freqFloat < config.min_freq) {
      statusMsg = `Frequência deve estar entre ${config.min_freq} e ${config.max_freq} MHz.`;
      return;
    }
    withBusy(async () => {
      await api.startDecoder(auth.password, (freqFloat * 1e6).toFixed(1), startType);
      statusMsg = 'Decoder solicitado.';
    });
  }

  function doStopDecoder(lockout) {
    if (!stopFreq) return;
    withBusy(async () => {
      await api.stopDecoder(auth.password, stopFreq, lockout);
      statusMsg = lockout ? 'Decoder parado (com lockout).' : 'Decoder parado.';
    });
  }

  function doDisableScanner() {
    withBusy(async () => {
      await api.disableScanner(auth.password);
      statusMsg = 'Scanner desabilitado.';
    });
  }

  function doEnableScanner() {
    withBusy(async () => {
      await api.enableScanner(auth.password);
      statusMsg = 'Scanner habilitado.';
    });
  }

  function doMoveRotator() {
    withBusy(async () => {
      await api.moveRotator(auth.password, parseFloat(az).toFixed(1), parseFloat(el).toFixed(1));
      statusMsg = 'Movendo rotador.';
    });
  }

  function doHomeRotator() {
    withBusy(async () => {
      await api.homeRotator(auth.password);
      statusMsg = 'Rotador indo para home.';
    });
  }
</script>

<div class="drawer">
  <div class="drawer-header">
    <h2>Controles</h2>
    <button class="close" onclick={onClose} aria-label="Fechar">✕</button>
  </div>

  {#if !config.web_control}
    <p class="warn">Controle via web está desabilitado na configuração do servidor (web_control).</p>
  {:else}
    <section>
      <h3>Senha</h3>
      <div class="row">
        <input type="password" placeholder="Senha de controle" bind:value={passwordInput} />
        <button onclick={verify} disabled={busy}>Verificar</button>
      </div>
      <p class="status" class:ok={auth.verified}>
        {auth.verified ? 'Autenticado' : 'Não autenticado'}
      </p>
    </section>

    <section class:disabled={!auth.verified}>
      <h3>Scanner</h3>
      <div class="row">
        <button onclick={doDisableScanner} disabled={busy || !auth.verified}>Desabilitar</button>
        <button onclick={doEnableScanner} disabled={busy || !auth.verified}>Habilitar</button>
      </div>
    </section>

    <section class:disabled={!auth.verified}>
      <h3>Iniciar decoder</h3>
      <div class="row">
        <input
          type="number"
          step="0.001"
          placeholder="Freq (MHz)"
          bind:value={startFreq}
          disabled={!auth.verified}
        />
        <select bind:value={startType} disabled={!auth.verified}>
          {#each SONDE_TYPES as t}<option value={t}>{t}</option>{/each}
        </select>
        <button onclick={doStartDecoder} disabled={busy || !auth.verified || !startFreq}>Iniciar</button>
      </div>
    </section>

    <section class:disabled={!auth.verified}>
      <h3>Parar decoder</h3>
      <div class="row">
        <select bind:value={stopFreq} disabled={!auth.verified}>
          <option value="">Selecione...</option>
          {#each activeFreqs as f}<option value={f.freq}>{f.label}</option>{/each}
        </select>
        <button onclick={() => doStopDecoder(false)} disabled={busy || !auth.verified || !stopFreq}>Parar</button>
        <button onclick={() => doStopDecoder(true)} disabled={busy || !auth.verified || !stopFreq}>
          Parar + bloquear
        </button>
      </div>
    </section>

    {#if config.rotator_enabled}
      <section class:disabled={!auth.verified}>
        <h3>Rotador</h3>
        <div class="row">
          <input type="number" placeholder="Azimute" bind:value={az} disabled={!auth.verified} />
          <input type="number" placeholder="Elevação" bind:value={el} disabled={!auth.verified} />
          <button onclick={doMoveRotator} disabled={busy || !auth.verified}>Mover</button>
          <button onclick={doHomeRotator} disabled={busy || !auth.verified}>Home</button>
        </div>
      </section>
    {/if}

    {#if statusMsg}
      <p class="status-msg">{statusMsg}</p>
    {/if}
  {/if}
</div>

<style>
  .drawer {
    position: fixed;
    top: 0;
    right: 0;
    width: min(360px, 100vw);
    height: 100vh;
    background: var(--surface);
    border-left: 1px solid var(--border);
    padding: 1rem;
    overflow-y: auto;
    z-index: 2000;
    box-shadow: -8px 0 24px rgba(0, 0, 0, 0.3);
  }

  .drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  h2 {
    font-size: 1rem;
    margin: 0;
  }

  h3 {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    margin: 0 0 0.4rem;
  }

  .close {
    all: unset;
    cursor: pointer;
    color: var(--text-muted);
    font-size: 1rem;
    padding: 0.2rem 0.4rem;
  }

  section {
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border);
  }

  section.disabled {
    opacity: 0.6;
  }

  .row {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  input, select, button {
    background: var(--surface-2);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: 0.4rem;
    padding: 0.35rem 0.5rem;
    font-size: 0.8rem;
  }

  button {
    cursor: pointer;
  }

  button:hover:not(:disabled) {
    border-color: var(--accent);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .status {
    font-size: 0.75rem;
    color: var(--danger);
    margin: 0.3rem 0 0;
  }

  .status.ok {
    color: #22c55e;
  }

  .status-msg {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .warn {
    color: var(--danger);
    font-size: 0.85rem;
  }
</style>
