/* /js/pixel-events.js — single-fire via state transitions */
(function () {
  function ready(fn){ document.readyState==='loading' ? document.addEventListener('DOMContentLoaded', fn, {once:true}) : fn(); }

  function isShown(el){
    if (!el) return false;
    if (el.hidden) return false;
    const cs = getComputedStyle(el);
    if (cs.display==='none' || cs.visibility==='hidden' || cs.opacity==='0') return false;
    const r = el.getBoundingClientRect();
    return r.width>0 && r.height>0;
  }

  function start(){
    if (!window.fbq || !window.__FB_PIXEL_ID__) { setTimeout(start, 50); return; }

    // ---------- helpers ----------
    const fired = Object.create(null);
    function trackOnce(name, params){
      if (fired[name]) return;
      fired[name] = true;
      try { fbq('trackSingle', window.__FB_PIXEL_ID__, name, Object.assign({currency:'USD',content_type:'product'}, params||{})); } catch(_) {}
    }

    const $ = (s, r=document)=>r.querySelector(s);
    const step1 = $('#coStep1');
    const step2 = $('#coStep2');
    const step3 = $('#coStep3');
    const modal = $('#checkoutModal');
    const html  = document.documentElement;

    function getQty(){
      const el = $('#coQty,[name="qty"],.qty-input,.qty-value');
      const n = parseInt(el && (el.value || el.textContent), 10);
      return Number.isFinite(n) && n>0 ? n : 1;
    }
    const valueForCart = () => getQty() * 45;

    // ---------- state machine ----------
    let modalOpen = false;
    let s2Shown = false;
    let s3Shown = false;

    function evaluate(){
      const nowModal = (html.getAttribute('data-checkout-open') === '1') || isShown(modal);
      const nowS2 = isShown(step2);
      const nowS3 = isShown(step3);

      // Modal transition: closed -> open
      if (!modalOpen && nowModal) {
        trackOnce('AddToCart', { value:valueForCart(), contents:[{id:'BOTTLE', quantity:getQty()}] });
      }
      modalOpen = nowModal;

      // Step 2 transition: hidden -> visible
      if (!s2Shown && nowS2) {
        trackOnce('InitiateCheckout', { value:valueForCart(), num_items:getQty(), contents:[{id:'BOTTLE', quantity:getQty()}] });
      }
      s2Shown = nowS2;

      // Step 3 transition: hidden -> visible
      if (!s3Shown && nowS3) {
        const totalEl = $('#coTotal');
        const m = totalEl && (totalEl.textContent||'').match(/[\d.,]+/);
        const total = m ? Number(m[0].replace(/,/g,'')) : undefined;
        trackOnce('AddPaymentInfo', total!=null ? { value:total } : {});
      }
      s3Shown = nowS3;
    }

    // Initial + observe real transitions only (no double sources)
    setTimeout(evaluate, 60);
    setTimeout(evaluate, 200);
    try {
      new MutationObserver(evaluate).observe(document.documentElement, {
        subtree:true, childList:true, attributes:true,
        attributeFilter:['hidden','style','class','aria-hidden','data-checkout-open']
      });
    } catch(_) {}

    // Fallback hooks (kept for robustness, but won't double fire thanks to state flags)
    const step1Form = step1 && (step1.tagName==='FORM' ? step1 : step1.querySelector('form'));
    step1Form && step1Form.addEventListener('submit', () => evaluate(), true);
    const toStep3 = $('#coToStep3');
    toStep3 && toStep3.addEventListener('click', () => setTimeout(evaluate, 30), true);
    document.addEventListener('click', (e)=>{
      if (e.target.closest && e.target.closest('.open-checkout,#heroCta,[data-action="open-checkout"]')) {
        setTimeout(evaluate, 30);
      }
    }, true);
  }

  ready(start);
})();
