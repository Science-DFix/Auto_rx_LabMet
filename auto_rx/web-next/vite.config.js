import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// Local evaluation prototype only - proxies API/Socket.IO calls straight
// through to the existing Flask backend (started separately via auto_rx.py),
// so this dev server only needs to own the presentation layer.
// Override with AUTORX_BACKEND if your station.cfg uses a non-default web_port.
const BACKEND = process.env.AUTORX_BACKEND || 'http://127.0.0.1:5000'

const apiRoutes = [
  '/get_version',
  '/get_task_list',
  '/get_config',
  '/get_scan_data',
  '/get_telemetry_archive',
  '/get_log_list',
  '/get_log_by_serial',
  '/get_log_detail',
  '/export_all_log_files',
  '/export_log_files',
  '/generate_kml',
  '/check_password',
  '/start_decoder',
  '/stop_decoder',
  '/disable_scanner',
  '/enable_scanner',
  '/move_rotator',
  '/home_rotator',
]

// changeOrigin rewrites the outgoing Host header to match the backend, but leaves
// the browser's original Origin header (http://127.0.0.1:5173) intact. Flask-SocketIO
// (and Flask-CORS-style checks in general) compare Origin against Host and reject the
// mismatch - silently to us, since our own Node-based connection tests never sent an
// Origin header at all and so never hit this. Rewriting Origin to match the backend
// keeps this fix contained to the dev proxy, instead of loosening CORS in the real app.
function rewriteOriginToBackend(proxy) {
  proxy.on('proxyReq', (proxyReq) => {
    proxyReq.setHeader('origin', BACKEND)
  })
  proxy.on('proxyReqWs', (proxyReq) => {
    proxyReq.setHeader('origin', BACKEND)
  })
}

const proxy = {
  '/socket.io': { target: BACKEND, ws: true, changeOrigin: true, configure: rewriteOriginToBackend },
}
for (const route of apiRoutes) {
  proxy[route] = { target: BACKEND, changeOrigin: true, configure: rewriteOriginToBackend }
}

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5173,
    proxy,
  },
})
