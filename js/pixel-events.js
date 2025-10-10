/* pixel-events.js — v1.4 (final) */
(function(){
  if (window.__PIXEL_EVENTS_BOUND__) return;
  window.__PIXEL_EVENTS_BOUND__ = true;

  var $ = (s,r=document)=>r.querySelector(s);
  var on = (el,ev,fn,opt)=>{ if(el) el.addEventListener(ev,fn,opt||{capture:true}); };
  var numFromText = (sel)=>{
    var el=$(sel); if(!el) return undefined;
    var t = (el.textContent||'').replace(/[^0-9.]/g,'');
    var n = Number(t); return isFinite(n) ? n : undefined;
  };

  // AddToCart — any UI that opens the checkout modal
  document.addEventListener('click', function(e){
    var hit = e.target && e.target.closest &&
              e.target.closest('.open-checkout, [data-open-checkout], .masthead-cta, .floating-cta');
    if (hit && typeof fbqSafe === 'function') {
      fbqSafe('AddToCart', { value: 90, currency: 'USD', content_type: 'product' });
    }
  }, true);

  // InitiateCheckout — Step 2 (belt + suspenders: button click and form submit)
  on($('#coToStep2'), 'click', function(){ if (typeof fbqSafe==='function') fbqSafe('InitiateCheckout'); });
  on($('#coStep1'),  'submit', function(){ if (typeof fbqSafe==='function') fbqSafe('InitiateCheckout'); });

  // AddPaymentInfo — Step 3
  on($('#coToStep3'), 'click', function(){
    var total = numFromText('#coTotal');
    if (typeof fbqSafe==='function') {
      total != null ? fbqSafe('AddPaymentInfo', { value: total })
                    : fbqSafe('AddPaymentInfo');
    }
  });
})();
