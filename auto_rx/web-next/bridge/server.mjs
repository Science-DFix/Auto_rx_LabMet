#!/usr/bin/env node
/**
 * History bridge for Grafana.
 *
 * auto_rx's Flask backend only keeps a lat/lon/alt path in memory for the live
 * map - it doesn't accumulate a time series of velocity/temperature/humidity/
 * pressure anywhere Grafana could query over HTTP. This bridge fills that gap
 * without touching the Flask app: it connects to the same Socket.IO stream
 * our own web-next UI uses, accumulates a per-sonde history in memory, and
 * serves it back out as flat JSON that Grafana's Infinity datasource can poll.
 *
 * Not a general-purpose service - single process, in-memory, no persistence.
 * Good enough for local evaluation of what a live Grafana view could show.
 */
import { createServer } from 'node:http';
import { io } from 'socket.io-client';

const BACKEND = process.env.AUTORX_BACKEND || 'http://127.0.0.1:5000';
const PORT = process.env.BRIDGE_PORT || 4500;
const MAX_POINTS_PER_SONDE = 5000;

const histories = new Map(); // sonde id -> array of records
let station = { lat: 0, lon: 0, alt: 0 };

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function loadStationFromConfig() {
  try {
    const res = await fetch(`${BACKEND}/get_config`);
    const cfg = await res.json();
    if (cfg.station_lat) station = { lat: cfg.station_lat, lon: cfg.station_lon, alt: cfg.station_alt };
    console.log('Station position loaded:', station);
  } catch (err) {
    console.error('Could not load station position from /get_config:', err.message);
  }
}

// Every field the log file format (auto_rx/autorx/logger.py LOG_HEADER) also
// records, so the history this bridge accumulates has the same variables
// available for future panels, not just the ones the first dashboard uses.
// snr/f_error are only present on some decoder paths - left undefined (and
// so absent from the JSON record) when the message doesn't carry them,
// same "missing means absent" behaviour the rest of the UI already relies on.
function recordFor(msg) {
  const rangeKm =
    station.lat !== 0 || station.lon !== 0 ? haversineKm(station.lat, station.lon, msg.lat, msg.lon) : null;
  return {
    time: Date.parse(msg.datetime) || Date.now(),
    alt: msg.alt,
    lat: msg.lat,
    lon: msg.lon,
    vel_v: msg.vel_v,
    vel_h: msg.vel_h,
    heading: msg.heading,
    temp: msg.temp,
    humidity: msg.humidity,
    pressure: msg.pressure,
    snr: msg.snr,
    f_error: msg.f_error,
    sats: msg.sats,
    batt: msg.batt,
    range_km: rangeKm,
    type: msg.type,
  };
}

function connectSocket() {
  const socket = io(`${BACKEND}/update_status`, { path: '/socket.io', transports: ['websocket', 'polling'] });

  socket.on('connect', () => {
    console.log('Bridge connected to auto_rx backend Socket.IO.');
    socket.emit('client_connected', { data: 'history-bridge' });
  });

  socket.on('disconnect', (reason) => console.warn('Bridge disconnected:', reason));

  socket.on('station_update', (msg) => {
    station = { lat: msg.lat, lon: msg.lon, alt: msg.alt };
  });

  socket.on('telemetry_event', (msg) => {
    if (!histories.has(msg.id)) histories.set(msg.id, []);
    const arr = histories.get(msg.id);
    arr.push(recordFor(msg));
    if (arr.length > MAX_POINTS_PER_SONDE) arr.shift();
  });

  return socket;
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(body));
}

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/health') {
    return sendJson(res, 200, { ok: true, sondes: [...histories.keys()] });
  }

  if (url.pathname === '/sondes') {
    return sendJson(res, 200, [...histories.keys()]);
  }

  if (url.pathname === '/history') {
    // All sondes, flattened, each record tagged with its sonde id.
    const all = [];
    for (const [id, arr] of histories.entries()) {
      for (const rec of arr) all.push({ sonde_id: id, ...rec });
    }
    return sendJson(res, 200, all);
  }

  const match = url.pathname.match(/^\/history\/(.+)$/);
  if (match) {
    const id = decodeURIComponent(match[1]);
    return sendJson(res, 200, histories.get(id) ?? []);
  }

  sendJson(res, 404, { error: 'not found' });
});

await loadStationFromConfig();
connectSocket();
server.listen(PORT, () => console.log(`History bridge listening on http://127.0.0.1:${PORT}`));
