/* ===== recurly-elements.js — v2.4 FINAL (single-instance, styled, safe) =====
   Requirements (already in your <head>):
     <meta name="recurly-public-key" content="ewr1-AxqCz2aZ9UMj5oOBsENPG2">
     <script src="https://js.recurly.com/v4/recurly.js"></script>

   Markup containers (Step 3):
     #re-number   #re-month   #re-year   #re-cvv   #re-postal  (postal optional)
*/
(function () {
  let elements = null;      // single Elements instance
  let fields   = {};        // attached field refs

  // Resolve public key from <meta>, fall back to known key
  function getPublicKey () {
    const meta = document.querySelector('meta[name="recurly-public-key"]');
    return (meta && meta.content) ? meta.content : 'ewr1-AxqCz2aZ9UMj5oOBsENPG2';
  }

  // Configure recurly only when needed
  function configureIfNeeded () {
    if (!window.recurly || typeof window.recurly.configure !== 'function') return;
    const pk = getPublicKey();
    try { window.recurly.configure(pk); }           // preferred (string form)
    catch { window.recurly.configure({ publicKey: pk }); } // fallback (object form)
  }

  // Style for hosted-field iframes (dark UI)
  const STYLE = {
    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Arial, sans-serif',
    fontSize: '16px',
    color: '#e9ecf2',                                // typed text
    placeholder: { color: 'rgba(255,255,255,.55)' }, // placeholder
    invalid:     { color: '#ff9ab3' }                // invalid state
  };

  function haveContainers () {
    return !!(document.getElementById('re-number')
      && document.getElementById('re-month')
      && document.getElementById('re-year')
      && document.getElementById('re-cvv'));
  }

  // Mount once (idempotent). Called by checkout.js when you enter Step 3.
  function mount () {
    if (!window.recurly) { console.error('[Recurly] library missing'); return null; }
    if (elements) return elements;                   // already mounted
    if (!haveContainers()) { console.error('[Recurly] containers missing'); return null; }

    configureIfNeeded();

    // Create a single Elements instance WITH style so text colors render correctly
    elements = window.recurly.Elements({ style: STYLE });

    // Create field elements
    fields.number = elements.CardNumberElement();
    fields.month  = elements.CardMonthElement();
    fields.year   = elements.CardYearElement();
    fields.cvv    = elements.CardCvvElement();

    // Postal element name varies by build — support both
    const PostalCtor = elements.PostalCodeElement || elements.PostalElement;
    if (typeof PostalCtor === 'function') fields.postal = PostalCtor();

    // Attach to your mount points
    fields.number.attach('#re-number');
    fields.month.attach('#re-month');
    fields.year.attach('#re-year');
    fields.cvv.attach('#re-cvv');
    if (fields.postal && document.getElementById('re-postal')) {
      fields.postal.attach('#re-postal');
    }

    return elements;
  }

  // Cleanly unmount (called when leaving Step 3 / closing modal)
  function unmount () {
    if (!elements) return;
    try { fields.number?.detach(); } catch {}
    try { fields.month ?.detach(); } catch {}
    try { fields.year  ?.detach(); } catch {}
    try { fields.cvv   ?.detach(); } catch {}
    try { fields.postal?.detach(); } catch {}
    fields = {};
    elements = null;
  }

  // Tokenize helper used by your checkout.js
  function tokenize (meta) {
    return new Promise((resolve, reject) => {
      if (!elements) return reject(new Error('Payment form not ready'));
      try {
        window.recurly.token(elements, meta || {}, (err, token) => {
          if (err) {
            const details = err.fields
              ? Object.entries(err.fields)
                  .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                  .join('; ')
              : '';
            return reject(new Error(details ? `${err.message} — ${details}` : err.message));
          }
          resolve(token);
        });
      } catch (e) { reject(e); }
    });
  }

  // Public API used by checkout.js
  window.RecurlyUI = { mount, unmount, tokenize };
})();
