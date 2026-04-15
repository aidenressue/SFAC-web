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

  // Vercel rewrite passes the path as ?_path=/availability/dates
  // The original query params are also present in req.url
  const urlObj = new URL(req.url, 'http://localhost');
  const acuityPath = urlObj.searchParams.get('_path') || '';
  urlObj.searchParams.delete('_path');
  const query = urlObj.search; // remaining query params

  const options = {
    hostname: 'acuityscheduling.com',
    path: `/api/v1${acuityPath}${query}`,
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
