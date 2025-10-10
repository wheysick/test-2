// /api/payments/coinbase/create-charge.js
const COINBASE_API = 'https://api.commerce.coinbase.com/charges';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return json(res, 405, { error: 'Method Not Allowed' });
    }
    const apiKey = process.env.COINBASE_API_KEY;
    if (!apiKey) return json(res, 500, { error: 'Missing COINBASE_API_KEY' });

    let body = {};
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
    catch { return json(res, 400, { error: 'Invalid JSON body' }); }

    // Inputs from client
    const qty = Math.max(1, Math.min(99, parseInt(body.qty || 1, 10)));
    const email = (body.email || '').trim();

    // Recompute total on the server (must match UI logic)
    const MSRP = 90.00, TAX_RATE = 0.0874, ALT_DISC_RATE = 0.15;
    const merch = qty * MSRP;
    const disc  = +(merch * ALT_DISC_RATE).toFixed(2);        // Crypto qualifies for 15% off
    const taxable = Math.max(0, merch - disc);
    const tax   = +(taxable * TAX_RATE).toFixed(2);
    const total = +(taxable + tax).toFixed(2);

    const origin = req.headers?.origin || '';
    const redirectUrl = origin ? `${origin}/thank-you?method=crypto` : undefined;
    const cancelUrl   = origin ? `${origin}/?checkout=1` : undefined;

    // Build Coinbase charge
    const chargeReq = {
      name: `TIRZ – ${qty} paid + ${qty} free`,
      description: `Crypto checkout • ${qty}× @ $${MSRP} • 15% method discount + tax`,
      pricing_type: 'fixed_price',
      local_price: { amount: total.toFixed(2), currency: 'USD' },
      metadata: { email, qty, total },
      redirect_url: redirectUrl,
      cancel_url: cancelUrl
    };

    const resp = await fetch(COINBASE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CC-Api-Key': apiKey,
        'X-CC-Version': '2018-03-22'
      },
      body: JSON.stringify(chargeReq)
    });
    const data = await resp.json();

    if (!resp.ok || !data?.data?.hosted_url) {
      return json(res, resp.status || 500, { error: 'Coinbase charge failed', raw: data });
    }

    return json(res, 200, {
      hosted_url: data.data.hosted_url,
      charge_id: data.data.id,
      code: data.data.code,
      addresses: data.data.addresses || null
    });
  } catch (e) {
    return json(res, 500, { error: e?.message || 'Server error' });
  }
};
