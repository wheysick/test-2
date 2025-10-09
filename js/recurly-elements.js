/* ===== recurly-elements.js — single-instance Elements ===== */
(function () {
  let elements = null;
  let fields = {};

  function mount() {
    if (!window.recurly) { console.warn('[Recurly] library missing'); return null; }
    if (elements) return elements;

    elements = window.recurly.Elements();
    const style = { fontSize: '16px', color: '#E9ECF2', placeholder: { color: 'rgba(234,236,239,.55)' } };

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
    try { fields.number && fields.number.detach(); } catch (e) {}
    try { fields.month  && fields.month.detach();  } catch (e) {}
    try { fields.year   && fields.year.detach();   } catch (e) {}
    try { fields.cvv    && fields.cvv.detach();    } catch (e) {}
    try { fields.postal && fields.postal.detach(); } catch (e) {}
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
