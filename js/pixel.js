/* pixel.js — v1.6 (single init, trackSingle to avoid stray pixels, CAPI helper) */
(function () {
  var PIXEL_ID = '1051611783243364';
  window.__PIXEL_ID = PIXEL_ID;

  // Load fbq if missing
  if (!window.fbq) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s);}
    (window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  }

  // Init once; send PageView only to the real pixel
  if (!window.__META_PIXEL_INITED__) {
    window.__META_PIXEL_INITED__ = true;
    fbq('init', PIXEL_ID);
    fbq('trackSingle', PIXEL_ID, 'PageView');
  }

  // Safe tracker that only hits the real pixel
  window.fbqSafe = function(eventName, params) {
    try {
      if (!window.fbq) return;
      var name = String(eventName || '').replace(/\s+/g,'');
      var payload = Object.assign({ currency:'USD', content_type:'product' }, params || {});
      fbq('trackSingle', PIXEL_ID, name, payload);
    } catch (e) { console && console.warn && console.warn('[pixel] track', e); }
  };

  // Browser + (optional) server fire with dedupe event_id
  window.firePurchase = async function(opts){
    opts = opts || {};
    var value    = Number(opts.value || 0);
    var currency = opts.currency || 'USD';
    var contents = opts.contents || [];
    var order_id = opts.order_id || null;
    var event_id = opts.event_id || (crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
    var params   = { value, currency, contents, content_type:'product', order_id, event_id };

    // browser
    window.fbqSafe('Purchase', params);

    // server (CAPI)
    try {
      await fetch('/api/meta/capi', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ event:'Purchase', value, currency, contents, order_id, event_id })
      });
    } catch (_) {}
    return event_id;
  };
})();
