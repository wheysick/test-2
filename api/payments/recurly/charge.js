// /api/payments/recurly/charge.js — one‑time purchase with preview + purchase
const { Client } = require('recurly');

function parseRecurlyError(e){
  let payload = null;
  try { payload = e && e.body && typeof e.body === 'string' ? JSON.parse(e.body) : e && e.body; } catch {}
  const message = (payload && payload.error && payload.error.message) || (e && e.message) || 'Validation error';
  const params  = (payload && payload.error && payload.error.params) || [];
  const errors  = params.map(p => (p && (p.param ? `${p.param}: ${p.message}` : p.message))).filter(Boolean);
  return { status: (e && e.status) || 422, message, errors, raw: payload || e };
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Allow', 'POST');
      res.end(JSON.stringify({ error: 'Method Not Allowed' }));
      return;
    }

    const { token, customer } = req.body || {};
    if (!token) throw new Error('Missing Recurly token');

    // Create client (set REURLY_API_KEY in your project/environment)
    const client = new Client(process.env.RECURLY_API_KEY);

    // Build purchase
    const accountCode = `acct_${Date.now()}`;
    const purchaseReq = {
      currency: 'USD',
      account: {
        code: accountCode,
        firstName: customer?.first_name || 'Customer',
        lastName:  customer?.last_name  || 'Customer',
        email:     customer?.email,
        billingInfo: { tokenId: token.id || token }
      },
      // simple line item (adapt to your SKU/price)
      lineItems: [{ type: 'charge', currency: 'USD', unitAmount: 90.0, quantity: 1, description: 'TIRZ sample kit' }],
      shippingAddress: customer ? {
        firstName: customer.first_name,
        lastName:  customer.last_name,
        street1:   customer.address,
        city:      customer.city,
        region:    customer.state,
        postalCode:customer.zip,
        country:   'US'
      } : undefined,
      // Immediate capture
      collectionMethod: 'automatic'
    };

    // (Optional) Preview (validates)
    await client.previewPurchase(purchaseReq);

    // Capture
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
