import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    // Get raw body
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks);
    const sig = req.headers['x-cc-webhook-signature'] || '';
    const secret = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET || '';

    const hmac = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    const valid = sig && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(hmac));
    if (!valid) return res.status(400).send('invalid signature');

    const event = JSON.parse(raw.toString('utf8'));
    // TODO: persist state — on confirmed, fulfill
    if (event?.type === 'charge:confirmed') {
      // mark order paid using event.data.code / metadata
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).send('error');
  }
}
