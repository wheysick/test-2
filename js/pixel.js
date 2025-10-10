/* pixel.js — v2.3 final
   - Forces ALL tracks to pixel 1051611783243364
   - Ignores any other fbq('init', ...) calls
   - Drops duplicate events (same name+params) inside 1.5s
   - Provides fbqSafe(...) and firePurchase(..., with CAPI)
*/
(function () {
  'use strict';
  var PIXEL_ID = '1051611783243364';

  // Load fbq if missing
  if (!window.fbq) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
    (window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  }

  // Patch fbq: route tracks to our pixel, ignore other inits, soft-dedupe
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

  // Init + PageView to our pixel only
  (function initWhenReady(){
    if (!window.fbq) return setTimeout(initWhenReady, 20);
    if (!window.__META_PIXEL_INITED__) {
      window.__META_PIXEL_INITED__ = true;
      fbq('init', PIXEL_ID);
      fbq('trackSingle', PIXEL_ID, 'PageView');
    }
  })();

  // Safe helpers
  window.fbqSafe = function(eventName, params){
    try {
      if (!window.fbq) return;
      var name = String(eventName||'').replace(/\s+/g,'');
      var payload = Object.assign({ currency:'USD', content_type:'product' }, params||{});
      fbq('trackSingle', PIXEL_ID, name, payload);
    } catch(e){}
  };

  // Browser + server Purchase with dedupe event_id
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
