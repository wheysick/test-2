/* ===== recurly-elements.js — final working Elements/tokenize for "addoctor" =====
   Requirements:
   - In your <head>:
       <meta name="recurly-public-key" content="ewr1-AxqCz2aZ9UMj5oOBsENPG2">
       <script src="https://js.recurly.com/v4/recurly.js"></script>
   - This file must be loaded AFTER the script above.
   - Step 3 containers must exist once:
       #re-number  #re-month  #re-year  #re-cvv  #re-postal
*/
(function () {
  let elements = null;
  let fields = {};

  /** Optional explicit configure (meta tag also works). */
  try {
    if (window.recurly && typeof window.recurly.configure === 'function') {
      window.recurly.configure({
        publicKey: 'ewr1-AxqCz2aZ9UMj5oOBsENPG2' // safe: public key
        // No need to set subdomain for JS Elements; API key is server-side only
      });
    }
  } catch (_) {}

  function ensureContainers() {
    const ids = ['re-number', 're-month', 're-year', 're-cvv', 're-postal'];
    return ids.every(id => document.getElementById(id));
  }

  function mount() {
    if (!window.recurly) { console.error('[Recurly] library missing'); return null; }
    if (elements) return elements;

    if (!ensureContainers()) {
      console.error('[Recurly] One or more containers are missing (#re-number, #re-month, #re-year, #re-cvv, #re-postal).');
      return null;
    }

    elements = window.recurly.Elements();
    const style = {
      fontSize: '16px',
      color: '#E9ECF2',
      placeholder: { color: 'rgba(234,236,239,.55)' }
    };

    fields.number = elements.CardNumberElement({ style });
    fields.month  = elements.CardMonthElement({ style });
    fields.year   = elements.CardYearElement({ style });
    fields.cvv    = elements.CardCvvElement({ style });
    fields.postal = elements.CardPostalCodeElement({ style });

    fields.number.attach('#re-number');
    fields.month.attach('#re-month');
    fields.year.attach('#re-year');
    fields.cvv.attach('#re-cvv');
    fields.postal.attach('#re-postal');

    return elements;
  }

  function unmount() {
    if (!elements) return;
    try { fields.number && fields.number.detach(); } catch {}
    try { fields.month  && fields.month.detach();  } catch {}
    try { fields.year   && fields.year.detach();   } catch {}
    try { fields.cvv    && fields.cvv.detach();    } catch {}
    try { fields.postal && fields.postal.detach(); } catch {}
    fields = {};
    elements = null;
  }

  /** Tokenize the mounted Elements; resolves Recurly token object. */
  function tokenize(meta) {
    return new Promise((resolve, reject) => {
      if (!elements) return reject(new Error('Payment form not ready'));
      window.recurly.token(elements, meta || {}, (err, token) => {
        if (err) {
          // Build a readable error with field details, if any
          const details = err.fields
            ? Object.entries(err.fields)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                .join('; ')
            : '';
          return reject(new Error(details ? `${err.message} — ${details}` : err.message));
        }
        resolve(token);
      });
    });
  }

  // Expose stable API
  window.RecurlyUI = { mount, unmount, tokenize };
})();
