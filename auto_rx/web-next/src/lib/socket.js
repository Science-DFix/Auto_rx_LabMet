import { io } from 'socket.io-client';
import {
  connection,
  station,
  taskSummary,
  tasks,
  scanData,
  pushLogLine,
  upsertSonde,
  replaceSondePath,
  sondes,
} from './store.svelte.js';
import { getTelemetryArchive, getTaskList, getScanData } from './api.js';

const NAMESPACE = '/update_status';

async function syncTelemetryArchive() {
  const archive = await getTelemetryArchive();
  if (!archive) return;
  for (const [sondeId, entry] of Object.entries(archive)) {
    if (sondes.byId[sondeId]) {
      // Already tracking this one (e.g. after a reconnect) - just fill any path gap.
      replaceSondePath(sondeId, entry.path);
    } else {
      upsertSonde(sondeId, entry.latest_telem, null);
      sondes.byId[sondeId].path = entry.path;
    }
  }
}

export async function syncTaskList() {
  const data = await getTaskList();
  if (!data) return;
  tasks.byDevice = data;
  const active = Object.values(data).filter((t) => t.task !== 'Not Tasked');
  taskSummary.text = active.length === 0 ? 'Idle' : `${active.length} active`;
  taskSummary.details = Object.entries(data)
    .map(([sdr, t]) => `SDR ${sdr}: ${t.task}`)
    .join(' | ');
}

export async function syncScanData() {
  const data = await getScanData();
  if (!data || !data.freq || data.freq.length === 0) return;
  Object.assign(scanData, data);
}

export function initSocket() {
  // Force straight to WebSocket - Engine.IO long-polling (the default first transport)
  // doesn't survive Vite's dev proxy well and causes a reconnect storm (each poll
  // round-trip through the proxy can desync the session and get a 400 on the next
  // POST). WebSocket upgrades are proxied by Vite's `ws: true` option and are stable.
  const socket = io(window.location.origin + NAMESPACE, {
    path: '/socket.io',
    transports: ['websocket'],
  });

  socket.on('connect', async () => {
    connection.connected = true;
    socket.emit('client_connected', { data: "I'm connected!" });

    if (connection.hasConnectedBefore) {
      console.warn('Socket.IO reconnected - resyncing telemetry/task state.');
    }
    await syncTelemetryArchive();
    await syncTaskList();
    await syncScanData();
    connection.hasConnectedBefore = true;
  });

  socket.on('disconnect', (reason) => {
    connection.connected = false;
    console.warn(`Socket.IO disconnected: ${reason}`);
  });

  socket.on('telemetry_event', (msg) => {
    connection.lastEventAt = Date.now();
    upsertSonde(msg.id, msg, [msg.lat, msg.lon, msg.alt]);
  });

  socket.on('station_update', (msg) => {
    station.lat = msg.lat;
    station.lon = msg.lon;
    station.alt = msg.alt;
  });

  socket.on('log_event', (msg) => {
    pushLogLine({
      timestamp: msg.timestamp,
      level: msg.level,
      msg: msg.msg,
    });
  });

  socket.on('task_event', () => {
    syncTaskList();
  });

  socket.on('scan_event', () => {
    syncScanData();
  });

  return socket;
}
