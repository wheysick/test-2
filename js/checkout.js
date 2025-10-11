/* ============================================================================
   checkout.js — v4.1 (Complete + anti-hide fixes)
   - Force-visible Step 2 (and 1/3) even against display:none !important
   - Adds .is-active class to steps (so CSS can key on it)
   - 2s watchdog to catch other scripts re-hiding steps and re-show them
   - Everything else from v4.0 retained (flow, qty/pricing, discounts, FB browser events)
   ========================================================================= */

(function(){
  if (window.__CO_INIT__) return; window.__CO_INIT__ = true;

  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const modal   = $('#checkoutModal');
  const step1   = $('#coStep1');
  const step2   = $('#coStep2');
  const step3   = $('#coStep3');
  if (!modal || !step1 || !step2 || !step3) { console.warn('[checkout] Missing step nodes'); return; }

  const btnTo2  = $('#coToStep2');
  const btnTo3  = $('#coToStep3');
  const back1   = $('#coBackTo1');
  const back2   = $('#coBackTo2');
  const closeX  = $('#checkoutClose');
  const payWrap = $('#coPayWrap');

  const qtyMinus = $('#qtyMinus');
  const qtyPlus  = $('#qtyPlus');
  const qtyOut   = $('#qtyOut');

  const msrpOut  = $('#msrpOut');
  const saleOut  = $('#saleOut');
  const freeOut  = $('#freeOut');
  const subOut   = $('#subtotalOut');
  const taxOut   = $('#taxOut');
  const shipOut  = $('#shipOut');
  const totalOut = $('#totalOut');

  const pageCTAs = $$('.cta-primary, .claim-cta, .hero-cta, .claim-free-bottles');

  const CONFIG = {
    MSRP_PER_BTL: 90,
    SALE_PER_BTL: 45,
    TAX_RATE:     0.00,
    SHIPPING:     0.00,
    DISCOUNTS: { cashapp:0.10, crypto:0.15, card:0, paypal:0, venmo:0 },
    AUTO_DISCOUNT: true
  };

  let qty = Math.max(1, parseInt(qtyOut?.textContent || '1', 10) || 1);
  let chosenPay = null;
  let discount  = 0;
  let lockScrollCount = 0;

  function lockScroll(on){
    if (on) {
      if (lockScrollCount++ === 0) {
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
      }
    } else {
      if (lockScrollCount > 0 && --lockScrollCount === 0) {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
      }
    }
  }

  // --- Force show/hide helpers that beat !important and add .is-active
  function _forceShow(el){
    if (!el) return;
    el.classList.add('is-active');
    el.style.setProperty('display', 'block', 'important');
    el.style.setProperty('visibility', 'visible', 'important');
    el.style.setProperty('opacity', '1', 'important');
    el.style.removeProperty('height'); // avoid 0 height traps
  }
  function _forceHide(el){
    if (!el) return;
    el.classList.remove('is-active');
    el.style.setProperty('display', 'none', 'important');
  }

  // --- Watchdog that re-shows the intended step for 2s to fight other scripts
  let watchdogTimer = null;
  function _watchdogKeep(stepEl){
    if (watchdogTimer) clearInterval(watchdogTimer);
    const want = stepEl;
    let tEnd = Date.now() + 2000;
    watchdogTimer = setInterval(()=>{
      if (Date.now() > tEnd) { clearInterval(watchdogTimer); watchdogTimer = null; return; }
      // if someone hid it, re-show and warn once
      const cs = getComputedStyle(want);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') {
        console.warn('[checkout] Another script is hiding the active step. Re-forcing visible.');
        _forceShow(want);
      }
    }, 60);
  }

  function step(index){
    const arr = [step1, step2, step3];
    arr.forEach((s, i) => i === index ? _forceShow(s) : _forceHide(s));
    modal.scrollTo?.({ top: 0, behavior: 'smooth' });
    _watchdogKeep(arr[index]);
  }

  function openModal(){
    _forceShow(modal);
    lockScroll(true);
    pageCTAs.forEach(el => el && el.classList.add('co-hidden'));
    step(0);
  }
  function closeModal(){
    _forceHide(modal);
    lockScroll(false);
    pageCTAs.forEach(el => el && el.classList.remove('co-hidden'));
  }

  // Toast
  let toastBusy=false;
  function toast(msg, ms){
    if (toastBusy) return; toastBusy=true;
    const t=document.createElement('div');
    t.role='status';
    t.style.cssText='position:fixed;left:50%;transform:translateX(-50%);bottom:18px;max-width:90vw;padding:10px 14px;border-radius:12px;background:rgba(0,0,0,.86);color:#fff;font:600 14px system-ui;z-index:999999';
    t.textContent=msg||'Something went wrong'; document.body.appendChild(t);
    setTimeout(()=>{t.remove();toastBusy=false;},ms||2000);
  }

  function validEmail(v){ return /\S+@\S+\.\S+/.test(v||''); }
  function validateStep1(){
    const name  = step1.querySelector('[name="full_name"], [name="name"], input[autocomplete="name"]');
    const email = step1.querySelector('[name="email"]');
    const okName=!name || !!name.value.trim();
    const okMail=!email|| validEmail(email.value);
    return okName && okMail;
  }
  function validateStep2(){
    if (!payWrap) return true;
    const chosen = payWrap.querySelector('input[name="payMethod"]:checked') ||
                   payWrap.querySelector('[data-pay-selected="true"]');
    return !!chosen || !payWrap.querySelector('input[name="payMethod"], [data-pay]');
  }

  function clampQty(n){ return Math.max(1, n|0); }
  function setQty(n){ qty=clampQty(n); renderTotals(); }
  function setDiscount(val){ discount=Math.max(0, Math.min(0.99, +val||0)); renderTotals(); }
  function calcTotals(){
    const paidBottles = qty, freeBottles = qty;
    const msrp = CONFIG.MSRP_PER_BTL * paidBottles;
    const base = CONFIG.SALE_PER_BTL * paidBottles;
    const afterDisc = base * (1 - discount);
    const taxAmt = afterDisc * CONFIG.TAX_RATE;
    const total = afterDisc + taxAmt + CONFIG.SHIPPING;
    return { paidBottles, freeBottles, msrp, base, afterDisc, taxAmt, total };
  }
  function fmt(n){ return '$' + n.toFixed(2); }
  function renderTotals(){
    const t=calcTotals();
    if (qtyOut)   qtyOut.textContent   = String(qty);
    if (freeOut)  freeOut.textContent  = String(t.freeBottles);
    if (msrpOut)  msrpOut.textContent  = fmt(t.msrp);
    if (saleOut)  saleOut.textContent  = fmt(CONFIG.SALE_PER_BTL) + '/bottle';
    if (subOut)   subOut.textContent   = fmt(t.afterDisc);
    if (taxOut)   taxOut.textContent   = fmt(t.taxAmt);
    if (shipOut)  shipOut.textContent  = fmt(CONFIG.SHIPPING);
    if (totalOut) totalOut.textContent = fmt(t.total);
    try {
      localStorage.setItem('co_total', String(t.total.toFixed(2)));
      localStorage.setItem('co_qty', String(qty));
      localStorage.setItem('co_discount', String(discount));
      localStorage.setItem('co_pay', chosenPay || '');
    } catch(e){}
  }

  function selectPayCard(cardEl){
    if (!cardEl || !cardEl.hasAttribute('data-pay')) return;
    payWrap.querySelectorAll('[data-pay]').forEach(el=>el.removeAttribute('data-pay-selected'));
    cardEl.setAttribute('data-pay-selected','true');
    chosenPay = cardEl.getAttribute('data-pay') || null;
    const r=cardEl.querySelector('input[type="radio"][name="payMethod"]');
    if (r){ r.checked=true; r.dispatchEvent(new Event('change',{bubbles:true})); }
    if (CONFIG.AUTO_DISCOUNT){
      const d = CONFIG.DISCOUNTS[chosenPay] || 0;
      setDiscount(d);
    }
  }

  // FB Pixel helpers (browser only)
  const FB = (function(){
    const fired = new Map();
    const COOLDOWN = 2000;
    function key(n,d){ try{return n+':'+JSON.stringify(d||{})}catch(e){return n} }
    function track(n,d){ try{ if(window.fbq) window.fbq('track',n,d||{});}catch(e){} }
    function trackOnce(n,d){
      const k=key(n,d), t=Date.now(), p=fired.get(k)||0;
      if (t-p<COOLDOWN) return; fired.set(k,t); track(n,d);
    }
    function purchaseFromStorage(){
      if (!/thank/i.test(location.pathname||'')) return;
      const total=parseFloat(localStorage.getItem('co_total')||'0')||0;
      const q = parseInt(localStorage.getItem('co_qty')||'1',10)||1;
      trackOnce('Purchase',{value:total,currency:'USD',contents:[{id:'bottle',quantity:q}],num_items:q});
    }
    document.addEventListener('DOMContentLoaded', purchaseFromStorage, {once:true});
    return { trackOnce };
  })();

  // Open checkout (capture)
  document.addEventListener('click', function(e){
    const opener = e.target.closest?.('.open-checkout');
    if (!opener) return;
    e.preventDefault();
    _forceShow(modal); // ensure modal beats CSS
    openModal();
    FB.trackOnce('AddToCart', { content_name:'Claim Free Bottles CTA' });
  }, true);

  if (closeX) closeX.addEventListener('click', e=>{ e.preventDefault(); closeModal(); });

  if (btnTo2) btnTo2.addEventListener('click', e=>{
    e.preventDefault();
    if (!validateStep1()) { toast('Please enter a valid name and email.'); return; }
    step(1); // <- FORCE Step 2 visible
    FB.trackOnce('InitiateCheckout');
  });

  if (btnTo3) btnTo3.addEventListener('click', e=>{
    e.preventDefault();
    if (!validateStep2()) { toast('Please select a payment method.'); return; }
    step(2);
    FB.trackOnce('AddPaymentInfo');
  });

  if (back1) back1.addEventListener('click', e=>{ e.preventDefault(); step(0); });
  if (back2) back2.addEventListener('click', e=>{ e.preventDefault(); step(1); });

  if (qtyMinus) qtyMinus.addEventListener('click', e=>{ e.preventDefault(); setQty(qty-1); });
  if (qtyPlus)  qtyPlus .addEventListener('click', e=>{ e.preventDefault(); setQty(qty+1); });

  if (payWrap){
    payWrap.addEventListener('click', (e)=>{
      const card=e.target.closest('[data-pay]'); if(!card) return;
      selectPayCard(card);
    });
    payWrap.querySelectorAll('input[type="radio"][name="payMethod"]').forEach(r=>{
      r.addEventListener('change', ()=>{ const card=r.closest('[data-pay]'); if(card) selectPayCard(card); });
    });
  }

  // Initialize
  _forceHide(modal);
  step(0);
  renderTotals();

  // Minimal debug surface
  window.CO = {
    open: openModal, close: closeModal, step, setQty, setDiscount,
    setPay(slug){ const card=payWrap?.querySelector?.(`[data-pay="${slug}"]`); if(card) selectPayCard(card); }
  };
})();
