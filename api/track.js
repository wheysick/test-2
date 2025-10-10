export default async function handler(req, res) {
  // Accept beacons without noise
  res.setHeader('Cache-Control', 'no-store');
  return res.status(204).end();
}
