/* pixel.js — v3.0 FINAL
   - Loads Meta Pixel (1051611783243364) and routes ALL tracks to it
   - Ignores any other fbq('init', ...) calls
   - Fires ecommerce events on REAL state changes:
       • AddToCart          => Step 1 becomes visible (checkout opened)
       • InitiateCheckout   => Step 2 becomes visible
       • AddPaymentInfo     => Step 3 becomes visible
   - Hooks window.checkoutOpen/gotoStep2/gotoStep3 if present (belt & suspenders)
   - Soft-dedup: drops identical events inside 1.5s window
   - Safe: never mutates your checkout logic; only observes
*/
(function () {
  'use strict';

  var PIXEL_ID = '1051611783243364';

  // -------- load Meta base if missing --------
  if (!window.fbq) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
    (window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  }

  // -------- patch fbq so everything tracks to our pixel + dedupe --------
  (function patchFbq(){
    if (!window.fbq) return setTimeout(patchFbq, 20);
    var orig = window.fbq;
    if (orig.__singlePatched) return;

    var recent = Object.create(null);
    function isDup(name, params){
      var key = name + '|' + JSON.stringify(params||{});
      var now = Date.now();
      for (var k in recent) if (now - recent[k] > 1500) delete recent[k];
      if (recent[key]) return true;
      recent[key] = now; return false;
    }

    function fbqPatched(){
      var args = Array.prototype.slice.call(arguments);
      var cmd  = args[0];

      // swallow any init not to our pixel
      if (cmd === 'init' && args[1] !== PIXEL_ID) return;

      // coerce all tracks to our pixel + dedupe
      if (cmd === 'track' || cmd === 'trackCustom') {
        var name   = String(args[1]||'');
        var params = args[2] || {};
        if (isDup(name, params)) return;
        return orig('trackSingle', PIXEL_ID, name, params);
      }
      return orig.apply(this, args);
    }
    for (var k in orig) try { fbqPatched[k] = orig[k]; } catch(_){}
    fbqPatched.__singlePatched = true;
    window.fbq = fbqPatched;
  })();

  // -------- init + PageView (to our pixel only) --------
  (function initWhenReady(){
    if (!window.fbq) return setTimeout(initWhenReady, 20);
    if (!window.__META_PIXEL_INITED__) {
      window.__META_PIXEL_INITED__ = true;
      fbq('init', PIXEL_ID);
      fbq('trackSingle', PIXEL_ID, 'PageView');
    }
  })();

  // -------- safe helpers --------
  window.fbqSafe = function(eventName, params){
    try {
      if (!window.fbq) return;
      var name = String(eventName||'').replace(/\s+/g,'');
      var payload = Object.assign({ currency:'USD', content_type:'product' }, params||{});
      fbq('trackSingle', PIXEL_ID, name, payload);
    } catch(e){}
  };

  // -------- event “once” gates --------
  var gates = Object.create(null);
  function once(key, ms){
    var now = Date.now(), win = ms || 3000;
    if (gates[key] && (now - gates[key] < win)) return false;
    gates[key] = now; return true;
  }

  // read total if present
  function readTotal(){
    var el = document.getElementById('coTotal');
    if (!el) return undefined;
    var m = (el.textContent||'').match(/[\d.,]+/);
    if (!m) return undefined;
    var n = Number(m[0].replace(/,/g,''));
    return isFinite(n) ? n : undefined;
  }

  // visibility checks
  function isVisible(el){
    if (!el) return false;
    if (el.hidden) return false;
    var ah = el.getAttribute && el.getAttribute('aria-hidden');
    if (ah === 'true') return false;
    var r = el.getBoundingClientRect();
    return (r.width > 0 && r.height > 0);
  }

  // fire helpers bound to step visibility
  function fireATC(){ if (once('ATC',1500)) fbqSafe('AddToCart', { value: 90 }); }
  function fireIC(){  if (once('IC',2000))  fbqSafe('InitiateCheckout'); }
  function fireAPI(){
    if (once('API',2000)) {
      var total = readTotal();
      total != null ? fbqSafe('AddPaymentInfo', { value: total }) : fbqSafe('AddPaymentInfo');
    }
  }

  // observe step panes & modal
  function bindObservers(){
    var step1 = document.getElementById('coStep1');
    var step2 = document.getElementById('coStep2');
    var step3 = document.getElementById('coStep3');
    var modal = document.getElementById('checkoutModal');

    // initial check (in case a step is already shown)
    setTimeout(check, 60);

    function check(){
      if (isVisible(step1)) fireATC();
      if (isVisible(step2)) fireIC();
      if (isVisible(step3)) fireAPI();
      // modal open also implies AddToCart
      if (modal) {
        var r = modal.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) fireATC();
      }
    }

    try {
      var mo = new MutationObserver(function(){ check(); });
      mo.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['hidden','aria-hidden','class','style']
      });
    } catch(_){}
  }

  // hook core functions if they exist
  function wrapWhenAvailable(name, onCall){
    var tries = 0;
    (function tryWrap(){
      var fn = window[name];
      if (typeof fn === 'function' && !fn.__px_wrapped__) {
        var orig = fn;
        var wrapped = function(){
          try { onCall(); } catch(_){}
          return orig.apply(this, arguments);
        };
        Object.defineProperty(wrapped, 'name', { value: name });
        wrapped.__px_wrapped__ = true;
        window[name] = wrapped;
        return;
      }
      if (tries++ < 60) setTimeout(tryWrap, 100);
    })();
  }

  // run when DOM is ready
  function ready(fn){ document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once:true }) : fn(); }

  ready(function(){
    bindObservers();
    wrapWhenAvailable('checkoutOpen', fireATC);
    wrapWhenAvailable('gotoStep2',    fireIC);
    wrapWhenAvailable('gotoStep3',    fireAPI);

    // fallback: clicks that obviously open checkout
    document.addEventListener('click', function(e){
      var t = e.target && e.target.closest &&
              e.target.closest('.open-checkout,[data-open-checkout],.masthead-cta,.floating-cta,a[href*="#checkout"]');
      if (t) fireATC();
    }, true);
  });

  // -------- optional: Purchase browser+server helper (unchanged) --------
  window.firePurchase = async function(opts){
    opts = opts || {};
    var value    = Number(opts.value || 0);
    var currency = opts.currency || 'USD';
    var contents = opts.contents || [];
    var order_id = opts.order_id || null;
    var event_id = opts.event_id || (self.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
    var params   = { value, currency, contents, content_type:'product', order_id, event_id };

    fbqSafe('Purchase', params);
    try {
      await fetch('/api/meta/capi', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ event:'Purchase', value, currency, contents, order_id, event_id })
      });
    } catch(_) {}
    return event_id;
  };
})();
