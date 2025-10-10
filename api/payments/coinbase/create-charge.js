export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { qty = 1, meta = {} } = req.body || {};
    // Recompute total server-side
    const PRICE = 90, TAX_RATE = 0.0874, ALT_DISC = 0.15;
    const merch = qty * PRICE;
    const disc = merch * ALT_DISC;
    const taxable = Math.max(0, merch - disc);
    const tax = Math.round(taxable * TAX_RATE * 100) / 100;
    const total = (taxable + tax).toFixed(2);

    const r = await fetch('https://api.commerce.coinbase.com/charges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CC-Api-Key': process.env.COINBASE_COMMERCE_API_KEY,
        'X-CC-Version': '2018-03-22'
      },
      body: JSON.stringify({
        name: 'Tirzepatide Bundle',
        description: `${qty} paid + ${qty} free`,
        pricing_type: 'fixed_price',
        local_price: { amount: total, currency: 'USD' },
        metadata: { ...meta, qty },
        redirect_url: `${process.env.PUBLIC_BASE_URL}/thank-you?m=crypto`,
        cancel_url: `${process.env.PUBLIC_BASE_URL}/checkout?m=crypto`
      })
    });
    const d = await r.json();
    if (!r.ok || !d?.data?.hosted_url) {
      return res.status(r.status || 500).json({ error: d?.error?.message || 'Failed to create charge' });
    }
    res.json({ hosted_url: d.data.hosted_url, charge_code: d.data.code });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
}
