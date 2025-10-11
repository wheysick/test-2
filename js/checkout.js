/* ============================================================================
  checkout.js — v6 FINAL (defensive)
  Fixes:
    • Step 2 tiles: single + double-click select (idempotent; no toggle-off)
    • Back buttons always work (no form-submit hijack)
    • Card fields/iframes remain clickable (overlay/guard killer inside Step 2)
    • No auto-advance; only explicit buttons move steps
    • Pixel browser events de-duped (optional; requires base fbq in <head>)
    • Qty/pricing/totals with optional method discounts

  Expected markup (use ANY of these selectors):
    Steps:     #coStep1, #coStep2, #coStep3  (or [data-step="1|2|3"])
    Buttons:   #coToStep2, #coToStep3, #coBackTo1, #coBackTo2, #checkoutClose
               (or [data-co="to-2|to-3|back-1|back-2|close"])
    Payment:   #coPayWrap (children with [data-pay]), and/or radios name="payMethod"
    Openers:   .open-checkout
    Totals:    #qtyMinus #qtyPlus #qtyOut #msrpOut #saleOut #freeOut
               #subtotalOut #taxOut #shipOut #totalOut
============================================================================ */
(function(){
  if (window.__CO_V6__) return; window.__CO_V6__ = true;

  // --- tiny utils
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt||false);
  const show = el => { if (el) el.style.display = ''; };
  const hide = el => { if (el) el.style.display = 'none'; };
  const fmt = n => '$' + n.toFixed(2);

  // --- root & steps (support id OR data-step)
  const modal = $('#checkoutModal') || $('[data-co="modal"]');
  if (!modal) return;

  const step1 = $('#coStep1') || $('[data-step="1"]');
  const step2 = $('#coStep2') || $('[data-step="2"]');
  const step3 = $('#coStep3') || $('[data-step="3"]');
  if (!step1 || !step2 || !step3) return;

  // --- nav buttons (support ids OR data-co)
  const to2   = $('#coToStep2')  || $('[data-co="to-2"]');
  const to3   = $('#coToStep3')  || $('[data-co="to-3"]');
  const back1 = $('#coBackTo1')  || $('[data-co="back-1"]');
  const back2 = $('#coBackTo2')  || $('[data-co="back-2"]');
  const closeX= $('#checkoutClose') || $('[data-co="close"]');

  // --- payment
  const payWrap = $('#coPayWrap') || $('[data-co="pay-wrap"]');

  // --- totals
  const qtyMinus = $('#qtyMinus'), qtyPlus = $('#qtyPlus'), qtyOut = $('#qtyOut');
  const msrpOut = $('#msrpOut'), saleOut = $('#saleOut'), freeOut = $('#freeOut');
  const subOut = $('#subtotalOut'), taxOut = $('#taxOut'), shipOut = $('#shipOut'), totalOut = $('#totalOut');

  // optional: page CTAs (we won’t touch pointer-events, just visibility)
  const pageCTAs = $$('.cta-primary, .claim-cta, .hero-cta, .claim-free-bottles');

  // --- config
  const CFG = {
    MSRP: 90, SALE: 45, TAX: 0.00, SHIP: 0.00,
    DISCOUNTS: { cashapp:0.10, crypto:0.15, card:0, paypal:0, venmo:0 },
    AUTO_DISCOUNT: true
  };

  // --- state
  let qty = Math.max(1, parseInt(qtyOut?.textContent || '1',10) || 1);
  let discount = 0;
  let chosenPay = null;

  // --- FB Pixel (browser) de-duped (optional)
  const FB = (function(){
    const fired = new Map(), COOL=2000;
    function k(n,d){ try{return n+':'+JSON.stringify(d||{})}catch(e){return n} }
    function t(n,d){ try{ if(window.fbq) window.fbq('track',n,d||{});}catch(e){} }
    function once(n,d){ const key=k(n,d), now=Date.now(), prev=fired.get(key)||0; if(now-prev<COOL) return; fired.set(key,now); t(n,d); }
    on(document,'DOMContentLoaded', ()=>{
      if (!/thank/i.test(location.pathname||'')) return;
      const total=parseFloat(localStorage.getItem('co_total')||'0')||0;
      const q = parseInt(localStorage.getItem('co_qty')||'1',10)||1;
      once('Purchase',{value:total,currency:'USD',contents:[{id:'bottle',quantity:q}],num_items:q});
    }, {once:true});
    return { once };
  })();

  // --- step show/hide (explicit only)
  function step(n){
    [step1,step2,step3].forEach((s,i)=> i===n ? show(s) : hide(s));
    modal.dataset.step = String(n+1);
  }
  function open(){
    show(modal);
    pageCTAs.forEach(el=> el && (el.style.visibility='hidden'));
    step(0);
  }
  function close(){
    hide(modal);
    pageCTAs.forEach(el=> el && (el.style.visibility=''));
  }

  // --- validation (minimal, never blocks your testing)
  const validEmail = v => /\S+@\S+\.\S+/.test(v||'');
  function ok1(){
    const name  = step1.querySelector('[name="full_name"],[name="name"],input[autocomplete="name"]');
    const email = step1.querySelector('[name="email"]');
    return (!name || !!name.value.trim()) && (!email || validEmail(email.value));
  }
  function ok2(){
    if (!payWrap) return true;
    const chosen = payWrap.querySelector('input[name="payMethod"]:checked') ||
                   payWrap.querySelector('[data-pay-selected="true"]');
    return !!chosen || !payWrap.querySelector('input[name="payMethod"],[data-pay]');
  }

  // --- totals
  function renderTotals(){
    const paid = qty;
    const msrp = CFG.MSRP * paid;
    const base = CFG.SALE * paid;
    const after = base * (1 - discount);
    const tax = after * CFG.TAX;
    const total = after + tax + CFG.SHIP;

    if (qtyOut)   qtyOut.textContent   = String(qty);
    if (freeOut)  freeOut.textContent  = String(paid);
    if (msrpOut)  msrpOut.textContent  = fmt(msrp);
    if (saleOut)  saleOut.textContent  = fmt(CFG.SALE) + '/bottle';
    if (subOut)   subOut.textContent   = fmt(after);
    if (taxOut)   taxOut.textContent   = fmt(tax);
    if (shipOut)  shipOut.textContent  = fmt(CFG.SHIP);
    if (totalOut) totalOut.textContent = fmt(total);

    try {
      localStorage.setItem('co_total', String(total.toFixed(2)));
      localStorage.setItem('co_qty', String(qty));
      localStorage.setItem('co_discount', String(discount));
      localStorage.setItem('co_pay', chosenPay || '');
    } catch(e){}
  }

  // --- payment selection (single + double-click; never toggles off)
  function selectCard(card){
    if (!card || !card.hasAttribute('data-pay')) return;
    // idempotent: always end selected
    payWrap.querySelectorAll('[data-pay]').forEach(el=>el.removeAttribute('data-pay-selected'));
    card.setAttribute('data-pay-selected','true');

    chosenPay = card.getAttribute('data-pay') || null;

    // sync radio if present
    const r = card.querySelector('input[type="radio"][name="payMethod"]');
    if (r && !r.checked){ r.checked = true; r.dispatchEvent(new Event('change',{bubbles:true})); }

    if (CFG.AUTO_DISCOUNT){
      const d = CFG.DISCOUNTS[chosenPay] || 0;
      if (d !== discount){ discount = d; renderTotals(); }
    }
  }

  function bindPayment(){
    if (!payWrap) return;

    // 1) bind directly to tiles (bubble only; no capture; do not preventDefault)
    const handler = e => {
      const card = e.target.closest?.('[data-pay]');
      if (card && payWrap.contains(card)) selectCard(card);
    };
    on(payWrap, 'click', handler);
    on(payWrap, 'dblclick', handler);

    // 2) honor direct radio selection
    payWrap.querySelectorAll('input[type="radio"][name="payMethod"]').forEach(r=>{
      on(r, 'change', ()=>{ const card=r.closest('[data-pay]'); if(card) selectCard(card); });
    });

    // 3) MutationObserver: if UI redraws payment tiles, re-bind radios automatically
    const mo = new MutationObserver(() => {
      payWrap.querySelectorAll('input[type="radio"][name="payMethod"]').forEach(r=>{
        if (!r.__coBound){
          r.__coBound = true;
          r.addEventListener('change', ()=>{ const card=r.closest('[data-pay]'); if(card) selectCard(card); });
        }
      });
    });
    mo.observe(payWrap, { childList:true, subtree:true });
  }

  // --- kill any overlay/guard inside Step 2 that blocks iframes/inputs
  function unblockStep2(){
    const badNames = /overlay|backdrop|guard|mask|scrim|shield|veil|cover/i;
    // anything absolutely/fixed positioned and on top inside step2
    step2.querySelectorAll('*').forEach(el=>{
      const cls = el.className ? String(el.className) : '';
      if (!badNames.test(cls)) return;
      const cs = getComputedStyle(el);
      if ((cs.position === 'absolute' || cs.position === 'fixed') && cs.pointerEvents !== 'none') {
        // soften it rather than remove: disable pointer-events only
        el.style.pointerEvents = 'none';
      }
    });
  }

  // --- qty
  function setQty(n){
    n = Math.max(1, n|0);
    if (n !== qty){ qty = n; renderTotals(); }
  }
  if (qtyMinus) on(qtyMinus, 'click', e=>{ e.preventDefault(); setQty(qty-1); });
  if (qtyPlus)  on(qtyPlus,  'click', e=>{ e.preventDefault(); setQty(qty+1); });

  // --- openers (bubble phase; won’t block other handlers)
  document.addEventListener('click', (e)=>{
    const opener = e.target.closest?.('.open-checkout');
    if (!opener) return;
    e.preventDefault();
    open();
    FB.once('AddToCart', { content_name:'Claim Free Bottles CTA' });
  });

  // --- nav (explicit only; prevent form submits)
  if (to2)   on(to2,   'click', e=>{ e.preventDefault(); if (!ok1()) return alert('Enter a valid name + email.'); step(1); unblockStep2(); FB.once('InitiateCheckout'); });
  if (to3)   on(to3,   'click', e=>{ e.preventDefault(); if (!ok2()) return alert('Select a payment method.'); step(2); FB.once('AddPaymentInfo'); });
  if (back1) on(back1, 'click', e=>{ e.preventDefault(); step(0); });
  if (back2) on(back2, 'click', e=>{ e.preventDefault(); step(1); unblockStep2(); });

  if (closeX) on(closeX, 'click', e=>{ e.preventDefault(); close(); });

  // --- init
  hide(modal);
  step(0);
  renderTotals();
  bindPayment();

  // Also run unblock when Step 2 becomes visible via dataset changes (just in case)
  const stepMo = new MutationObserver(() => {
    if (modal.dataset.step === '2') unblockStep2();
  });
  stepMo.observe(modal, { attributes:true, attributeFilter:['data-step'] });

  // Debug surface
  window.CO = { open, close, step, setQty, setPay: s => {
    const c = payWrap?.querySelector?.(`[data-pay="${s}"]`);
    if (c) selectCard(c);
  }};
})();
