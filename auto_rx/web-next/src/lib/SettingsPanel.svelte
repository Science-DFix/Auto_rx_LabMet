<script>
  import { settings, saveSettings } from './store.svelte.js';

  let { onClose } = $props();

  function update(key, value) {
    settings[key] = value;
    saveSettings();
  }
</script>

<div class="drawer">
  <div class="drawer-header">
    <h2>Configurações</h2>
    <button class="close" onclick={onClose} aria-label="Fechar">✕</button>
  </div>

  <section>
    <h3>Unidades</h3>
    <div class="row">
      <label>
        <input
          type="radio"
          name="units"
          checked={settings.units === 'metric'}
          onchange={() => update('units', 'metric')}
        />
        Métrico (m, m/s, km/h)
      </label>
      <label>
        <input
          type="radio"
          name="units"
          checked={settings.units === 'imperial'}
          onchange={() => update('units', 'imperial')}
        />
        Imperial (ft, ft/s, mph)
      </label>
    </div>
  </section>

  <section>
    <h3>Horário</h3>
    <div class="row">
      <label>
        <input type="checkbox" checked={settings.utc} onchange={(e) => update('utc', e.target.checked)} />
        Exibir em UTC
      </label>
    </div>
  </section>

  <section>
    <h3>Tema</h3>
    <div class="row">
      {#each [['auto', 'Automático'], ['dark', 'Escuro'], ['light', 'Claro']] as [value, label]}
        <label>
          <input
            type="radio"
            name="theme"
            checked={settings.theme === value}
            onchange={() => update('theme', value)}
          />
          {label}
        </label>
      {/each}
    </div>
  </section>
</div>

<style>
  .drawer {
    position: fixed;
    top: 0;
    right: 0;
    width: min(320px, 100vw);
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

  .row {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    font-size: 0.85rem;
  }

  label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
  }
</style>
