// Shared reactive state for the dashboard prototype (Svelte 5 runes).
// One module-level object per concern, imported directly by components.

export const connection = $state({
  connected: false,
  hasConnectedBefore: false,
  lastEventAt: null,
});

export const station = $state({
  callsign: '???',
  lat: 0,
  lon: 0,
  alt: 0,
});

// sondes: Map keyed by sonde id -> { telem, path: [[lat,lon,alt], ...], colour, updatedAt }
export const sondes = $state({ byId: {} });

export const taskSummary = $state({ text: '', details: '' });

// Raw per-SDR task dict from /get_task_list, e.g. {"0": {"task": "Scanning", "freq": 0}, ...}
export const tasks = $state({ byDevice: {} });

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export const auth = $state({
  password: localStorage.getItem('auto_rx_password') ?? '',
  verified: false,
  lastError: '',
});

// Subset of /get_config relevant to the control panel + validation.
export const config = $state({
  habitat_uploader_callsign: '???',
  web_control: false,
  rotator_enabled: false,
  min_freq: 400.0,
  max_freq: 405.0,
  snr_threshold: 0,
});

export function setPassword(pw) {
  auth.password = pw;
  localStorage.setItem('auto_rx_password', pw);
}

export const settings = $state(
  loadJson('auto_rx_settings', {
    units: 'metric', // 'metric' | 'imperial'
    utc: false,
    theme: 'auto', // 'auto' | 'dark' | 'light'
  })
);

export function saveSettings() {
  localStorage.setItem('auto_rx_settings', JSON.stringify(settings));
}

export const scanData = $state({
  freq: [],
  power: [],
  peak_freq: [],
  peak_lvl: [],
  threshold: 0,
  timestamp: null,
});

export const MAX_LOG_LINES = 300;
export const logLines = $state([]);

export function pushLogLine(entry) {
  logLines.unshift(entry);
  if (logLines.length > MAX_LOG_LINES) {
    logLines.length = MAX_LOG_LINES;
  }
}

const COLOURS = ['#2dd4bf', '#f97316', '#a78bfa', '#f43f5e', '#facc15', '#38bdf8'];
let colourIdx = 0;

export function nextColour() {
  const c = COLOURS[colourIdx % COLOURS.length];
  colourIdx += 1;
  return c;
}

export function upsertSonde(id, telem, pathPoint) {
  let entry = sondes.byId[id];
  if (!entry) {
    entry = {
      telem,
      path: pathPoint ? [pathPoint] : [],
      colour: nextColour(),
      updatedAt: Date.now(),
    };
    sondes.byId[id] = entry;
  } else {
    entry.telem = telem;
    entry.updatedAt = Date.now();
    if (pathPoint) entry.path.push(pathPoint);
  }
  return entry;
}

export function replaceSondePath(id, fullPath) {
  const entry = sondes.byId[id];
  if (entry) entry.path = fullPath;
}
