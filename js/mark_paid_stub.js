// /api/payments/cashapp/mark-paid.js — Vercel/Next.js API stub
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const body = await readJson(req);
    const { order_id, amount, cashtag, email, qty, meta } = body || {};
    if (!order_id || !amount) {
      return res.status(400).json({ error: 'Missing order_id or amount' });
    }
    // TODO: Persist to a DB / send to your ops system
    console.log('[cashapp:mark-paid]', { order_id, amount, cashtag, email, qty, meta });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
}

// helper to parse body reliably across runtimes
async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let data = '';
  for await (const chunk of req) data += chunk;
  return data ? JSON.parse(data) : {};
}
