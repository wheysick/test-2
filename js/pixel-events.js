/* pixel-events.js — v1.2 (idempotent) */
(function(){
  if (window.__PIXEL_EVENTS_BOUND__) return;
  window.__PIXEL_EVENTS_BOUND__ = true;

  var $ = (s,r=document)=>r.querySelector(s);
  var on = (el,ev,fn)=>{ if(el) el.addEventListener(ev,fn,{capture:true}); };

  // Hero CTA -> AddToCart
  document.addEventListener('click', function(e){
    var t = e.target && e.target.closest && e.target.closest('.open-checkout, [data-open-checkout], .masthead-cta, .floating-cta');
    if (t && window.fbqSafe) fbqSafe('AddToCart', { value: 90 });
  }, true);

  // Step 1 -> Step 2
  on($('#coToStep2'), 'click', function(){ window.fbqSafe && fbqSafe('InitiateCheckout'); });

  // Step 2 -> Step 3
  on($('#coToStep3'), 'click', function(){
    var totalEl = document.getElementById('coTotal');
    var total = totalEl ? Number((totalEl.textContent||'').replace(/[^0-9.]/g,'')) : undefined;
    window.fbqSafe && fbqSafe('AddPaymentInfo', total ? { value: total } : {});
  });

  // Purchase is fired on thank-you via window.firePurchase()
})();
