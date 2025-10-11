/* ===== recurly-bridge.js — FINAL SINGLE SOURCE (no postal, card-only tokenization) ===== */
(function(){
  const $ = (s, r=document)=>r.querySelector(s);

  // Detect which ID scheme the page uses
  function findContainers(){
    const schemes = [
      { number:'#re-number', month:'#re-month', year:'#re-year', cvv:'#re-cvv' },
      { number:'#recurly-number', month:'#recurly-month', year:'#recurly-year', cvv:'#recurly-cvv' }
    ];
    for (const s of schemes){
      if ($(s.number) && $(s.month) && $(s.year) && $(s.cvv)) return s;
    }
    return null;
  }

  let elements=null, fields={};

  // Mount card fields
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

    fields.number.attach(c.number);
    fields.month.attach(c.month);
    fields.year.attach(c.year);
    fields.cvv.attach(c.cvv);
    return true;
  }

  // Tokenize card-only (no name, no postal)
  function tokenize(){
    return new Promise((resolve, reject)=>{
      if (!elements) return reject(new Error('Payment form not ready'));
      window.recurly.token(elements, {}, (err, token)=>{
        if (err){
          const details = err.fields ? Object.entries(err.fields)
            .map(([k,v]) => `${k}: ${Array.isArray(v)?v.join(', '):v}`)
            .join('; ') : '';
          reject(new Error(details ? `${err.message} — ${details}` : err.message));
        } else resolve(token);
      });
    });
  }

  window.__recurlyBridge = { mount, tokenize };
})();
