/* ============================================================================
   checkout.js — v4.0 (Complete, single-source checkout)
   Author: You (ship-ready)

   WHAT THIS FILE DOES
   - Modal open/close + scroll locking
   - Step 1 → Step 2 → Step 3 flow (idempotent, resilient)
   - Form validation (minimal-but-safe: name/email on Step 1; payment chosen on Step 2)
   - Quantity, pricing, totals, “Buy X Get X Free” view
   - Optional discounts by payment method (CashApp 10%, Crypto 15% — configurable)
   - Centralized Facebook Pixel browser events (de-duplicated): PageView (your head), AddToCart, InitiateCheckout, AddPaymentInfo, Purchase (on thank-you)
   - LocalStorage persistence of qty/total for thank-you Purchase
   - Namespaced helpers, zero global leakage except a tiny debug API

   REQUIRED HTML IDS (rename your markup to match or add data- attributes shown)
   - #checkoutModal, #coStep1, #coStep2, #coStep3
   - #coToStep2, #coToStep3, #coBackTo1, #coBackTo2, #checkoutClose
   - #qtyMinus, #qtyPlus, #qtyOut
   - #msrpOut, #saleOut, #freeOut, #subtotalOut, #taxOut, #shipOut, #totalOut
   - #coPayWrap  (children with [data-pay] and/or radios name="payMethod")
   - Buttons with .open-checkout open the modal

   IMPORTANT
   - Keep exactly ONE fbq base init in <head> with the correct Pixel ID.
   - Do NOT include other checkout scripts. Duplicate handlers = bugs.

   ========================================================================= */

(function(){
  // --- Idempotency: run once ---
  if (window.__CO_INIT__) return; window.__CO_INIT__ = true;

  /* ==========================
     Lightweight DOM utilities
     ========================== */
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const show   = (el) => { if (el) el.style.display = ''; };
  const hide   = (el) => { if (el) el.style.display = 'none'; };
  const on     = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts||false);
  const off    = (el, ev, fn, opts) => el && el.removeEventListener(ev, fn, opts||false);
  const isFn   = (x) => typeof x === 'function';

  /* ==========================
     Elements
     ========================== */
  const modal   = $('#checkoutModal');
  const step1   = $('#coStep1');
  const step2   = $('#coStep2');
  const step3   = $('#coStep3');

  if (!modal || !step1 || !step2 || !step3) {
    // Hard guard: if these aren't present, we don't run (and we don't break the page)
    console.warn('[checkout] Missing required step elements, aborting.');
    return;
  }

  const btnTo2  = $('#coToStep2');
  const btnTo3  = $('#coToStep3');
  const back1   = $('#coBackTo1');
  const back2   = $('#coBackTo2');
  const closeX  = $('#checkoutClose');

  const qtyMinus = $('#qtyMinus');
  const qtyPlus  = $('#qtyPlus');
  const qtyOut   = $('#qtyOut');

  // Totals outputs
  const msrpOut  = $('#msrpOut');
  const saleOut  = $('#saleOut');
  const freeOut  = $('#freeOut');
  const subOut   = $('#subtotalOut');
  const taxOut   = $('#taxOut');
  const shipOut  = $('#shipOut');
  const totalOut = $('#totalOut');

  // Payment tiles wrapper
  const payWrap  = $('#coPayWrap');

  // Optional page CTAs to hide while checkout open (don’t fail if absent)
  const pageCTAs = $$('.cta-primary, .claim-cta, .hero-cta, .claim-free-bottles');

  /* ==========================
     Config: Pricing & Discounts
     ========================== */
  const CONFIG = {
    MSRP_PER_BTL: 90,    // crossed-out price per paid bottle
    SALE_PER_BTL: 45,    // sale price per paid bottle
    TAX_RATE:     0.00,  // e.g. 0.085 for 8.5%
    SHIPPING:     0.00,  // free shipping
    DISCOUNTS: {         // by payment method slug (data-pay value)
      cashapp: 0.10,
      crypto:  0.15,
      card:    0.00,
      paypal:  0.00,
      venmo:   0.00
    },
    // If you don’t want auto-apply discounts on click, set AUTO_DISCOUNT=false.
    AUTO_DISCOUNT: true
  };

  /* ==========================
     State
     ========================== */
  // qty defaults to 1 or existing UI content
  let qty = Math.max(1, parseInt(qtyOut?.textContent || '1', 10) || 1);
  let chosenPay = null;            // 'cashapp' | 'crypto' | 'card' | ...
  let discount  = 0;               // 0 … 0.99
  let lockScrollCount = 0;         // allow nested locks if needed

  /* ==========================
     Scroll lock helpers
     ========================== */
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

  /* ==========================
     Step handling
     ========================== */
  function step(index){
    const arr = [step1, step2, step3];
    arr.forEach((s, i) => i === index ? show(s) : hide(s));
    modal.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  function openModal(){
    show(modal);
    lockScroll(true);
    pageCTAs.forEach(showOrHideCTA.bind(null, false));
    // Always start users at Step 1 when opening
    step(0);
  }

  function closeModal(){
    hide(modal);
    lockScroll(false);
    pageCTAs.forEach(showOrHideCTA.bind(null, true));
  }

  function showOrHideCTA(showIt, el){
    if (!el) return;
    if (showIt) show(el); else hide(el);
  }

  /* ==========================
     Toast (lightweight)
     ========================== */
  let toastBusy = false;
  function toast(msg, ms){
    if (toastBusy) return;
    toastBusy = true;
    const t = document.createElement('div');
    t.role = 'status';
    t.style.cssText = [
      'position:fixed','left:50%','transform:translateX(-50%)',
      'bottom:18px','max-width:90vw','padding:10px 14px',
      'border-radius:12px','background:rgba(0,0,0,.86)',
      'color:#fff','font:600 14px/1.2 system-ui, -apple-system, Segoe UI, Roboto',
      'z-index:999999','box-shadow:0 8px 28px rgba(0,0,0,.25)'
    ].join(';');
    t.textContent = msg || 'Something went wrong.';
    document.body.appendChild(t);
    setTimeout(()=>{ t.remove(); toastBusy = false; }, ms || 2000);
  }

  /* ==========================
     Validation
     ========================== */
  function validEmail(v){ return /\S+@\S+\.\S+/.test(v||''); }

  function validateStep1(){
    // Require name & email minimally if fields exist
    const name  = step1.querySelector('[name="full_name"], [name="name"], input[autocomplete="name"]');
    const email = step1.querySelector('[name="email"]');
    const okName = !name || !!name.value.trim();
    const okMail = !email || validEmail(email.value);
    return okName && okMail;
  }

  function validateStep2(){
    if (!payWrap) return true;
    const chosen = payWrap.querySelector('input[name="payMethod"]:checked') ||
                   payWrap.querySelector('[data-pay-selected="true"]');
    return !!chosen || !payWrap.querySelector('input[name="payMethod"], [data-pay]');
  }

  /* ==========================
     Pricing / Totals
     ========================== */
  function clampQty(n){ return Math.max(1, n|0); }

  function setQty(n){
    qty = clampQty(n);
    renderTotals();
  }

  function setDiscount(val){
    discount = Math.max(0, Math.min(0.99, +val || 0));
    renderTotals();
  }

  function calcTotals(){
    const paidBottles = qty;
    const freeBottles = qty; // “Buy X, Get X Free” view label
    const msrp = CONFIG.MSRP_PER_BTL * paidBottles;
    const base = CONFIG.SALE_PER_BTL * paidBottles;
    const afterDisc = base * (1 - discount);
    const taxAmt = afterDisc * CONFIG.TAX_RATE;
    const total = afterDisc + taxAmt + CONFIG.SHIPPING;

    return {
      paidBottles, freeBottles, msrp, base, afterDisc, taxAmt, total
    };
  }

  function fmt(n){ return '$' + n.toFixed(2); }

  function renderTotals(){
    const t = calcTotals();

    // UI outputs
    if (qtyOut)   qtyOut.textContent   = String(qty);
    if (freeOut)  freeOut.textContent  = String(t.freeBottles);
    if (msrpOut)  msrpOut.textContent  = fmt(t.msrp);
    if (saleOut)  saleOut.textContent  = fmt(CONFIG.SALE_PER_BTL) + '/bottle';
    if (subOut)   subOut.textContent   = fmt(t.afterDisc);
    if (taxOut)   taxOut.textContent   = fmt(t.taxAmt);
    if (shipOut)  shipOut.textContent  = fmt(CONFIG.SHIPPING);
    if (totalOut) totalOut.textContent = fmt(t.total);

    // Persist for thank-you purchase
    try {
      localStorage.setItem('co_total', String(t.total.toFixed(2)));
      localStorage.setItem('co_qty', String(qty));
      localStorage.setItem('co_discount', String(discount));
      localStorage.setItem('co_pay', chosenPay || '');
    } catch(e){}
  }

  /* ==========================
     Payment selection
     ========================== */
  function selectPayCard(cardEl){
    if (!cardEl || !cardEl.hasAttribute('data-pay')) return;
    // clear previous
    payWrap.querySelectorAll('[data-pay]').forEach(el => el.removeAttribute('data-pay-selected'));
    cardEl.setAttribute('data-pay-selected', 'true');

    chosenPay = cardEl.getAttribute('data-pay') || null;

    // check radio if present
    const r = cardEl.querySelector('input[type="radio"][name="payMethod"]');
    if (r){
      r.checked = true;
      r.dispatchEvent(new Event('change', { bubbles: true }));
    }
    // auto-apply discount per method
    if (CONFIG.AUTO_DISCOUNT){
      const d = CONFIG.DISCOUNTS[chosenPay] || 0;
      setDiscount(d);
    }
  }

  /* ==========================
     Facebook Pixel (browser) helpers
     ========================== */
  const FB = (function(){
    const fired = new Map(); // eventKey -> ts
    const COOLDOWN = 2000;

    function key(name, data){
      try { return name + ':' + JSON.stringify(data||{}); }
      catch(e){ return name; }
    }
    function now(){ return Date.now(); }

    function track(name, data){
      try {
        if (!window.fbq) return;
        window.fbq('track', name, data || {});
        // console.debug('[FB] track', name, data||{});
      } catch(e){}
    }

    function trackOnce(name, data){
      const k = key(name, data);
      const prev = fired.get(k) || 0;
      const t = now();
      if (t - prev < COOLDOWN) return; // debounce
      fired.set(k, t);
      track(name, data);
    }

    function purchaseFromStorage(){
      const path = (location.pathname || '').toLowerCase();
      // Consider any path containing "thank" as thank-you
      if (!/thank/.test(path)) return;
      const total = parseFloat(localStorage.getItem('co_total')||'0')||0;
      const q     = parseInt(localStorage.getItem('co_qty')||'1',10)||1;
      trackOnce('Purchase', {
        value: total,
        currency: 'USD',
        contents: [{ id:'bottle', quantity: q }],
        num_items: q
      });
    }

    // Run purchase auto-fire on DOM ready
    on(document, 'DOMContentLoaded', purchaseFromStorage, { once:true });

    return { track, trackOnce };
  })();

  /* ==========================
     Bindings
     ========================== */

  // Open checkout — event delegation (capture to win against other handlers)
  on(document, 'click', function(e){
    const opener = e.target.closest?.('.open-checkout');
    if (!opener) return;
    e.preventDefault();
    openModal();
    // Track AddToCart as the click that opens modal from hero CTA
    FB.trackOnce('AddToCart', { content_name: 'Claim Free Bottles CTA' });
  }, true);

  // Close (X)
  if (closeX) on(closeX, 'click', function(e){ e.preventDefault(); closeModal(); });

  // Step forward/back
  if (btnTo2) on(btnTo2, 'click', function(e){
    e.preventDefault();
    if (!validateStep1()) { toast('Please enter a valid name and email.'); return; }
    step(1);
    FB.trackOnce('InitiateCheckout');
  });

  if (btnTo3) on(btnTo3, 'click', function(e){
    e.preventDefault();
    if (!validateStep2()) { toast('Please select a payment method.'); return; }
    step(2);
    FB.trackOnce('AddPaymentInfo');
  });

  if (back1) on(back1, 'click', function(e){ e.preventDefault(); step(0); });
  if (back2) on(back2, 'click', function(e){ e.preventDefault(); step(1); });

  // Qty controls
  if (qtyMinus) on(qtyMinus, 'click', function(e){ e.preventDefault(); setQty(qty - 1); });
  if (qtyPlus)  on(qtyPlus,  'click', function(e){ e.preventDefault(); setQty(qty + 1); });

  // Payment tiles
  if (payWrap) {
    on(payWrap, 'click', function(e){
      const card = e.target.closest('[data-pay]');
      if (!card) return;
      selectPayCard(card);
    });

    // Also listen to radio changes (if user clicks radio directly)
    payWrap.querySelectorAll('input[type="radio"][name="payMethod"]').forEach(radio=>{
      on(radio, 'change', function(){
        const card = radio.closest('[data-pay]');
        if (card) selectPayCard(card);
      });
    });
  }

  // Keyboard: ESC closes
  on(document, 'keydown', function(e){
    if (e.key === 'Escape' && modal.style.display !== 'none') closeModal();
  });

  // Initialize UI
  hide(modal);
  step(0);
  renderTotals();

  /* ==========================
     Debug surface (optional)
     ========================== */
  window.CO = {
    open: openModal,
    close: closeModal,
    step,
    setQty,
    setDiscount,
    setPay(methodSlug){
      const card = payWrap?.querySelector?.(`[data-pay="${methodSlug}"]`);
      if (card) selectPayCard(card);
    },
    _config: CONFIG
  };

})();
