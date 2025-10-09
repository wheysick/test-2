// ===== /api/payments/recurly/charge.js — v2.1 (address1 + nested shipping_addresses) =====
// Environment variable required in Vercel:
//   RECURLY_API_KEY = <your private API key>
// Expects JSON: { token, customer }
//   token: Recurly token object or token.id
//   customer: { first_name, last_name, email, phone, address, city, state, zip, items:[{sku, qty, price}] }

const { Client } = require('recurly');

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function parseError(e) {
  let payload = null;
  try {
    payload =
      e && e.body && typeof e.body === 'string'
        ? JSON.parse(e.body)
        : (e && e.body) || null;
  } catch {}

  const message =
    (payload && payload.error && payload.error.message) ||
    e?.message ||
    'Payment failed';
  const params = (payload && payload.error && payload.error.params) || [];
  const errors = Array.isArray(params)
    ? params
        .map((p) =>
          p?.param ? `${p.param}: ${p.message}` : p?.message
        )
        .filter(Boolean)
    : [];
  return { status: e?.status || 422, message, errors, raw: payload || e };
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return json(res, 405, { error: 'Method Not Allowed' });
    }

    const apiKey = process.env.RECURLY_API_KEY;
    if (!apiKey) {
      return json(res, 500, {
        error: 'Server not configured: missing RECURLY_API_KEY env var',
      });
    }

    let body = {};
    try {
      body =
        typeof req.body === 'string'
          ? JSON.parse(req.body)
          : req.body || {};
    } catch {
      return json(res, 400, { error: 'Invalid JSON body' });
    }

    const token = body?.token?.id || body?.token;
    const customer = body?.customer || {};
    if (!token) return json(res, 400, { error: 'Missing card token' });

    const client = new Client(apiKey);

    // Unique account code per purchase
    const accountCode = `acct_${Date.now()}`;

    // Line items from client
    const items =
      Array.isArray(customer.items) && customer.items.length
        ? customer.items
        : [{ sku: 'tirz-vial', qty: 1, price: 90 }];

    const lineItems = items.map((it) => ({
      type: 'charge',
      currency: 'USD',
      unitAmount: Number(it.price),
      quantity: Number(it.qty) || 1,
      description: it.sku || 'Item',
    }));

    // Build purchase request (with proper nested shipping address)
    const purchaseReq = {
      currency: 'USD',
      account: {
        code: accountCode,
        firstName: customer.first_name || 'Customer',
        lastName: customer.last_name || 'Customer',
        email: customer.email,
        billingInfo: { tokenId: token },

        // ✅ Correctly nested shipping address with valid field names
        shippingAddresses: [
          {
            firstName: customer.first_name || 'Customer',
            lastName: customer.last_name || 'Customer',
            address1: customer.address || '',
            city: customer.city || '',
            region: customer.state || '',
            postalCode: customer.zip || '',
            country: 'US',
            phone: customer.phone || '',
          },
        ],
      },
      lineItems,
      collectionMethod: 'automatic', // immediate capture
    };

    // Validate before charge
    await client.previewPurchase(purchaseReq);

    // Charge card
    const purchase = await client.createPurchase(purchaseReq);

    // Success
    return json(res, 200, {
      ok: true,
      id: purchase?.uuid || null,
      invoiceNumber: purchase?.chargeInvoice?.number || null,
    });
  } catch (e) {
    const pe = parseError(e);
    return json(res, pe.status || 500, {
      error: pe.message,
      errors: pe.errors,
      raw: pe.raw,
    });
  }
};
