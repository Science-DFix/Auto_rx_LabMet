// Thin fetch wrappers around the existing Flask REST endpoints.
// GET helpers resolve (never throw) - callers decide what a missing
// result means, mirroring the resilience fix applied to the legacy UI.

async function getJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`${url} returned HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`${url} failed: ${err}`);
    return null;
  }
}

// POST helpers throw on failure (403 = bad password, 404 = nothing to
// act on, 500 = server error) - callers surface these to the user, since
// unlike the read-only GETs these are user-initiated actions that need
// explicit success/failure feedback.
async function postForm(url, fields) {
  const body = new URLSearchParams(fields);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const err = new Error(`${url} returned HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.text();
}

export const getConfig = () => getJson('/get_config');
export const getTelemetryArchive = () => getJson('/get_telemetry_archive');
export const getTaskList = () => getJson('/get_task_list');
export const getVersion = () => getJson('/get_version');
export const getScanData = () => getJson('/get_scan_data');
export const getLogList = () => getJson('/get_log_list');
export const getLogBySerial = (serial) => getJson(`/get_log_by_serial/${encodeURIComponent(serial)}`);
export const getLogDetail = (serial, decimation = 25) =>
  postForm('/get_log_detail', { serial, decimation }).then((t) => JSON.parse(t));

export const checkPassword = (password) => postForm('/check_password', { password });
export const startDecoder = (password, freqHz, type) =>
  postForm('/start_decoder', { password, freq: freqHz, type });
export const stopDecoder = (password, freqHz, lockout = false) =>
  postForm('/stop_decoder', lockout ? { password, freq: freqHz, lockout: 1 } : { password, freq: freqHz });
export const disableScanner = (password) => postForm('/disable_scanner', { password });
export const enableScanner = (password) => postForm('/enable_scanner', { password });
export const moveRotator = (password, az, el) => postForm('/move_rotator', { password, az, el });
export const homeRotator = (password) => postForm('/home_rotator', { password });
