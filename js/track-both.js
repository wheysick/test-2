/* /js/track-both.js — Browser + CAPI with event_id dedupe */
(function(){
  if (window.__TRACK_BOTH_BOUND__) return;
  window.__TRACK_BOTH_BOUND__ = true;

  function readCookie(name){
    try {
      const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
      return m ? decodeURIComponent(m.pop()) : '';
    } catch(_) { return ''; }
  }

  function genEventId(){ return 'evt_' + Math.random().toString(36).slice(2) + Date.now().toString(36); }

  window.trackBoth = async function(eventName, params){
    const event_id = genEventId();
    // 1) Browser
    try { if (window.fbq) fbq('track', eventName, params||{}, { eventID: event_id }); } catch(_){}

    // 2) Server (CAPI)
    try {
      const fbp = readCookie('_fbp');
      const fbc = readCookie('_fbc');
      // Our existing endpoint api/meta/capi.js expects: { event, event_id, value, currency, contents, order_id }
      const body = Object.assign({
        event: eventName,
        event_id,
        fbp, fbc,
        event_source_url: location.href
      }, params || {});
      fetch('/api/meta/capi', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(body)
      }).catch(()=>{});
    } catch(_){}

    return event_id;
  };
})();