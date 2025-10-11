
function __normalizeBillingMeta(meta){
  var o = meta || {};
  var top = (o && o.billing_info) ? o.billing_info : {};
  var flat = (!o.billing_info) ? o : {};
  var bi = {};
  bi.first_name = top.first_name || flat.first_name || '';
  bi.last_name  = top.last_name  || flat.last_name  || '';
  bi.email      = top.email      || flat.email      || '';
  bi.phone      = top.phone      || flat.phone      || '';
  var addr = top.address || {};
  addr.line1       = addr.line1 || top.address1 || flat.address1 || flat.address || '';
  addr.line2       = addr.line2 || top.address2 || flat.address2 || '';
  addr.city        = addr.city  || top.city     || flat.city     || '';
  var st           = addr.region|| top.region   || top.state     || flat.region   || flat.state || '';
  var zip          = addr.postal_code || top.postal_code || top.zip || flat.postal_code || flat.zip || '';
  var ctry         = addr.country || top.country || flat.country || 'US';
  addr.region      = st ? String(st).toUpperCase() : '';
  addr.state       = addr.region;
  addr.postal_code = zip;
  addr.zip         = zip;
  addr.country     = String(ctry).toUpperCase();
  bi.address = addr;
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
