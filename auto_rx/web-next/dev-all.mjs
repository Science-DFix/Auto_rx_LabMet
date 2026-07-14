#!/usr/bin/env node
/**
 * One-command local dev startup: history bridge + Grafana (Docker) + Vite.
 *
 * Everything here runs on 127.0.0.1 only. This does NOT start the auto_rx
 * Flask backend itself - that's still `python auto_rx.py`, run separately,
 * exactly as before. This script only wires up the extra local pieces the
 * web-next prototype (and its optional Gráficos/Grafana tab) needs.
 */
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const children = [];

function log(label, msg) {
  process.stdout.write(`[${label}] ${msg}\n`);
}

function runBackground(label, command, args, opts = {}) {
  const child = spawn(command, args, { stdio: 'inherit', ...opts });
  children.push(child);
  child.on('exit', (code) => {
    if (code && code !== 0) log(label, `exited with code ${code}`);
  });
  return child;
}

function hasDocker() {
  const result = spawnSync('docker', ['compose', 'version'], { stdio: 'ignore' });
  return result.status === 0;
}

function shutdown() {
  log('dev-all', 'shutting down bridge (Grafana container keeps running - stop it with: docker compose -f grafana/docker-compose.yml down)');
  for (const child of children) child.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

log('dev-all', 'Make sure the auto_rx backend (python auto_rx.py) is already running.');

// 1. History bridge (needed for the Gráficos tab; harmless if unused otherwise).
runBackground('bridge', process.execPath, [join(ROOT, 'bridge', 'server.mjs')]);

// 2. Grafana via Docker Compose, only if Docker is actually available - the
// rest of the app (Ao vivo / Histórico) works fine without it.
if (hasDocker()) {
  log('grafana', 'starting via docker compose...');
  const result = spawnSync('docker', ['compose', 'up', '-d'], {
    cwd: join(ROOT, 'grafana'),
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    log('grafana', 'failed to start - the Gráficos tab will not work, everything else is unaffected.');
  }
} else {
  log('grafana', 'Docker not found - skipping. Install Docker if you want the Gráficos tab; the rest of the app works fine without it.');
}

// 3. Vite dev server (foreground - this is the process you watch/Ctrl+C).
log('vite', 'starting dev server...');
const vite = runBackground('vite', 'npm', ['run', 'dev'], { cwd: ROOT });
vite.on('exit', shutdown);
