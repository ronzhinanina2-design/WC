// Serverless proxy for the Poof.bg background-removal API.
// Keeps POOF_BG_API_KEY server-side (set as an env var in this Vercel project) —
// never ship it in client JS, where anyone opening dev tools could lift it and
// spend the account's quota. Frontend posts { image_b64 } and gets back a
// transparent-cutout PNG as a data URL, matching how photos are already stored
// (base64, inline in the synced record — see /data.js on the main site).

const POOF_URL = 'https://api.poof.bg/v1/remove';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function buildMultipart(fields) {
  const boundary = '----wcFormBoundary' + Math.random().toString(16).slice(2);
  const parts = [];
  for (const [name, value] of Object.entries(fields)) {
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${name}"\r\n\r\n` +
      `${value}\r\n`
    );
  }
  parts.push(`--${boundary}--\r\n`);
  return { body: parts.join(''), boundary };
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ code: 'method_not_allowed', message: 'Use POST' });

  const apiKey = process.env.POOF_BG_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ code: 'config_error', message: 'POOF_BG_API_KEY is not set on the server' });
  }

  let imageB64;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    imageB64 = body && body.image_b64;
  } catch {
    return res.status(400).json({ code: 'validation_error', message: 'Body must be JSON with an image_b64 field' });
  }
  if (!imageB64 || typeof imageB64 !== 'string') {
    return res.status(400).json({ code: 'missing_image', message: 'image_b64 is required' });
  }

  const { body, boundary } = buildMultipart({
    image_file_b64: imageB64,
    format: 'png',
    channels: 'rgba',
    size: 'medium',
  });

  let poofRes;
  try {
    poofRes = await fetch(POOF_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });
  } catch (e) {
    return res.status(502).json({ code: 'upstream_error', message: 'Could not reach Poof.bg', details: String(e) });
  }

  if (!poofRes.ok) {
    const errText = await poofRes.text().catch(() => '');
    let err;
    try { err = JSON.parse(errText); } catch { err = { code: 'upstream_error', message: errText || poofRes.statusText }; }
    return res.status(poofRes.status).json(err);
  }

  const arrayBuffer = await poofRes.arrayBuffer();
  const outB64 = Buffer.from(arrayBuffer).toString('base64');
  const contentType = poofRes.headers.get('content-type') || 'image/png';
  return res.status(200).json({ image_b64: `data:${contentType};base64,${outB64}` });
}
