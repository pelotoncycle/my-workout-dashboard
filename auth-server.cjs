/**
 * Local auth server — runs alongside Vite dev server in the Bureau container.
 *
 * Because api.onepeloton.com/auth/login is Cloudflare-protected and blocks
 * server-side (non-browser) requests, we can't proxy it through Vite directly.
 *
 * Instead this tiny Node.js server runs on port 3001 and calls the Peloton
 * internal auth-self-service to generate a port-authority JWT — bypassing
 * Cloudflare entirely. Vite proxies /local-auth → localhost:3001.
 *
 * Only works when running inside the Peloton cluster (Bureau container).
 */

const http = require('http');
const PORT = 3001;

const AUTH_SERVICE = 'http://auth-self-service-token-gen.auth-self-service.svc.cluster.local';
const PA_ENV = process.env.PORT_AUTH_ENV || 'prod';
const CF_JWT = process.env.CF_ACCESS_JWT || '';

// Scopes required for dashboard: read profile + workouts
const SCOPES = 'openid offline_access 3p.workout:r 3p.user:r';

// Cache the client ID so we only fetch it once per server lifetime
let cachedClientId = null;

async function getClientId() {
  if (cachedClientId) return cachedClientId;

  const res = await fetch(`${AUTH_SERVICE}/api/auth/clients?environment=${PA_ENV}`, {
    headers: { 'Cf-Access-Jwt-Assertion': CF_JWT },
  });
  if (!res.ok) throw new Error(`auth-service clients failed: ${res.status}`);

  const clients = await res.json();
  const client = clients.find((c) => c.name === 'User Platform Example App (3p)');
  if (!client) throw new Error('3P client "User Platform Example App (3p)" not found');

  cachedClientId = client.clientId;
  return cachedClientId;
}

async function generateToken(email, password) {
  if (!CF_JWT) throw new Error('CF_ACCESS_JWT not set in environment');

  const clientId = await getClientId();

  const res = await fetch(`${AUTH_SERVICE}/api/auth/generate`, {
    method: 'POST',
    headers: {
      'Cf-Access-Jwt-Assertion': CF_JWT,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clientId,
      username: email,
      password,
      environment: PA_ENV,
      scopes: SCOPES,
    }),
  });

  const data = await res.json();

  if (!data.accessToken) {
    // 401 from auth-service means wrong credentials
    const err = new Error(data.message || data.error || 'Authentication failed');
    err.status = res.ok ? 500 : res.status;
    throw err;
  }

  return data.accessToken;
}

const server = http.createServer(async (req, res) => {
  // CORS headers so the browser can call this directly if needed
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST' || req.url !== '/login') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', async () => {
    try {
      const { username_or_email, password } = JSON.parse(body);
      if (!username_or_email || !password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'username_or_email and password are required' }));
        return;
      }

      const token = await generateToken(username_or_email, password);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ access_token: token }));
    } catch (err) {
      const status = err.status === 401 ? 401 : 500;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[auth-server] Listening on port ${PORT} (env: ${PA_ENV})`);
});
