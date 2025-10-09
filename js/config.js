/* ===== config.js — put your public keys here (never secrets) =====
  - Recurly (card):     recurlyPublicKey
  - PayPal/Venmo:       paypalClientId  (we enable Venmo in the SDK)
  - Coinbase Commerce:  coinbaseCheckoutId (hosted checkout ID)
  - Cash App (Square):  squareAppId, squareLocationId  (needs server endpoint)
*/
window.CO_CONFIG = {
  recurlyPublicKey: "",            // e.g. "ewr1-xxxxxx"
  paypalClientId:   "",            // e.g. "Abc123..."
  coinbaseCheckoutId: "",          // e.g. "a1b2c3d4e5f6..."
  squareAppId: "",                 // e.g. "sandbox-sq0idb-..."
  squareLocationId: ""             // e.g. "L8890ABCD1234"
};