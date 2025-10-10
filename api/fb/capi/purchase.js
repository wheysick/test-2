import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const body = await readJson(req);
    const { order_id, value, currency='USD', qty=1, price, email='', phone='', fbp, fbc, user_agent } = body || {};

    const PIXEL_ID = process.env.FB_PIXEL_ID;
    const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
    if (!PIXEL_ID || !ACCESS_TOKEN) return res.status(500).json({ error: 'Missing FB_PIXEL_ID or FB_ACCESS_TOKEN' });

    const norm = s => (s||'').toString().trim().toLowerCase();
    const sha = s => crypto.createHash('sha256').update(norm(s)).digest('hex');

    const ip = (req.headers['x-forwarded-for']||'').split(',')[0] || req.socket?.remoteAddress || '';
    const ua = user_agent || req.headers['user-agent'] || '';
    const contents = [{ id:'tirz-vial', quantity: qty, item_price: price || (value && qty ? (value/qty) : undefined) }];

    const payload = {
      data: [{
        event_name: 'Purchase',
        event_time: Math.floor(Date.now()/1000),
        action_source: 'website',
        event_id: order_id, // dedup with Pixel
        event_source_url: `${req.headers['x-forwarded-proto']||'https'}://${req.headers.host}${req.url}`,
        user_data: {
          em: email ? [sha(email)] : undefined,
          ph: phone ? [sha(phone.replace(/\D/g,''))] : undefined,
          client_ip_address: ip || undefined,
          client_user_agent: ua || undefined,
          fbp: fbp || getCookie(req,'_fbp'),
          fbc: fbc || getCookie(req,'_fbc'),
        },
        custom_data: { currency, value, content_type:'product', contents }
      }]
      // ,test_event_code: process.env.FB_TEST_EVENT_CODE
    };

    const r = await fetch(`https://graph.facebook.com/v18.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
    });
    const out = await r.json().catch(()=>null);
    if (!r.ok) return res.status(r.status).json({ error: out || 'FB CAPI error' });
    res.status(200).json({ ok:true, fb: out });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
}
function getCookie(req, name){ const m=(req.headers.cookie||'').match(new RegExp(name+'=([^;]+)')); return m?m[1]:undefined; }
async function readJson(req){ if (req.body && typeof req.body==='object') return req.body;
  let s=''; for await (const c of req) s+=c; return s?JSON.parse(s):{}; }
