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

function acuityRequest(options, bodyStr) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function notifyInternalApp(payload) {
  return new Promise((resolve) => {
    const body = JSON.stringify(payload);
    const req = https.request({
      hostname: 'sfac-mu.vercel.app',
      path: '/api/booking-notification',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      res.resume();
      res.on('end', resolve);
    });
    req.on('error', resolve);
    req.write(body);
    req.end();
  });
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

  try {
    const { status, body: responseBody } = await acuityRequest({
      hostname: 'acuityscheduling.com',
      path: `/api/v1${acuityPath}${query}`,
      method: req.method,
      headers: {
        'Authorization': `Basic ${ACUITY_AUTH}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    }, bodyStr);

    // If this was a successful booking creation, notify internal app before responding
    if (isCreateAppointment && (status === 200 || status === 201)) {
      try {
        const appt = JSON.parse(responseBody);
        const reqBody = bodyStr ? JSON.parse(bodyStr) : {};
        const notes = reqBody.notes || '';

        await notifyInternalApp({
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
          address:      extractFromNotes(notes, 'service address'),
          promoCode:    extractPromoCode(notes),
          promoPercent: extractPromoPercent(notes),
          multiVehicle: notes.includes('Additional Vehicles'),
          finalTotal:   extractTotal(notes),
          notes,
        });
      } catch (_) {}
    }

    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(responseBody);
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message }));
  }
};
