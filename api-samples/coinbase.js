// api-samples/coinbase.js — Next.js (or Express) create-charge example
// npm i node-fetch --save  (or use global fetch in Next 13+)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const apiKey = process.env.COINBASE_COMMERCE_API_KEY; // secret
  try {
    const { order } = req.body;
    const body = {
      name: 'SelfHacking Sample',
      description: 'Buy 1 Get 1 Free',
      pricing_type: 'fixed_price',
      local_price: { amount: String(order.total || 90.00), currency: 'USD' },
      metadata: { qty: order.qty, method: 'crypto' },
      redirect_url: process.env.COINBASE_SUCCESS_URL || 'https://example.com/success',
      cancel_url: process.env.COINBASE_CANCEL_URL || 'https://example.com/cancel'
    };
    const resp = await fetch('https://api.commerce.coinbase.com/charges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CC-Api-Key': apiKey,
        'X-CC-Version': '2018-03-22'
      },
      body: JSON.stringify(body)
    });
    const data = await resp.json();
    return res.status(200).json({ hosted_url: data?.data?.hosted_url || null, raw: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}