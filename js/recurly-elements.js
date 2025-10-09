/* ===== recurly-elements.js — v2.5 FINAL (styled + placeholders) =====
   Requires in <head>:
     <meta name="recurly-public-key" content="ewr1-AxqCz2aZ9UMj5oOBsENPG2">
     <script src="https://js.recurly.com/v4/recurly.js"></script>
   Step-3 containers required:
     #re-number  #re-month  #re-year  #re-cvv  #re-postal
*/
(function () {
  let elements = null;
  let fields = {};

  function publicKey() {
    const meta = document.querySelector('meta[name="recurly-public-key"]');
    return (meta && meta.content) ? meta.content : 'ewr1-AxqCz2aZ9UMj5oOBsENPG2';
  }

  function ensureContainers() {
    return ['re-number','re-month','re-year','re-cvv'].every(id => document.getElementById(id));
  }

  function mount() {
    if (!window.recurly) { console.error('[Recurly] library missing'); return null; }
    if (elements) return elements;
    if (!ensureContainers()) { console.error('[Recurly] required containers missing'); return null; }

    // Configure once
    try { window.recurly.configure(publicKey()); } catch (e) { try { window.recurly.configure({ publicKey: publicKey() }); } catch(_) {} }

    // IMPORTANT: Recurly Elements style uses fontColor, not color
    const baseStyle = {
      fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Arial, sans-serif',
      fontSize: '16px',
      fontColor: '#e9ecf2',
      placeholder: { color: 'rgba(255,255,255,.55)' },
      invalid:     { fontColor: '#ff9ab3' }
    };

    elements = window.recurly.Elements({ style: baseStyle });

    // Per-field placeholders
    const sNumber = { ...baseStyle, placeholder: { color: 'rgba(255,255,255,.55)', content: 'Card number' } };
    const sMonth  = { ...baseStyle, placeholder: { color: 'rgba(255,255,255,.55)', content: 'MM' } };
    const sYear   = { ...baseStyle, placeholder: { color: 'rgba(255,255,255,.55)', content: 'YY' } };
    const sCvv    = { ...baseStyle, placeholder: { color: 'rgba(255,255,255,.55)', content: 'CVC' } };
    const sZip    = { ...baseStyle, placeholder: { color: 'rgba(255,255,255,.55)', content: 'ZIP' } };

    fields.number = elements.CardNumberElement({ style: sNumber });
    fields.month  = elements.CardMonthElement({ style: sMonth });
    fields.year   = elements.CardYearElement({ style: sYear });
    fields.cvv    = elements.CardCvvElement({ style: sCvv });

    const PostalCtor = elements.PostalCodeElement || elements.PostalElement;
    if (typeof PostalCtor === 'function') fields.postal = PostalCtor({ style: sZip });

    fields.number.attach('#re-number');
    fields.month.attach('#re-month');
    fields.year.attach('#re-year');
    fields.cvv.attach('#re-cvv');
    if (fields.postal && document.getElementById('re-postal')) fields.postal.attach('#re-postal');

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
