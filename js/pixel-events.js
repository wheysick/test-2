/* /js/pixel-events.js — robust event hooks, no fbq patching */
(function () {
  function ready(fn) { document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn(); }
  function isShown(el){ if (!el) return false; if (el.hidden) return false; const cs = getComputedStyle(el); if (cs.display==='none' || cs.visibility==='hidden' || cs.opacity==='0') return false; const r = el.getBoundingClientRect(); return r.width>0 && r.height>0; }

  function start() {
    if (!window.fbq || !window.__FB_PIXEL_ID__) { setTimeout(start, 50); return; }

    const fired = new Set();
    const track = (name, key, params) => {
      const k = name + '::' + (key||'');
      if (fired.has(k)) return;
      fired.add(k);
      try {
        fbq('trackSingle', window.__FB_PIXEL_ID__, name, Object.assign({ currency:'USD', content_type:'product' }, params||{}));
      } catch (e) {}
    };

    const getQty = () => {
      const el = document.querySelector('#coQty,[name="qty"],.qty-input,.qty-value');
      const n = parseInt(el && (el.value || el.textContent), 10);
      return Number.isFinite(n) && n > 0 ? n : 1;
    };
    const valueForCart = () => getQty() * 45;

    // AddToCart when checkout is opened
    document.addEventListener('click', (e)=>{
      const a = e.target.closest && e.target.closest('.open-checkout,#heroCta,a[href*="#checkout"],[data-action="open-checkout"]');
      if (!a) return;
      track('AddToCart','cta', { value: valueForCart(), contents:[{ id:'BOTTLE', quantity:getQty() }] });
    }, true);

    // InitiateCheckout on step1 submit
    const step1 = document.querySelector('#coStep1 form, #coStep1, form#coStep1');
    step1 && step1.addEventListener('submit', ()=>{
      track('InitiateCheckout','step1', { value:valueForCart(), num_items:getQty(), contents:[{ id:'BOTTLE', quantity:getQty() }] });
    }, true);

    // AddPaymentInfo on step3 button
    const to3 = document.getElementById('coToStep3');
    to3 && to3.addEventListener('click', ()=>{
      const pm = (document.querySelector('.pay-method.is-active,[name="payMethod"]:checked')||{}).value || 'card';
      track('AddPaymentInfo','step3', { value:valueForCart(), payment_method: pm });
    }, true);

    // Fallback: visibility observer for step transitions
    const step2 = document.getElementById('coStep2');
    const step3 = document.getElementById('coStep3');
    const check = ()=>{
      if (isShown(step2)) track('InitiateCheckout','visible', { value:valueForCart(), num_items:getQty() });
      if (isShown(step3)) track('AddPaymentInfo','visible', { value:valueForCart() });
    };
    try {
      new MutationObserver(check).observe(document.documentElement,{ subtree:true, childList:true, attributes:true, attributeFilter:['hidden','style','class','aria-hidden','data-checkout-open'] });
    } catch(e){}
    setTimeout(check, 150);
  }
  ready(start);
})();
