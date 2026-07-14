#!/usr/bin/env node
/**
 * One-command local startup for the whole real-time stack: optionally the
 * auto_rx Python backend itself, plus the history bridge, Grafana (Docker),
 * and the Vite dev server.
 *
 * Everything here runs on 127.0.0.1 only.
 *
 * Starting the Python backend is opt-in (set AUTORX_START_BACKEND=1) because
 * it needs SDR hardware and a configured station.cfg already in place - this
 * script won't silently try to start something that isn't set up yet. Without
 * it, this behaves as before: it assumes `python auto_rx.py` is already
 * running elsewhere, and only wires up the web/visualisation pieces.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const AUTORX_DIR = join(ROOT, '..'); // auto_rx/ (parent of web-next/)
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
  log('dev-all', 'shutting down (Grafana container keeps running - stop it with: docker compose -f grafana/docker-compose.yml down)');
  for (const child of children) child.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// 0. auto_rx.py itself - opt-in, since it needs SDR hardware + station.cfg.
if (process.env.AUTORX_START_BACKEND === '1') {
  const cfgPath = join(AUTORX_DIR, 'station.cfg');
  if (!existsSync(cfgPath)) {
    log('backend', `AUTORX_START_BACKEND=1 but ${cfgPath} doesn't exist - skipping. Copy station.cfg.example to station.cfg and configure it first.`);
  } else {
    const pythonBin = process.env.AUTORX_PYTHON || 'python3';
    const extraArgs = process.env.AUTORX_PY_ARGS ? process.env.AUTORX_PY_ARGS.split(' ') : [];
    log('backend', `starting: ${pythonBin} auto_rx.py ${extraArgs.join(' ')}`);
    runBackground('backend', pythonBin, ['auto_rx.py', ...extraArgs], { cwd: AUTORX_DIR });
  }
} else {
  log('dev-all', 'AUTORX_START_BACKEND not set to 1 - assuming `python auto_rx.py` is already running elsewhere.');
}

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
