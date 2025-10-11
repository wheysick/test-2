function __normalizeBillingMeta(meta){
  var o = meta || {};
  var bi = (o && o.billing_info) ? o.billing_info : null;
  if (!bi){ bi = {}; ['first_name','last_name','address','address1','address2','city','region','state','postal_code','zip','country','phone','email']
    .forEach(function(k){ if (o[k] != null && o[k] !== '') bi[k] = o[k]; }); }
  if (!bi.region && bi.state) bi.region = bi.state;
  if (!bi.state && bi.region) bi.state = bi.region;
  if (!bi.postal_code && bi.zip) bi.postal_code = bi.zip;
  if (!bi.zip && bi.postal_code) bi.zip = bi.postal_code;
  bi.country = (bi.country ? String(bi.country).toUpperCase() : 'US');
  return { billing_info: bi };
}

/* --- Recurly meta normalization helper --- */
function __recurlyTokenWithMeta(elements, meta, cb){
  try {
    var opts = meta || {};
    var bi = (opts && opts.billing_info) ? opts.billing_info : {};

    // If flat, lift into billing_info
    if (!opts.billing_info) {
      var flatKeys = ['first_name','last_name','address','address1','address2','city','region','state','postal_code','zip','country','phone','email'];
      var hasFlat = flatKeys.some(function(k){ return !!opts[k]; });
      if (hasFlat) {
        bi = {};
        flatKeys.forEach(function(k){ if (opts[k] != null && opts[k] !== '') bi[k] = opts[k]; });
        opts = { billing_info: bi };
      }
    } else {
      opts = { billing_info: bi };
    }

    // Aliases
    if (!bi.region && bi.state) bi.region = bi.state;
    if (!bi.postal_code && bi.zip) bi.postal_code = bi.zip;

    // Default country
    if (!bi.country) bi.country = 'US';

    return recurly.token(elements, opts, cb);
  } catch(e){
    console.error('[Recurly Bridge] meta normalize failed', e);
    return __recurlyTokenWithMeta(elements, meta, cb);
  }
}

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
    try{
      if (window.recurly && typeof window.recurly.configure==='function'){
        var pk = (document.querySelector('meta[name="recurly-public-key"]')||{}).content;
        if (pk) { try { window.recurly.configure(pk); } catch(e){ try{ window.recurly.configure({ publicKey: pk }); }catch(_){} } }
      }
    }catch(_){ }

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
  function tokenize(meta) {
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
