// /api/payments/coinbase/create-charge.js (Express)
import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

router.post('/api/payments/coinbase/create-charge', async (req, res) => {
  try {
    const { qty = 1, email = '', total = 0, meta = {} } = req.body || {};
    const amount = Number(total).toFixed(2);

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
        local_price: { amount, currency: 'USD' },
        metadata: { ...meta, email, qty },
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
});

export default router;
