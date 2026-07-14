import { settings } from './store.svelte.js';

export function fmtAlt(metres) {
  if (metres == null) return '-';
  return settings.units === 'imperial'
    ? `${(metres * 3.28084).toFixed(0)} ft`
    : `${metres.toFixed(0)} m`;
}

export function fmtVelV(mps) {
  if (mps == null) return '-';
  return settings.units === 'imperial'
    ? `${(mps * 3.28084).toFixed(1)} ft/s`
    : `${mps.toFixed(1)} m/s`;
}

export function fmtVelH(mps) {
  if (mps == null) return '-';
  return settings.units === 'imperial'
    ? `${(mps * 2.23694).toFixed(0)} mph`
    : `${(mps * 3.6).toFixed(0)} km/h`;
}

export function fmtTime(timestamp) {
  const d = new Date(timestamp);
  if (settings.utc) {
    return d.toISOString().replace('T', ' ').replace('Z', '').slice(0, -4) + ' UTC';
  }
  return d.toLocaleTimeString();
}
