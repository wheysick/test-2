/* ===== recurly-elements.js — final safe mount/tokenize =====
   Requires in <head> BEFORE this file:
     <meta name="recurly-public-key" content="ewr1-AxqCz2aZ9UMj5oOBsENPG2">
     <script src="https://js.recurly.com/v4/recurly.js"></script>
   Step-3 containers required (once):
     #re-number  #re-month  #re-year  #re-cvv  #re-postal
*/
(function () {
  let elements = null;
  let fields = {};

  try {
    if (window.recurly && typeof window.recurly.configure === 'function') {
      window.recurly.configure({ publicKey: 'ewr1-AxqCz2aZ9UMj5oOBsENPG2' });
    }
  } catch (_) {}

  function ensureContainers() {
    return ['re-number','re-month','re-year','re-cvv'].every(id => document.getElementById(id));
  }

  function mount() {
    if (!window.recurly) { console.error('[Recurly] library missing'); return null; }
    if (elements) return elements;
    if (!ensureContainers()) { console.error('[Recurly] required containers missing'); return null; }

    elements = window.recurly.Elements();
    const style = { fontSize: '16px', color: '#E9ECF2', placeholder: { color: 'rgba(234,236,239,.55)' } };

    fields.number = elements.CardNumberElement({ style });
    fields.month  = elements.CardMonthElement({ style });
    fields.year   = elements.CardYearElement({ style });
    fields.cvv    = elements.CardCvvElement({ style });

    // Postal code is optional; some builds don’t expose CardPostalCodeElement.
    let postalCtor = elements.CardPostalCodeElement || elements.PostalCodeElement;
    if (typeof postalCtor === 'function') {
      fields.postal = postalCtor.call(elements, { style });
    } else {
      console.warn('[Recurly] Postal code element not available in this build — continuing without it.');
      fields.postal = null;
    }

    fields.number.attach('#re-number');
    fields.month.attach('#re-month');
    fields.year.attach('#re-year');
    fields.cvv.attach('#re-cvv');
    if (fields.postal && document.getElementById('re-postal')) {
      fields.postal.attach('#re-postal');
    }

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

  function tokenize(meta) {
    return new Promise((resolve, reject) => {
      if (!elements) return reject(new Error('Payment form not ready'));
      window.recurly.token(elements, meta || {}, (err, token) => {
        if (err) {
          const details = err.fields
            ? Object.entries(err.fields).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('; ')
            : '';
          return reject(new Error(details ? `${err.message} — ${details}` : err.message));
        }
        resolve(token);
      });
    });
  }

  window.RecurlyUI = { mount, unmount, tokenize };
})();

const elements = recurly.Elements({
  style: {
    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Arial, sans-serif',
    fontSize: '16px',
    color: '#e9ecf2',                                 // typed text color
    placeholder: { color: 'rgba(255,255,255,.55)' },  // placeholder color
    invalid:     { color: '#ff9ab3' }                 // invalid color
  }
});

