// /api/payments/recurly/charge.js  (ONE‑TIME PURCHASE, MINIMAL)
import { Client } from 'recurly';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const apiKey = process.env.RECURLY_API_KEY=d408cdc265f54f48bbff859526ec4303;
    if (!apiKey) return res.status(500).json({ error: 'Missing RECURLY_API_KEY' });
    const client = new Client(apiKey);

    const { token, order } = req.body || {};
    if (!token) return res.status(400).json({ error: 'Missing token' });

    const amount = Number(Number(order?.total || 90).toFixed(2));
    const email  = order?.customer?.email || `guest+${Date.now()}@example.com`;

    // Use a unique account code every time to avoid 'code already taken' validation errors.
    const accountCode = `guest_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;

    const purchase = await client.createPurchase({
      currency: 'USD',
      collection_method: 'automatic',
      account: {
        code: accountCode,
        email,
        billing_info: { token_id: token.id || token }
      },
      line_items: [{
        type: 'charge',
        unit_amount: amount,
        quantity: 1,
        description: `One-time checkout qty=${order?.qty || 1}`
      }]
    });

    return res.status(200).json({ ok: true, id: purchase?.uuid || null });
  } catch (e) {
    console.error('[Recurly] purchase error', e);
    // Normalize Recurly API error payload if present
    let message = e?.message || 'Validation error';
    if (e?.body && typeof e.body === 'string') {
      try {
        const parsed = JSON.parse(e.body);
        message = parsed?.error?.message || message;
        return res.status(e?.status || 422).json({ error: message, raw: parsed });
      } catch {}
    }
    return res.status(e?.status || 422).json({ error: message, details: e });
  }
}
