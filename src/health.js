// Minimal liveness endpoint for Docker's HEALTHCHECK and container
// orchestrators (Portainer/ZimaOS show container health from it).
//
// Off unless HEALTH_PORT is set. `ready` flips true once the Discord gateway
// is connected, so a bot stuck mid-login can be told apart from a healthy one.

import http from 'node:http';

export function startHealthServer({ port, client } = {}) {
  const startedAt = Date.now();
  return http.createServer((req, res) => {
    if (req.url !== '/healthz') {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'not found' }));
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        ready: Boolean(client?.user),
        uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
      }),
    );
  }).listen(port);
}
