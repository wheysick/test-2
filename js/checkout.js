/* ===== checkout.js — v3.0 (final) =====
   - Bulletproof Step 1 → 2 → 3 flow
   - Quantity, pricing, totals, discounts
   - Payment selection (radio OR clickable tiles)
   - Hooks into fb-events.js (no duplicate fires)
*/
(function () {
  if (window.__checkoutInit) return; window.__checkoutInit = true;

  // Shortcuts
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  // Modal & Steps
  const modal = $('#checkoutModal');
  if (!modal) return;

  const step1  = $('#coStep1');
  const step2  = $('#coStep2');
  const step3  = $('#coStep3');

  const btnTo2 = $('#coToStep2');
  const btnTo3 = $('#coToStep3');
  const back1  = $('#coBackTo1');
  const back2  = $('#coBackTo2');
  const closeX = $('#checkoutClose');

  const payWrap = $('#coPayWrap'); // optional wrapper for payment tiles
  const pageCTAs = $$('.cta-primary, .claim-cta, .hero-cta, .claim-free-bottles');

  // Pricing
  const MSRP = 90;   // crossed-out per bottle
  const SALE = 45;   // actual per paid bottle
  const TAX  = 0.0;  // set to your tax rate (0.085 = 8.5%)
  const SHIP = 0.00; // free shipping

  const qtyMinus = $('#qtyMinus');
  const qtyPlus  = $('#qtyPlus');
  const qtyOut   = $('#qtyOut');
  let qty = Math.max(1, parseInt(qtyOut?.textContent||'1',10)||1);

  // Totals outputs
  const msrpOut  = $('#msrpOut');
  const saleOut  = $('#saleOut');
  const freeOut  = $('#freeOut');    // free bottles = qty
  const subOut   = $('#subtotalOut');
  const taxOut   = $('#taxOut');
  const shipOut  = $('#shipOut');
  const totalOut = $('#totalOut');

  // Discount chips (e.g., 10% off for CashApp / 15% for Crypto)
  let discount = 0; // 0..0.15
  function setDiscount(val) { discount = Math.max(0, Math.min(0.99, val||0)); renderTotals(); }

  // Helpers
  function show(el){ if(el) el.style.display=''; }
  function hide(el){ if(el) el.style.display='none'; }
  function lockScroll(on){ document.documentElement.style.overflow = document.body.style.overflow = on?'hidden':''; }
  function step(n){
    [step1,step2,step3].forEach((s,i)=> i===n ? show(s) : hide(s));
    modal.scrollTo?.({top:0,behavior:'smooth'});
  }

  function renderTotals(){
    const paidBottles = qty;          // “Buy X Get X Free”
    const freeBottles = qty;
    const msrp = MSRP * paidBottles;
    const base = SALE * paidBottles;
    const afterDisc = base * (1 - discount);
    const taxAmt = afterDisc * TAX;
    const total  = afterDisc + taxAmt + SHIP;

    if (qtyOut)   qtyOut.textContent  = String(qty);
    if (freeOut)  freeOut.textContent = String(freeBottles);
    if (msrpOut)  msrpOut.textContent = `$${msrp.toFixed(2)}`;
    if (saleOut)  saleOut.textContent = `$${SALE.toFixed(2)}/bottle`;
    if (subOut)   subOut.textContent  = `$${afterDisc.toFixed(2)}`;
    if (taxOut)   taxOut.textContent  = `$${taxAmt.toFixed(2)}`;
    if (shipOut)  shipOut.textContent = `$${SHIP.toFixed(2)}`;
    if (totalOut) totalOut.textContent= `$${total.toFixed(2)}`;

    // Persist for thank-you purchase event
    try {
      localStorage.setItem('co_total', String(total.toFixed(2)));
      localStorage.setItem('co_qty', String(qty));
      localStorage.setItem('co_discount', String(discount));
    } catch(e){}
  }

  function validateStep1(){
    const name  = step1?.querySelector('[name="full_name"], [name="name"], input[autocomplete="name"]');
    const email = step1?.querySelector('[name="email"]');
    const okName = !name || !!name.value.trim();
    const okMail = !email || /\S+@\S+\.\S+/.test(email.value);
    return okName && okMail;
  }
  function validateStep2(){
    if (!payWrap) return true;
    const chosen = payWrap.querySelector('input[name="payMethod"]:checked') ||
                   payWrap.querySelector('[data-pay-selected="true"]');
    return !!chosen || !payWrap.querySelector('input[name="payMethod"], [data-pay]');
  }

  function open(){
    show(modal); lockScroll(true); step(0);
    pageCTAs.forEach(hide);
  }
  function close(){
    hide(modal); lockScroll(false);
    pageCTAs.forEach(show);
  }

  // Global triggers to open checkout
  document.addEventListener('click', (e)=>{
    const a = e.target.closest?.('.open-checkout');
    if(!a) return;
    e.preventDefault();
    open();
    // Track AddToCart once here (landing CTA)
    window.FB && FB.trackOnce('AddToCart', {content_name:'Claim Free Bottles CTA'});
  }, true);

  // Close handlers
  if (closeX) closeX.onclick = (e)=>{ e.preventDefault(); close(); };

  // Step nav
  if (btnTo2) btnTo2.onclick = (e)=>{
    e.preventDefault();
    if (!validateStep1()) { toast('Enter a valid name and email.'); return; }
    step(1);
    window.FB && FB.trackOnce('InitiateCheckout');
  };
  if (btnTo3) btnTo3.onclick = (e)=>{
    e.preventDefault();
    if (!validateStep2()) { toast('Select a payment method.'); return; }
    step(2);
    window.FB && FB.trackOnce('AddPaymentInfo');
  };
  if (back1) back1.onclick = (e)=>{ e.preventDefault(); step(0); };
  if (back2) back2.onclick = (e)=>{ e.preventDefault(); step(1); };

  // Qty controls
  function setQty(n){ qty = Math.max(1, n|0); renderTotals(); }
  if (qtyMinus) qtyMinus.onclick = (e)=>{ e.preventDefault(); setQty(qty-1); };
  if (qtyPlus)  qtyPlus.onclick  = (e)=>{ e.preventDefault(); setQty(qty+1); };

  // Payment tiles (clickable cards)
  if (payWrap) {
    payWrap.addEventListener('click', (e)=>{
      const card = e.target.closest('[data-pay]');
      if (!card) return;
      payWrap.querySelectorAll('[data-pay]').forEach(el=>el.removeAttribute('data-pay-selected'));
      card.setAttribute('data-pay-selected','true');
      const r = card.querySelector('input[type="radio"][name="payMethod"]');
      if (r){ r.checked = true; r.dispatchEvent(new Event('change',{bubbles:true})); }

      // Optional: auto-set discount by method
      const met = card.getAttribute('data-pay');
      if (met === 'cashapp') setDiscount(0.10);
      else if (met === 'crypto') setDiscount(0.15);
      else setDiscount(0);
    });
  }

  // Render once
  renderTotals();

  // Tiny toast
  let toastLock=false;
  function toast(msg){
    if (toastLock) return; toastLock=true;
    const t=document.createElement('div');
    t.style.cssText='position:fixed;left:50%;transform:translateX(-50%);bottom:18px;max-width:90vw;padding:10px 14px;border-radius:10px;background:rgba(0,0,0,.86);color:#fff;font:600 14px system-ui;z-index:99999';
    t.textContent=msg; document.body.appendChild(t);
    setTimeout(()=>{t.remove();toastLock=false;},2000);
  }

  // Expose for debugging
  window.checkoutOpen = open;
  window.checkoutClose= close;
  window.checkoutStep = step;
})();
