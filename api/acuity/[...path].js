const https = require('https');

const ACUITY_AUTH = Buffer.from(
  `${process.env.ACUITY_USER_ID}:${process.env.ACUITY_API_KEY}`
).toString('base64');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const segments = Array.isArray(req.query.path) ? req.query.path : [req.query.path];
  const acuityPath = '/' + segments.join('/');

  const params = Object.assign({}, req.query);
  delete params.path;
  const query = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';

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
    res.statusCode = proxyRes.statusCode;
    res.setHeader('Content-Type', 'application/json');
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (e) => {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message }));
  });

  if (req.method === 'POST' && req.body) {
    proxyReq.write(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
  }

  proxyReq.end();
};
