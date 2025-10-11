/* ============================================================================
  checkout.js — v6.3 FINAL (single-file with built-in compat)
  Fixes you asked for:
    • Step 2 shows full content (beats display:none !important)
    • Payment tiles select on single OR double-click (idempotent; no toggle-off)
    • Credit-card fields/iframes are clickable (kills step-2 overlays)
    • Back buttons always work (no accidental form submits)
    • No auto-advance; only explicit buttons move steps
    • FB Pixel (browser) de-duped (needs ONE fbq init in <head>)

  Works with ANY of these selectors (ids OR data-attrs OR common fallbacks):
    Steps:     #coStep1|2|3   OR [data-step="1|2|3"]    OR .co-step.step-1|2|3
    Buttons:   #coToStep2/3, #coBackTo1/2, #checkoutClose
               OR [data-co="to-2|to-3|back-1|back-2|close"]
               OR .to-step-2|3, .back-to-1|2, .co-close
    Payment:   #coPayWrap OR [data-co="pay-wrap"] OR .co-pay
               Tiles must have [data-pay="card|cashapp|crypto|paypal|venmo"] on the CLICKABLE wrapper
    Openers:   .open-checkout
    Totals:    #qtyMinus #qtyPlus #qtyOut #msrpOut #saleOut #freeOut #subtotalOut #taxOut #shipOut #totalOut
============================================================================ */
(function(){
  if (window.__CO_V63__) return; window.__CO_V63__ = true;

  // ---- tiny DOM helpers
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt||false);
  const show = el => { if (el) el.style.display = ''; };
  const hide = el => { if (el) el.style.display = 'none'; };
  const fmt  = n  => '$' + n.toFixed(2);

  // ---- root & steps (support multiple selector styles)
  const modal = $('#checkoutModal') || $('[data-co="modal"]') || $('.checkout-modal');
  if (!modal) return;

  const step1 = $('#coStep1') || $('[data-step="1"]') || $('.co-step.step-1');
  const step2 = $('#coStep2') || $('[data-step="2"]') || $('.co-step.step-2');
  const step3 = $('#coStep3') || $('[data-step="3"]') || $('.co-step.step-3');
  if (!step1 || !step2 || !step3) return;

  // ---- nav buttons (ids, data-attrs, or class fallbacks)
  const to2   = $('#coToStep2')  || $('[data-co="to-2"]')  || $('.to-step-2');
  const to3   = $('#coToStep3')  || $('[data-co="to-3"]')  || $('.to-step-3');
  const back1 = $('#coBackTo1')  || $('[data-co="back-1"]')|| $('.back-to-1');
  const back2 = $('#coBackTo2')  || $('[data-co="back-2"]')|| $('.back-to-2');
  const closeX= $('#checkoutClose') || $('[data-co="close"]') || $('.co-close');

  // ---- payment area
  const payWrap = $('#coPayWrap') || $('[data-co="pay-wrap"]') || $('.co-pay');

  // ---- totals
  const qtyMinus = $('#qtyMinus'), qtyPlus = $('#qtyPlus'), qtyOut = $('#qtyOut');
  const msrpOut = $('#msrpOut'), saleOut = $('#saleOut'), freeOut = $('#freeOut');
  const subOut  = $('#subtotalOut'), taxOut = $('#taxOut'), shipOut = $('#shipOut'), totalOut = $('#totalOut');

  // ---- optional page CTAs to hide (don’t touch pointer-events)
  const pageCTAs = $$('.cta-primary, .claim-cta, .hero-cta, .claim-free-bottles');

  // ---- config
  const CFG = {
    MSRP: 90, SALE: 45, TAX: 0.00, SHIP: 0.00,
    DISCOUNTS: { cashapp:0.10, crypto:0.15, card:0, paypal:0, venmo:0 },
    AUTO_DISCOUNT: true
  };

  // ---- state
  let qty = Math.max(1, parseInt(qtyOut?.textContent || '1', 10) || 1);
  let discount = 0;
  let chosenPay = null;

  // ---- inject minimal CSS guard so steps render even if theme hides them
  (function injectGuardCSS(){
    const css = `
      #checkoutModal [data-step], .co-step { display:none; }
      #checkoutModal .co-force { display:block !important; visibility:visible !important; opacity:1 !important; }
      #checkoutModal .co-overlay-kill { pointer-events:none !important; }
      #checkoutModal[data-step="1"] #coStep1,
      #checkoutModal[data-step="2"] #coStep2,
      #checkoutModal[data-step="3"] #coStep3 { display:block; }
    `;
    const tag = document.createElement('style'); tag.textContent = css; document.head.appendChild(tag);
  })();

  // ---- FB Pixel (browser) de-duped (optional)
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

  // ---- show/hide steps (explicit only) + force visible class
  function showStepEl(el){
    if (!el) return;
    el.classList.add('co-force');     // beats display:none !important
    el.style.display = 'block';
    el.style.visibility = 'visible';
    el.style.opacity = '1';
  }
  function hideStepEl(el){
    if (!el) return;
    el.classList.remove('co-force');
    el.style.display = 'none';
  }

  function step(n){
    const arr = [step1, step2, step3];
    arr.forEach((s,i)=> i===n ? showStepEl(s) : hideStepEl(s));
    modal.dataset.step = String(n+1);
    if (n === 1) unblockStep2(); // ensure CC iframes clickable when entering step 2
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

  // ---- validation (minimal; won’t block you)
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

  // ---- totals
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

    try{
      localStorage.setItem('co_total', String(total.toFixed(2)));
      localStorage.setItem('co_qty', String(qty));
      localStorage.setItem('co_discount', String(discount));
      localStorage.setItem('co_pay', chosenPay || '');
    }catch(e){}
  }
  function setQty(n){
    const next = Math.max(1, n|0);
    if (next !== qty){ qty = next; renderTotals(); }
  }
  if (qtyMinus) on(qtyMinus, 'click', e=>{ e.preventDefault(); setQty(qty-1); });
  if (qtyPlus)  on(qtyPlus,  'click', e=>{ e.preventDefault(); setQty(qty+1); });

  // ---- payment selection (single + double-click; never toggles off)
  function selectCard(card){
    if (!card || !card.hasAttribute('data-pay')) return;
    (payWrap?.querySelectorAll?.('[data-pay]')||[]).forEach(el=>el.removeAttribute('data-pay-selected'));
    card.setAttribute('data-pay-selected','true');

    chosenPay = card.getAttribute('data-pay') || null;

    const r = card.querySelector('input[type="radio"][name="payMethod"]');
    if (r && !r.checked){ r.checked = true; r.dispatchEvent(new Event('change', { bubbles:true })); }

    if (CFG.AUTO_DISCOUNT){
      const d = CFG.DISCOUNTS[chosenPay] || 0;
      if (d !== discount){ discount = d; renderTotals(); }
    }
  }
  function bindPayment(){
    if (!payWrap) return;
    const handler = e => {
      const card = e.target.closest?.('[data-pay]');
      if (card && payWrap.contains(card)) selectCard(card);
    };
    on(payWrap, 'click', handler);
    on(payWrap, 'dblclick', handler);

    payWrap.querySelectorAll('input[type="radio"][name="payMethod"]').forEach(r=>{
      if (r.__coBound) return; r.__coBound = true;
      r.addEventListener('change', ()=>{ const card=r.closest('[data-pay]'); if(card) selectCard(card); });
    });

    // Re-bind radios if DOM inside payWrap changes (themes sometimes redraw)
    const mo = new MutationObserver(()=>{
      payWrap.querySelectorAll('input[type="radio"][name="payMethod"]').forEach(r=>{
        if (r.__coBound) return; r.__coBound = true;
        r.addEventListener('change', ()=>{ const card=r.closest('[data-pay]'); if(card) selectCard(card); });
      });
    });
    mo.observe(payWrap, { childList:true, subtree:true });
  }

  // ---- kill overlays/guards INSIDE step 2 that block clicks (iframes/inputs)
  function unblockStep2(){
    const bad = /overlay|backdrop|guard|mask|scrim|shield|veil|cover|blocker|glass/i;
    step2.querySelectorAll('*').forEach(el=>{
      const cls = el.className ? String(el.className) : '';
      if (!bad.test(cls)) return;
      const cs = getComputedStyle(el);
      if ((cs.position === 'absolute' || cs.position === 'fixed') && cs.pointerEvents !== 'none') {
        el.classList.add('co-overlay-kill');
        el.style.pointerEvents = 'none';
      }
    });
  }

  // ---- openers (delegated; bubble phase; won’t block inputs)
  document.addEventListener('click', (e)=>{
    const opener = e.target.closest?.('.open-checkout');
    if (!opener) return;
    e.preventDefault();
    open();
    FB.once('AddToCart', { content_name:'Claim Free Bottles CTA' });
  });

  // ---- nav (explicit; prevent accidental form submit)
  if (to2)   on(to2,   'click', e=>{ e.preventDefault(); if (!ok1()) return alert('Enter a valid name + email.'); step(1); });
  if (to3)   on(to3,   'click', e=>{ e.preventDefault(); if (!ok2()) return alert('Select a payment method.'); step(2); FB.once('AddPaymentInfo'); });
  if (back1) on(back1, 'click', e=>{ e.preventDefault(); step(0); });
  if (back2) on(back2, 'click', e=>{ e.preventDefault(); step(1); });

  if (closeX) on(closeX, 'click', e=>{ e.preventDefault(); close(); });

  // ---- init
  hide(modal);        // modal closed by default
  step(0);            // internal state = step 1
  renderTotals();
  bindPayment();

  // Keep unblocking when step changes
  const stepMo = new MutationObserver(()=>{ if (modal.dataset.step === '2') unblockStep2(); });
  stepMo.observe(modal, { attributes:true, attributeFilter:['data-step'] });

  // Debug surface
  window.CO = { open, close, step, setQty, setPay: s => {
    const c = payWrap?.querySelector?.(`[data-pay="${s}"]`);
    if (c) selectCard(c);
  }};
})();
