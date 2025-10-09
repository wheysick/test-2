// /api/payments/recurly/charge.js
import { Client } from 'recurly';

function parseRecurlyError(e){
  let payload = null;
  try { payload = e?.body && typeof e.body === 'string' ? JSON.parse(e.body) : e?.body; } catch {}
  const message = payload?.error?.message || e?.message || 'Validation error';
  const errors  = (payload?.error?.params || []).map(p => (p?.param ? `${p.param}: ${p.message}` : p?.message)).filter(Boolean);
  return { status: e?.status || 422, message, errors, raw: payload || e };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const apiKey = process.env.RECURLY_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing RECURLY_API_KEY' });

    const client = new Client(apiKey);

    const { token, order } = req.body || {};
    if (!token) return res.status(400).json({ error: 'Missing token' });

    const amount = Number(Number(order?.total || 90).toFixed(2));
    const email  = order?.customer?.email || `guest+${Date.now()}@example.com`;
    const accountCode = `guest_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;

    const purchaseReq = {
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
    };

    try {
      await client.previewPurchase(purchaseReq);
    } catch (e) {
      const pe = parseRecurlyError(e);
      return res.status(pe.status).json({ error: pe.message, errors: pe.errors, raw: pe.raw });
    }

    const purchase = await client.createPurchase(purchaseReq);
    return res.status(200).json({ ok: true, id: purchase?.uuid || null });
  } catch (e) {
    const pe = parseRecurlyError(e);
    return res.status(pe.status).json({ error: pe.message, errors: pe.errors, raw: pe.raw });
  }
}
