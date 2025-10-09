// /api/payments/recurly/charge.js
import { Client } from 'recurly';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const apiKey = process.env.RECURLY_API_KEY=d408cdc265f54f48bbff859526ec4303;
    const siteId = process.env.RECURLY_SITE_ID=addoctor;
    if (!apiKey) return res.status(500).json({ error: 'Missing RECURLY_API_KEY' });
    if (!siteId) console.warn('[Recurly] RECURLY_SITE_ID not set (client tokenization uses site key; server uses API key).');

    const client = new Client(apiKey);
    const { token, order } = req.body || {};
    if (!token) return res.status(400).json({ error: 'Missing token' });

    const amount = Number(Number(order?.total || 90).toFixed(2));
    const c = order?.customer || {};
    const accountCode = (c?.email ? c.email.replace(/[^A-Za-z0-9_]/g,'_') : ('guest_'+Date.now())).slice(0,50);

    const purchaseReq = {
      currency: 'USD',
      collection_method: 'automatic',
      account: {
        code: accountCode,
        first_name: c.first_name || '',
        last_name:  c.last_name  || '',
        email:      c.email      || '',
        address: {
          street1: c.address || '',
          city:    c.city || '',
          region:  c.state || '',
          postal_code: c.zip || '',
          country: 'US'
        },
        billing_info: { token_id: token.id || token }
      },
      line_items: [{
        type: 'charge',
        unit_amount: amount,
        quantity: 1,
        description: `SelfHacking B1G1 qty=${order?.qty || 1}`
      }]
    };

    const purchase = await client.createPurchase(purchaseReq);
    return res.status(200).json({ ok: true, id: purchase?.uuid || null });
  } catch (e) {
    console.error('[Recurly] purchase error', e);
    const msg = e?.message || 'Recurly error';
    return res.status(e?.status || 500).json({ error: msg, details: e });
  }
}
