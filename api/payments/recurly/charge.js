// /api/payments/recurly/charge.js
import Recurly from 'recurly';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const apiKey = process.env.RECURLY_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing RECURLY_API_KEY' });
    const recurly = new Recurly(apiKey);
    const { token, order } = req.body || {};
    if (!token) return res.status(400).json({ error: 'Missing token' });

    const purchase = await recurly.createPurchase({
      currency: 'USD',
      collection_method: 'automatic',
      line_items: [{
        type: 'charge',
        currency: 'USD',
        unit_amount: String(order?.total || '90.00'),
        quantity: 1,
        description: `SelfHacking B1G1 qty=${order?.qty || 1}`
      }],
      billing_info: { token_id: token.id || token }
    });

    res.status(200).json({ ok: true, id: purchase?.uuid || null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e?.message || 'Recurly error' });
  }
}
