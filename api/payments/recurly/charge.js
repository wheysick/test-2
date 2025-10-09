// /api/payments/recurly/charge.js — One-time purchase using token_id
const { Client } = require('recurly');

function bad(res, status, message){
  res.statusCode = status; res.setHeader('Content-Type','application/json');
  res.end(JSON.stringify({ error: message }));
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return bad(res, 405, 'Method not allowed');

    const apiKey = process.env.RECURLY_API_KEY;
    const siteId = process.env.RECURLY_SITE_ID;
    if (!apiKey || !siteId) return bad(res, 500, 'Missing Recurly credentials');

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const token = body.token;
    const qty = Number(body.qty || 1);
    const unit = Number(body.unit_amount || 90);
    const currency = body.currency || 'USD';

    if (!token) return bad(res, 400, 'Missing token');
    if (!(qty > 0)) return bad(res, 400, 'Invalid quantity');

    const client = new Client(apiKey, { siteId });

    const accountCode = `acct-${Date.now()}-${Math.floor(Math.random()*1e5)}`;

    const purchaseReq = {
      currency,
      account: {
        code: accountCode,
        billing_info: { token_id: token }
      },
      line_items: [{
        type: 'charge',
        currency,
        unit_amount: unit,
        quantity: qty,
        description: 'One-time purchase'
      }]
    };

    const purchase = await client.createPurchase(purchaseReq);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, id: purchase && purchase.uuid }));
  } catch (e) {
    const status = e && e.status || 500;
    const message = (e && e.message) || 'Server error';
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: message }));
  }
};
