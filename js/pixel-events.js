/* pixel-events.js — v1.5 final
   - AddToCart on opening checkout (dedup gated)
   - InitiateCheckout on Step 2
   - AddPaymentInfo on Step 3
   - Idempotent; does not touch your checkout logic
*/
(function(){
  if (window.__PIXEL_EVENTS_V15__) return;
  window.__PIXEL_EVENTS_V15__ = true;

  var $ = (s,r=document)=>r.querySelector(s);
  var on = (el,ev,fn,opt)=>{ if(el) el.addEventListener(ev,fn,opt||{capture:true}); };

  function getTotal(){
    var el = document.getElementById('coTotal');
    if (!el) return undefined;
    var m = (el.textContent||'').match(/[\d.,]+/);
    return m ? Number(m[0].replace(/,/g,'')) : undefined;
  }

  // Gate to stop double AddToCart from multiple listeners
  function atcGate(){
    var now = Date.now();
    if (now - (window.__ATC_TS||0) < 1500) return false;
    window.__ATC_TS = now;
    return true;
  }

  // AddToCart — any click that opens the checkout
  document.addEventListener('click', function(e){
    var hit = e.target && e.target.closest &&
              e.target.closest('.open-checkout, [data-open-checkout], .masthead-cta, .floating-cta');
    if (!hit) return;
    if (!atcGate()) return;
    if (typeof fbqSafe==='function') fbqSafe('AddToCart', { value: 90 });
  }, true);

  // InitiateCheckout — entering Step 2
  on($('#coToStep2'), 'click', function(){
    if (typeof fbqSafe==='function') fbqSafe('InitiateCheckout');
  });
  on($('#coStep1'), 'submit', function(){
    if (typeof fbqSafe==='function') fbqSafe('InitiateCheckout');
  });

  // AddPaymentInfo — entering Step 3
  on($('#coToStep3'), 'click', function(){
    var total = getTotal();
    if (typeof fbqSafe==='function') {
      total != null ? fbqSafe('AddPaymentInfo', { value: total })
                    : fbqSafe('AddPaymentInfo');
    }
  });
})();
