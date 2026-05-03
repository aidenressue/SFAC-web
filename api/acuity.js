const https = require('https');

const ACUITY_AUTH = Buffer.from(
  `${process.env.ACUITY_USER_ID}:${process.env.ACUITY_API_KEY}`
).toString('base64');

function extractFromNotes(notes, key) {
  if (!notes) return null;
  const line = notes.split('\n').find(l => l.toLowerCase().startsWith(key.toLowerCase()));
  if (!line) return null;
  return line.slice(line.indexOf(':') + 1).trim() || null;
}

function extractPromoCode(notes) {
  if (!notes) return null;
  const match = notes.match(/Promo Code \(([^,)]+)/i);
  return match?.[1]?.trim() ?? null;
}

function extractPromoPercent(notes) {
  if (!notes) return 0;
  const match = notes.match(/Promo Code \([^,]+,\s*(\d+)%/i);
  return match ? parseInt(match[1]) : 0;
}

function extractTotal(notes) {
  if (!notes) return null;
  const match = notes.match(/Total Due: \$(\d+)/i);
  return match ? parseInt(match[1]) : null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const urlObj = new URL(req.url, 'http://localhost');
  const acuityPath = '/' + (urlObj.searchParams.get('_p') || '');
  urlObj.searchParams.delete('_p');
  const query = urlObj.search;

  const isCreateAppointment = req.method === 'POST' && acuityPath === '/appointments';
  const bodyStr = (req.method === 'POST' && req.body)
    ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body))
    : null;

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

    // For appointment creation, buffer the response so we can read + forward it
    if (isCreateAppointment) {
      let data = '';
      proxyRes.on('data', chunk => data += chunk);
      proxyRes.on('end', () => {
        res.end(data);

        // If booking was created successfully, notify internal app (server-side, no CORS)
        if (proxyRes.statusCode === 200 || proxyRes.statusCode === 201) {
          try {
            const appt = JSON.parse(data);
            const reqBody = bodyStr ? JSON.parse(bodyStr) : {};
            const notes = reqBody.notes || '';

            const address   = extractFromNotes(notes, 'service address');
            const promoCode = extractPromoCode(notes);
            const promoPercent = extractPromoPercent(notes);
            const finalTotal = extractTotal(notes);

            const payload = JSON.stringify({
              acuityId:     appt.id,
              firstName:    appt.firstName,
              lastName:     appt.lastName,
              email:        appt.email,
              phone:        appt.phone,
              service:      appt.type,
              datetime:     appt.datetime,
              date:         appt.date,
              time:         appt.time,
              duration:     appt.duration,
              address,
              promoCode,
              promoPercent,
              multiVehicle: notes.includes('Additional Vehicles'),
              finalTotal,
              notes,
            });

            const notifyReq = https.request({
              hostname: 'sfac-mu.vercel.app',
              path: '/api/booking-notification',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
              },
            });
            notifyReq.on('error', () => {});
            notifyReq.write(payload);
            notifyReq.end();
          } catch (_) {}
        }
      });
    } else {
      proxyRes.pipe(res);
    }
  });

  proxyReq.on('error', (e) => {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message }));
  });

  if (bodyStr) proxyReq.write(bodyStr);
  proxyReq.end();
};
