/* ============================================================================
  checkout.js — v5.2 FINAL (complete)
  Fixes:
    • Step 2 payment tiles: single & double-click select (no toggle-off)
    • Back buttons work reliably
    • No global capture inside modal → card iframes remain clickable
    • No auto-jumps; only explicit buttons move steps
    • Pixel events (browser) de-duped (optional; requires base fbq in <head>)
    • Qty/pricing/totals with optional method discounts

  Expected HTML IDs/classes:
    #checkoutModal, #coStep1, #coStep2, #coStep3
    #coToStep2, #coToStep3, #coBackTo1, #coBackTo2, #checkoutClose
    #qtyMinus, #qtyPlus, #qtyOut
    #msrpOut, #saleOut, #freeOut, #subtotalOut, #taxOut, #shipOut, #totalOut
    #coPayWrap (children with [data-pay], and/or radios name="payMethod")
    .open-checkout  (buttons that open the modal)

  Include this script once (right before </body>) and keep exactly ONE fbq init in <head>.
============================================================================ */

(function(){
  if (window.__CO_V52__) return; window.__CO_V52__ = true;

  // ------------ tiny DOM helpers
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts||false);
  const show = el => { if (el) el.style.display = ''; };
  const hide = el => { if (el) el.style.display = 'none'; };
  const fmt = n => '$' + n.toFixed(2);

  // ------------ nodes
  const modal   = $('#checkoutModal');
  const step1   = $('#coStep1');
  const step2   = $('#coStep2');
  const step3   = $('#coStep3');
  if (!modal || !step1 || !step2 || !step3) return;

  const to2     = $('#coToStep2');
  const to3     = $('#coToStep3');
  const back1   = $('#coBackTo1');
  const back2   = $('#coBackTo2');
  const closeX  = $('#checkoutClose');

  const payWrap = $('#coPayWrap');

  const qtyMinus = $('#qtyMinus'), qtyPlus = $('#qtyPlus'), qtyOut = $('#qtyOut');
  const msrpOut = $('#msrpOut'), saleOut = $('#saleOut'), freeOut = $('#freeOut');
  const subOut = $('#subtotalOut'), taxOut = $('#taxOut'), shipOut = $('#shipOut'), totalOut = $('#totalOut');

  // (optional) page CTAs to hide while modal open; we won’t touch pointer-events
  const pageCTAs = $$('.cta-primary, .claim-cta, .hero-cta, .claim-free-bottles');

  // ------------ config
  const CFG = {
    MSRP: 90,
    SALE: 45,
    TAX:  0.00,
    SHIP: 0.00,
    DISCOUNTS: { cashapp:0.10, crypto:0.15, card:0, paypal:0, venmo:0 },
    AUTO_DISCOUNT: true
  };

  // ------------ state
  let qty = Math.max(1, parseInt(qtyOut?.textContent || '1', 10) || 1);
  let discount = 0;
  let chosenPay = null;

  // ------------ FB Pixel (browser) — de-duped
  const FB = (function(){
    const fired = new Map(), COOLDOWN = 2000;
    function key(n,d){ try{return n+':'+JSON.stringify(d||{})}catch(e){return n} }
    function track(n,d){ try{ if(window.fbq) window.fbq('track',n,d||{});}catch(e){} }
    function trackOnce(n,d){ const k=key(n,d), t=Date.now(), p=fired.get(k)||0; if(t-p<COOLDOWN) return; fired.set(k,t); track(n,d); }
    function purchaseFromStorage(){
      if (!/thank/i.test(location.pathname||'')) return;
      const total=parseFloat(localStorage.getItem('co_total')||'0')||0;
      const q = parseInt(localStorage.getItem('co_qty')||'1',10)||1;
      trackOnce('Purchase',{value:total,currency:'USD',contents:[{id:'bottle',quantity:q}],num_items:q});
    }
    document.addEventListener('DOMContentLoaded', purchaseFromStorage, {once:true});
    return { trackOnce };
  })();

  // ------------ step/show helpers (no global capture → iframes OK)
  function step(n){
    [step1, step2, step3].forEach((s,i)=> i===n ? show(s) : hide(s));
    modal.scrollTo?.({ top: 0, behavior: 'instant' });
    modal.dataset.step = String(n+1); // for CSS hooks if needed
  }
  function open(){
    show(modal);
    pageCTAs.forEach(el => el && (el.style.visibility='hidden'));
    step(0);
  }
  function close(){
    hide(modal);
    pageCTAs.forEach(el => el && (el.style.visibility=''));
  }

  // ------------ validation
  const validEmail = v => /\S+@\S+\.\S+/.test(v||'');
  function validateStep1(){
    const name  = step1.querySelector('[name="full_name"],[name="name"],input[autocomplete="name"]');
    const email = step1.querySelector('[name="email"]');
    const okN = !name || !!name.value.trim();
    const okE = !email || validEmail(email.value);
    return okN && okE;
  }
  function validateStep2(){
    if (!payWrap) return true;
    const chosen = payWrap.querySelector('input[name="payMethod"]:checked') ||
                   payWrap.querySelector('[data-pay-selected="true"]');
    return !!chosen || !payWrap.querySelector('input[name="payMethod"],[data-pay]');
  }

  // ------------ totals
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

  // ------------ payment selection (single + double-click; never toggles off)
  function selectPayCard(card){
    if (!card || !card.hasAttribute('data-pay')) return;

    // Always end in the "selected" state (idempotent; double-click ok)
    payWrap.querySelectorAll('[data-pay]').forEach(el => el.removeAttribute('data-pay-selected'));
    card.setAttribute('data-pay-selected','true');

    chosenPay = card.getAttribute('data-pay') || null;

    // Sync radio if present
    const r = card.querySelector('input[type="radio"][name="payMethod"]');
    if (r && !r.checked){
      r.checked = true;
      r.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Optional: apply method-based discount (again, idempotent)
    if (CFG.AUTO_DISCOUNT){
      const d = CFG.DISCOUNTS[chosenPay] || 0;
      if (discount !== d){ discount = d; renderTotals(); }
    }
  }

  // Bind both click and dblclick; do NOT preventDefault here.
  function wirePaymentSelection(){
    if (!payWrap) return;

    const handler = (e) => {
      const card = e.target.closest?.('[data-pay]');
      if (!card || !payWrap.contains(card)) return;
      selectPayCard(card);
    };

    // Use bubble phase only (no capture) so we don't block inputs/iframes.
    on(payWrap, 'click', handler);
    on(payWrap, 'dblclick', handler);

    // Also honor direct radio clicks
    payWrap.querySelectorAll('input[type="radio"][name="payMethod"]').forEach(r=>{
      on(r, 'change', () => {
        const card = r.closest('[data-pay]');
        if (card) selectPayCard(card);
      });
    });
  }

  // ------------ qty buttons
  function setQty(n){
    const next = Math.max(1, n|0);
    if (next !== qty){ qty = next; renderTotals(); }
  }
  if (qtyMinus) on(qtyMinus, 'click', e=>{ e.preventDefault(); setQty(qty-1); });
  if (qtyPlus)  on(qtyPlus,  'click', e=>{ e.preventDefault(); setQty(qty+1); });

  // ------------ openers (bubble phase; won’t block other handlers)
  // If your openers are added dynamically, this still works via delegation.
  document.addEventListener('click', (e)=>{
    const opener = e.target.closest?.('.open-checkout');
    if (!opener) return;
    e.preventDefault();
    open();
    FB.trackOnce('AddToCart', { content_name:'Claim Free Bottles CTA' });
  });

  // ------------ nav buttons (explicit only; no auto-advance)
  if (to2) on(to2, 'click', (e)=>{
    e.preventDefault();
    if (!validateStep1()) return alert('Please enter a valid name and email.');
    step(1);
    FB.trackOnce('InitiateCheckout');
  });

  if (to3) on(to3, 'click', (e)=>{
    e.preventDefault();
    if (!validateStep2()) return alert('Please select a payment method.');
    step(2);
    FB.trackOnce('AddPaymentInfo');
  });

  if (back1) on(back1, 'click', (e)=>{ e.preventDefault(); step(0); });
  if (back2) on(back2, 'click', (e)=>{ e.preventDefault(); step(1); });

  if (closeX) on(closeX, 'click', (e)=>{ e.preventDefault(); close(); });

  // ------------ init
  hide(modal);
  step(0);
  renderTotals();
  wirePaymentSelection();

  // ------------ debug surface
  window.CO = {
    open, close, step, setQty,
    setPay: (slug) => {
      const card = payWrap?.querySelector?.(`[data-pay="${slug}"]`);
      if (card) selectPayCard(card);
    }
  };
})();
