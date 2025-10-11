/* /js/pixel-events.js — FINAL single-fire with debounced state machine */
(function () {
  // -------- Singleton guard (prevents double-includes) --------
  if (window.__PX_EVENTS_BOUND__) return;
  window.__PX_EVENTS_BOUND__ = true;
  if (window.__PX_SUPPRESS_AUTO) { return; }

  // -------- Small utils --------
  function ready(fn){
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else { fn(); }
  }
  function isShown(el){
    if (!el) return false;
    if (el.hidden) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  function $(sel, root){ return (root || document).querySelector(sel); }

  // Dedup across the whole page-session (persists if script re-runs)
  const SESSION_KEY = (function(){
    try {
      const k = sessionStorage.getItem('__px_session_key__');
      if (k) return k;
      const nk = (crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + '-' + Math.random());
      sessionStorage.setItem('__px_session_key__', nk);
      return nk;
    } catch(_) { return 'sess'; }
  })();
  function firedOnce(name){
    try {
      const k = `__px_fired__${name}__${SESSION_KEY}`;
      if (sessionStorage.getItem(k)) return true;
      sessionStorage.setItem(k, '1');
      return false;
    } catch(_) { return false; }
  }

  ready(function start(){
    // Wait until fbq + pixel id exist
    if (!window.fbq || !window.__FB_PIXEL_ID__) { setTimeout(start, 50); return; }

    // ---------- Inputs & helpers ----------
    const html  = document.documentElement;
    const modal = $('#checkoutModal');
    const s1    = $('#coStep1');
    const s2    = $('#coStep2');
    const s3    = $('#coStep3');

    function getQty(){
      const el = $('#coQty,[name="qty"],.qty-input,.qty-value');
      const n  = parseInt(el && (el.value || el.textContent), 10);
      return Number.isFinite(n) && n > 0 ? n : 1;
    }
    const priceEach = 45;
    const valueForCart = () => getQty() * priceEach;

    function track(name, params){
      try {
        fbq('trackSingle', window.__FB_PIXEL_ID__, name, Object.assign({ currency:'USD', content_type:'product' }, params||{}));
      } catch(_) {}
    }

    // ---------- Debounced state machine ----------
    let modalOpen = false, s2Shown = false, s3Shown = false;
    let rafPending = false, tmr = null;

    function evaluateNow(){
      rafPending = false; clearTimeout(tmr); tmr = null;

      const nowModal = (html.getAttribute('data-checkout-open') === '1') || isShown(modal);
      const nowS2    = isShown(s2);
      const nowS3    = isShown(s3);

      // Transition: closed -> open
      if (!modalOpen && nowModal && !firedOnce('AddToCart')) {
        track('AddToCart', { value: valueForCart(), contents:[{ id:'BOTTLE', quantity:getQty() }] });
      }
      modalOpen = nowModal;

      // Transition: Step2 hidden -> visible
      if (!s2Shown && nowS2 && !firedOnce('InitiateCheckout')) {
        track('InitiateCheckout', { value: valueForCart(), num_items:getQty(), contents:[{ id:'BOTTLE', quantity:getQty() }] });
      }
      s2Shown = nowS2;

      // Transition: Step3 hidden -> visible
      if (!s3Shown && nowS3 && !firedOnce('AddPaymentInfo')) {
        const totalEl = $('#coTotal');
        const m = totalEl && (totalEl.textContent||'').match(/[\d.,]+/);
        const total = m ? Number(m[0].replace(/,/g,'')) : undefined;
        track('AddPaymentInfo', total != null ? { value: total } : {});
      }
      s3Shown = nowS3;
    }

    function scheduleEvaluate(){
      // Coalesce rapid DOM changes into a single evaluation
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(evaluateNow);
        // backup debounce in case RAF is skipped
        tmr = setTimeout(evaluateNow, 120);
      }
    }

    // Initial checks
    setTimeout(scheduleEvaluate, 60);
    setTimeout(scheduleEvaluate, 200);

    // Observe DOM changes that matter
    try {
      new MutationObserver(scheduleEvaluate).observe(document.documentElement, {
        subtree: true, childList: true, attributes: true,
        attributeFilter: ['hidden','style','class','aria-hidden','data-checkout-open']
      });
    } catch(_) {}

    // Minimal fallbacks that only schedule (don’t fire themselves)
    const step1Form = s1 && (s1.tagName === 'FORM' ? s1 : s1.querySelector('form'));
    step1Form && step1Form.addEventListener('submit', () => setTimeout(scheduleEvaluate, 30), true);
    const toStep3 = $('#coToStep3');
    toStep3 && toStep3.addEventListener('click', () => setTimeout(scheduleEvaluate, 30), true);
    document.addEventListener('click', (e)=>{
      if (e.target.closest && e.target.closest('.open-checkout,#heroCta,[data-action="open-checkout"]')) {
        setTimeout(scheduleEvaluate, 30);
      }
    }, true);
  });
})();
