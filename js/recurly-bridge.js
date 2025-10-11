/* ===== recurly-bridge.js — resilient bridge for mixed id schemes ===== */
(function(){
  const $ = (s, r=document)=>r.querySelector(s);

  function findContainers(){
    const schemes = [
      { number:'#re-number', month:'#re-month', year:'#re-year', cvv:'#re-cvv', postal:'#re-postal' },
      { number:'#recurly-number', month:'#recurly-month', year:'#recurly-year', cvv:'#recurly-cvv', postal:'#recurly-postal' }
    ];
    for (const s of schemes){
      if ($(s.number) && $(s.month) && $(s.year) && $(s.cvv)) return s;
    }
    return null;
  }

  let elements=null, fields={};
  function mount(){
    const c = findContainers();
    if (!c) return false;
    if (!window.recurly || !window.recurly.Elements) return false;
    if (elements) return true;

    const style = { fontSize:'16px', color:'#e9ecf2', placeholder:{ color:'#9aa4b2' } };
    elements = window.recurly.Elements();
    fields.number = elements.CardNumberElement({ style });
    fields.month  = elements.CardMonthElement({ style });
    fields.year   = elements.CardYearElement({ style });
    fields.cvv    = elements.CardCvvElement({ style });
    fields.postal = elements.CardPostalCodeElement({ style });

    fields.number.attach(c.number);
    fields.month.attach(c.month);
    fields.year.attach(c.year);
    fields.cvv.attach(c.cvv);
    if (c.postal && $(c.postal)) fields.postal.attach(c.postal);
    return true;
  }

  function tokenize(meta){
    return new Promise((resolve, reject)=>{
      if (!elements) return reject(new Error('Payment form not ready'));
      const postal = $('#coPostal')?.value || undefined;
      const orderMeta = postal ? { billing_info: { postal_code: postal }, ...meta } : (meta||{});
      window.recurly.token(elements, orderMeta, (err, token)=>{
        if (err){
          const details = err.fields ? Object.entries(err.fields).map(([k,v]) => `${k}: ${Array.isArray(v)?v.join(', '):v}`).join('; ') : '';
          reject(new Error(details ? `${err.message} — ${details}` : err.message));
        } else resolve(token);
      });
    });
  }

  // Expose
  window.__recurlyBridge = { mount, tokenize };
})();