// /api/payments/recurly/charge.js  — CommonJS — one‑time purchase with preview + purchase
const { Client } = require('recurly');

function parseRecurlyError(e){
  let payload = null;
  try {
    payload = e && e.body && typeof e.body === 'string' ? JSON.parse(e.body) : e && e.body;
  } catch {}
  const message = (payload && payload.error && payload.error.message) || (e && e.message) || 'Validation error';
  const params  = (payload && payload.error && payload.error.params) || [];
  const errors  = params.map(p => (p && (p.param ? `${p.param}: ${p.message}` : p.message))).filter(Boolean);
  return { status: (e && e.status) || 422, message, errors, raw: payload || e };
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method Not Allowed' }));
      return;
    }

    const apiKey = process.env.RECURLY_API_KEY;
    if (!apiKey) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing RECURLY_API_KEY' }));
      return;
    }

    const client = new Client(apiKey);

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const token = body.token;
    const order = body.order || {};

    if (!token) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing token' }));
      return;
    }

    const amount = Number(Number(order.total || 90).toFixed(2));
    const email  = (order.customer && order.customer.email) || `guest+${Date.now()}@example.com`;
    const accountCode = `guest_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;

    const purchaseReq = {
      currency: 'USD',
      collection_method: 'automatic',
      account: {
        code: accountCode,
        email,
        billing_info: { token_id: (token.id || token) }
      },
      line_items: [{
        type: 'charge',
        unit_amount: amount,
        quantity: 1,
        description: `One-time checkout qty=${order.qty || 1}`
      }]
    };

    try {
      await client.previewPurchase(purchaseReq);
    } catch (e) {
      const pe = parseRecurlyError(e);
      res.statusCode = pe.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: pe.message, errors: pe.errors, raw: pe.raw }));
      return;
    }

    const purchase = await client.createPurchase(purchaseReq);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, id: (purchase && purchase.uuid) || null }));
  } catch (e) {
    const pe = parseRecurlyError(e);
    res.statusCode = pe.status || 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: pe.message, errors: pe.errors, raw: pe.raw }));
  }
};
