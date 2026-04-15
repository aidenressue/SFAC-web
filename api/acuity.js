import https from 'https';

const ACUITY_AUTH = Buffer.from(
  `${process.env.ACUITY_USER_ID}:${process.env.ACUITY_API_KEY}`
).toString('base64');

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // Strip /api/acuity prefix to get the actual Acuity path
  const full = req.url; // e.g. /api/acuity/appointment-types?foo=bar
  const acuityPath = full.replace(/^\/api\/acuity/, '');

  const options = {
    hostname: 'acuityscheduling.com',
    path: `/api/v1${acuityPath}`,
    method: req.method,
    headers: {
      'Authorization': `Basic ${ACUITY_AUTH}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.status(proxyRes.statusCode);
    res.setHeader('Content-Type', 'application/json');
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (e) => {
    res.status(500).json({ error: e.message });
  });

  if (req.method === 'POST' && req.body) {
    proxyReq.write(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
  }

  proxyReq.end();
}
