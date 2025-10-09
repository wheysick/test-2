/* ===== recurly-elements.js — mounts to #recurly-* containers ===== */
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

    try { fields.number.attach('#recurly-number'); } catch(e){ console.warn(e); }
    try { fields.month.attach('#recurly-month'); }   catch(e){ console.warn(e); }
    try { fields.year.attach('#recurly-year'); }     catch(e){ console.warn(e); }
    try { fields.cvv.attach('#recurly-cvv'); }       catch(e){ console.warn(e); }
    try { fields.postal.attach('#recurly-postal'); } catch(e){ console.warn(e); }

    return elements;
  }

  function unmount(){
    if (!elements) return;
    try { Object.values(fields||{}).forEach(f => f && f.destroy && f.destroy()); } catch(e){}
    elements = null; fields = {};
  }

  function tokenize(meta={}){
    return new Promise((resolve, reject)=>{
      if (!elements) return reject(new Error('Payment form not ready'));
      window.recurly.token(elements, meta, (err, token)=>{
        if (err){
          const details = err.fields ? Object.entries(err.fields).map(([k,v]) => `${k}: ${Array.isArray(v)?v.join(', '):v}`).join('; ') : '';
          if (details) err.message = `${err.message} — ${details}`;
          return reject(err);
        }
        resolve(token);
      });
    });
  }

  window.RecurlyUI = { mount, unmount, tokenize };
})();
