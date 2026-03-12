/**
 * Local auth server — runs alongside Vite dev server in the Bureau container.
 *
 * Two endpoints:
 *   POST /auto-login  — uses PELOTON_EMAIL/PASSWORD from the environment (vault)
 *   POST /login       — accepts { username_or_email, password } from the user
 */
const http = require('http');
const PORT = 3001;

const AUTH_SERVICE = 'http://auth-self-service-token-gen.auth-self-service.svc.cluster.local';
const PA_ENV = process.env.PORT_AUTH_ENV || 'prod';
const CF_JWT = process.env.CF_ACCESS_JWT || '';
const VAULT_EMAIL = process.env.PELOTON_EMAIL || '';
const VAULT_PASSWORD = process.env.PELOTON_PASSWORD || '';
const SCOPES = 'openid offline_access 3p.workout:r 3p.user:r';

let cachedClientId = null;

async function getClientId() {
  if (cachedClientId) return cachedClientId;
  const res = await fetch(`${AUTH_SERVICE}/api/auth/clients?environment=${PA_ENV}`, {
    headers: { 'Cf-Access-Jwt-Assertion': CF_JWT },
  });
  if (!res.ok) throw new Error(`auth-service /clients failed: ${res.status}`);
  const clients = await res.json();
  const client = clients.find((c) => c.name === 'User Platform Example App (3p)');
  if (!client) throw new Error('3P client not found');
  cachedClientId = client.clientId;
  return cachedClientId;
}

async function generateToken(email, password) {
  if (!CF_JWT) throw new Error('CF_ACCESS_JWT not set in environment');
  const clientId = await getClientId();
  const res = await fetch(`${AUTH_SERVICE}/api/auth/generate`, {
    method: 'POST',
    headers: { 'Cf-Access-Jwt-Assertion': CF_JWT, 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, username: email, password, environment: PA_ENV, scopes: SCOPES }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch {
    const err = new Error(res.ok ? 'Unexpected auth response' : 'Incorrect email or password');
    err.status = res.ok ? 500 : 401;
    throw err;
  }
  if (!data.accessToken) {
    const err = new Error(data.message || data.error || 'Authentication failed');
    err.status = res.ok ? 500 : res.status;
    throw err;
  }
  return data.accessToken;
}

function respond(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { respond(res, 204, {}); return; }
  if (req.method !== 'POST') { respond(res, 405, { error: 'Method not allowed' }); return; }

  // Auto-login using vault credentials — no user input needed
  if (req.url === '/auto-login') {
    if (!VAULT_EMAIL || !VAULT_PASSWORD) {
      respond(res, 200, { access_token: null, has_vault_creds: false });
      return;
    }
    try {
      const token = await generateToken(VAULT_EMAIL, VAULT_PASSWORD);
      respond(res, 200, { access_token: token, has_vault_creds: true });
    } catch (err) {
      console.error('[auth-server] auto-login failed:', err.message);
      respond(res, 200, { access_token: null, has_vault_creds: true, error: err.message });
    }
    return;
  }

  // Manual login with user-supplied credentials
  if (req.url === '/login') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const { username_or_email, password } = JSON.parse(body);
        if (!username_or_email || !password) {
          respond(res, 400, { error: 'Email and password are required' });
          return;
        }
        const token = await generateToken(username_or_email, password);
        respond(res, 200, { access_token: token });
      } catch (err) {
        const status = err.status === 401 ? 401 : 500;
        respond(res, status, { error: err.message });
      }
    });
    return;
  }

  respond(res, 404, { error: 'Not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  const hasVaultCreds = !!(VAULT_EMAIL && VAULT_PASSWORD);
  console.log(`[auth-server] port ${PORT} | env: ${PA_ENV} | vault creds: ${hasVaultCreds}`);
});
