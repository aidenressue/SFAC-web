const https = require('https');

const ACUITY_AUTH = Buffer.from(
  `${process.env.ACUITY_USER_ID}:${process.env.ACUITY_API_KEY}`
).toString('base64');

const SUPABASE_URL = 'https://janzjvhkpiminuscxzzv.supabase.co';

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

function extractTotal(notes) {
  if (!notes) return null;
  const match = notes.match(/Total Due: \$(\d+)/i);
  return match ? parseInt(match[1]) : null;
}

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = https.request({
      hostname,
      path,
      method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(bodyStr) },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function acuityRequest(method, path, query, bodyStr) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'acuityscheduling.com',
      path: `/api/v1${path}${query}`,
      method,
      headers: {
        'Authorization': `Basic ${ACUITY_AUTH}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function saveToSupabase(appt, reqBody) {
  const supabaseKey = process.env.SUPABASE_KEY;
  if (!supabaseKey) return;

  const notes = reqBody.notes || '';
  const address = extractFromNotes(notes, 'service address');
  const promoCode = extractPromoCode(notes);
  const finalTotal = extractTotal(notes);

  const scheduledDate = (() => {
    try { return new Date(appt.datetime).toISOString().slice(0, 10); }
    catch { return appt.date; }
  })();

  const booking = {
    client_name:                  `${appt.firstName} ${appt.lastName}`.trim(),
    service_type:                 appt.type,
    service_location:             address,
    scheduled_date:               scheduledDate,
    scheduled_time:               appt.time,
    duration_minutes:             appt.duration || null,
    status:                       'scheduled',
    source:                       'website_booking',
    notes:                        notes || null,
    website_submission_reference: String(appt.id),
    calendar_event_reference:     null,
    client_id:                    null,
    client_type:                  'residential',
  };

  await httpsPost('janzjvhkpiminuscxzzv.supabase.co', '/rest/v1/bookings', {
    'Content-Type': 'application/json',
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Prefer': 'return=minimal',
  }, booking);
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
    const { status, body: responseBody } = await acuityRequest(req.method, acuityPath, query, bodyStr);

    if (isCreateAppointment && (status === 200 || status === 201)) {
      try {
        const appt = JSON.parse(responseBody);
        const reqBody = bodyStr ? JSON.parse(bodyStr) : {};
        await saveToSupabase(appt, reqBody);
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
