// api-samples/recurly.js — Next.js (or any Node/Express) style
// npm i recurly --save
import Recurly from 'recurly';

const apiKey = process.env.RECURLY_API_KEY; // secret
const siteId = process.env.RECURLY_SITE_ID; // required for the client
const recurly = new Recurly(apiKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { token, order } = req.body;
    // Create a purchase using tokenized payment method
    const purchase = await recurly.createPurchase({
      currency: 'USD',
      collection_method: 'automatic',
      customer_notes: 'SelfHacking sample order',
      subscriptions: [{
        plan_code: 'free-sample', // or use one-time charge via line_items if not a plan
        quantity: order.qty || 1
      }],
      billing_info: { token_id: token }
    });
    return res.status(200).json({ ok: true, id: purchase?.uuid });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}