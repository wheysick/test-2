
/* Single-instance Recurly Elements + tokenize helper */
(function () {
  let elements = null; let fields = {};
  function mount(){
    if (!window.recurly){ console.warn('[Recurly] missing library'); return null; }
    if (elements) return elements;
    elements = window.recurly.Elements();
    const style = { fontSize:'16px', color:'#E9ECF2', placeholder:{ color:'rgba(234,236,239,.55)' } };
    fields.number = elements.CardNumberElement({ style });
    fields.month  = elements.CardMonthElement({ style });
    fields.year   = elements.CardYearElement({ style });
    fields.cvv    = elements.CardCvvElement({ style });
    fields.postal = elements.CardPostalCodeElement({ style });

    [['#re-number',fields.number],['#re-month',fields.month],['#re-year',fields.year],['#re-cvv',fields.cvv],['#re-postal',fields.postal]]
      .forEach(([sel,el])=>{ const host = document.querySelector(sel); if (host) el.attach(host); else console.warn('[Recurly] missing', sel); });

    return elements;
  }
  function unmount(){
    if (!elements) return;
    try{ Object.values(fields).forEach(el=>el && el.detach && el.detach()); elements.destroy(); }catch{}
    elements=null; fields={};
  }
  function tokenize(meta={}){
    return new Promise((resolve, reject)=>{
      if (!elements) return reject(new Error('Payment form not ready'));
      window.recurly.token(elements, meta, (err, token)=>{
        if (err){
          const details = err.fields ? Object.entries(err.fields).map(([k,v])=>`${k}: ${Array.isArray(v)?v.join(', '):v}`).join('\n') : '';
          err.message = details ? `${err.message}\n\n${details}` : err.message;
          return reject(err);
        }
        resolve(token);
      });
    });
  }
  window.RecurlyUI = { mount, unmount, tokenize };
})();
