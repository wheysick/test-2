// ===== /api/payments/recurly/charge.js — FINAL SAFE (token-only createPurchase) =====
const { Client } = require('recurly');

function send(res, status, body){
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return send(res, 405, { error:'Method Not Allowed' });

    const API_KEY = process.env.RECURLY_API_KEY;
    if (!API_KEY) return send(res, 500, { error:'Missing RECURLY_API_KEY' });

    const client = new Client(API_KEY);
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const token = body?.token?.id || body?.token;
    const qty   = Number(body?.qty || body?.order?.qty || 1) || 1;
    const unit  = Number(body?.unit_amount || body?.order?.unit_amount || 90) || 90;
    const customer = body?.customer || body?.order?.customer || {};

    if (!token) return send(res, 400, { error:'Missing card token' });

    const accountCode = 'acct_' + Date.now();

    const reqObj = {
      currency:'USD',
      account:{
        code: accountCode,
        firstName: customer.first_name || 'Customer',
        lastName:  customer.last_name  || 'Customer',
        email:     customer.email || 'buyer@example.com',
        billingInfo:{ tokenId: token }
      },
      lineItems:[{
        type:'charge',
        currency:'USD',
        unitAmount: unit,
        quantity: qty,
        description:'Tirz-Vial'
      }],
      collectionMethod:'automatic'
    };

    // Direct create (no preview) to reduce validation friction
    const purchase = await client.createPurchase(reqObj);

    return send(res, 200, { ok:true, id: purchase?.uuid || null, amount: qty*unit });
  } catch (e) {
    return send(res, 500, { error: e?.message || 'Server error' });
  }
};
