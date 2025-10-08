// api-samples/paypal-create.js — create order (server)
// npm i @paypal/checkout-server-sdk --save
import paypal from '@paypal/checkout-server-sdk';

function client() {
  const env = process.env.NODE_ENV === 'production'
    ? new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
    : new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
  return new paypal.core.PayPalHttpClient(env);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { order } = req.body;
  const request = new paypal.orders.OrdersCreateRequest();
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{
      amount: { currency_code: 'USD', value: String(order.total || '90.00') }
    }]
  });
  const response = await client().execute(request);
  res.status(200).json({ id: response.result.id });
}