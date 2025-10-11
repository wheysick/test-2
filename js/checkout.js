
/* ============================================================================
   checkout.js — FINAL (site-specific, Recurly-enabled)
   - Works with existing inline handlers: gotoStep2(), gotoStep3(), checkoutBack(), checkoutClose(), checkoutOpen()
   - Uses your actual markup (#coStep1, #coStep2, #coStep3; qty .qty-dec/.qty-inc and #coQty; pm buttons with #pmCard/#pmPayPal/#pmVenmo/#pmCashApp/#pmCrypto)
   - Integrates with /js/recurly-bridge.js to tokenize and POST to /api/payments/recurly/charge
   - Updates order summary (#coItems, #coMerch, #coMethod, #coTax, #coShip, #coTotal) with method-based discount
   - Leaves FB pixel files in charge of tracking (pixel.js + pixel-events.js)
============================================================================ */
(function(){
  'use strict';
  if (window.__CHECKOUT_FINAL__) return; window.__CHECKOUT_FINAL__ = true;

  // ---------- DOM helpers
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  // ---------- Elements
  const modal = $('#checkoutModal');
  const step1 = $('#coStep1');
  const step2 = $('#coStep2');
  const step3 = $('#coStep3');
  const backLink = $('#coBackLink');
  const closeX = $('#checkoutClose');

  if (!modal || !step1 || !step2 || !step3) {
    console.warn('[checkout] Required nodes missing'); return;
  }

  // Step 2 UI
  const qtyInput = $('#coQty');
  const qtyDec = step2.querySelector('.qty-dec');
  const qtyInc = step2.querySelector('.qty-inc');
  const pricePerEl = $('#pricePer');
  const itemsEl = $('#coItems');
  const merchEl = $('#coMerch');
  const methodEl = $('#coMethod');
  const taxEl = $('#coTax');
  const shipEl = $('#coShip');
  const totalEl = $('#coTotal');

  // Step 2 methods
  const btnCard   = $('#pmCard');
  const btnPayPal = $('#pmPayPal');
  const btnVenmo  = $('#pmVenmo');
  const btnCashApp= $('#pmCashApp');
  const btnCrypto = $('#pmCrypto');

  // Step 3 panes
  const cardPane  = $('#coCardPane');
  const altPane   = $('#coAltPane');
  const submitBtn = $('#coSubmit');

  // ---------- Pricing config
  const MSRP = 90;          // crossed-out per bottle
  const SALE = 45;          // sale per paid bottle
  const TAX  = 0.00;        // tax rate (0.085 = 8.5%)
  const SHIP = 0.00;        // shipping cost
  const ALT_DISCOUNT = 0.15;// 15% off for alt methods (PayPal/Venmo/Cash App/Crypto)

  // ---------- State
  let qty = clampInt((qtyInput && Number(qtyInput.value)) || 1, 1, 99);
  let method = 'card'; // 'card' | 'paypal' | 'venmo' | 'cashapp' | 'crypto'

  // ---------- Utils
  function clampInt(n, min, max){ n = Math.floor(Number(n)||0); if (n<min) n=min; if (n>max) n=max; return n; }
  function money(n){ return '$' + (Number(n)||0).toFixed(2); }
  function show(el){ if (el) { el.hidden = false; el.removeAttribute('aria-hidden'); el.style.display = ''; } }
  function hide(el){ if (el) { el.hidden = true; el.setAttribute('aria-hidden','true'); el.style.display = 'none'; } }

  function setModalOpen(open){
    if (open){
      modal.classList.add('show');
      modal.style.display = 'grid';
      document.documentElement.setAttribute('data-checkout-open','1');
      document.body.style.overflow='hidden';
    } else {
      modal.classList.remove('show');
      modal.style.display = 'none';
      document.documentElement.removeAttribute('data-checkout-open');
      document.body.style.overflow='';
    }
  }

  function setStep(n){
    if (n === 1){ show(step1); hide(step2); hide(step3); }
    else if (n === 2){ hide(step1); show(step2); hide(step3); }
    else if (n === 3){ hide(step1); hide(step2); show(step3); }
    modal.setAttribute('data-step', String(n));
    // When entering Step 2 or back to it, make sure overlays don't block clicks
    if (n === 2) unblockStep2();
    // When entering Step 3 and using card, ensure Recurly mounts
    if (n === 3) prepareStep3();
  }

  function unblockStep2(){
    // Neutralize any overlay-like nodes that could block clicks
    const bad = /overlay|backdrop|guard|mask|scrim|shield|veil|cover|blocker|glass/i;
    step2.querySelectorAll('*').forEach(el => {
      const cls = el.className ? String(el.className) : '';
      if (!bad.test(cls)) return;
      const cs = getComputedStyle(el);
      if ((cs.position === 'absolute' || cs.position === 'fixed') && cs.pointerEvents !== 'none') {
        el.style.pointerEvents = 'none';
      }
    });
  }

  function setMethod(m){
    method = m;
    // Toggle selection styles
    [btnCard, btnPayPal, btnVenmo, btnCashApp, btnCrypto].forEach(b=> b && b.classList.remove('is-selected'));
    if (m === 'card') btnCard?.classList.add('is-selected');
    else if (m === 'paypal') btnPayPal?.classList.add('is-selected');
    else if (m === 'venmo') btnVenmo?.classList.add('is-selected');
    else if (m === 'cashapp') btnCashApp?.classList.add('is-selected');
    else if (m === 'crypto') btnCrypto?.classList.add('is-selected');
    totals();
  }

  function totals(){
    qty = clampInt(qtyInput ? qtyInput.value : qty, 1, 99);
    const free = qty; // Buy X, Get X Free
    const merch = SALE * qty;
    const disc = (method === 'card') ? 0 : merch * ALT_DISCOUNT;
    const taxable = Math.max(0, merch - disc);
    const tax = taxable * TAX;
    const total = taxable + tax + SHIP;

    // Update UI
    if (pricePerEl) pricePerEl.textContent = money(SALE);
    if (itemsEl) itemsEl.textContent = `${qty + free} bottles (${qty} paid + ${free} free)`;
    if (merchEl) merchEl.textContent = money(merch);
    if (methodEl) methodEl.textContent = disc ? ('–' + money(disc)) : '$0.00';
    if (taxEl) taxEl.textContent = money(tax);
    if (shipEl) shipEl.textContent = SHIP ? money(SHIP) : 'FREE';
    if (totalEl) totalEl.textContent = money(total);

    try {
      localStorage.setItem('co_total', String(total.toFixed(2)));
      localStorage.setItem('co_qty', String(qty));
      localStorage.setItem('co_method', method);
    } catch(_) {}
  }

  function prepareStep3(){
    // Choose pane
    if (method === 'card'){
      show(cardPane); hide(altPane);
      // Mount Recurly Elements if available
      try {
        if (window.RecurlyUI && typeof window.RecurlyUI.mount === 'function'){
          window.RecurlyUI.mount();
        } else if (window.__recurlyBridge && typeof window.__recurlyBridge.mount === 'function') {
          window.__recurlyBridge.mount();
        }
      } catch(e){ console.warn('[Recurly] mount error', e); }
    } else {
      hide(cardPane); show(altPane);
      // Render method-specific instructions
      if (altPane){
        const map = {
          paypal:  `<div class="alt-box"><h4>PayPal</h4><p>You’ll be redirected to PayPal to complete the purchase with a 15% discount applied.</p></div>`,
          venmo:   `<div class="alt-box"><h4>Venmo</h4><p>Send payment to <strong>@YourHandle</strong> with your email in the note. 15% discount applies.</p></div>`,
          cashapp: `<div class="alt-box"><h4>Cash App</h4><p>Send to <strong>$YourCashtag</strong>. Include your email in the note. 15% discount applies.</p></div>`,
          crypto:  `<div class="alt-box"><h4>Crypto</h4><p>We accept BTC/ETH/USDC. You’ll receive a payment address after confirming your order. 15% discount applies.</p></div>`
        };
        altPane.innerHTML = map[method] || `<div class="alt-box"><p>Alternate payment selected.</p></div>`;
      }
    }
  }

  // ---------- Global functions (used by inline onclick in HTML)
  window.checkoutOpen = function(){ setModalOpen(true); setStep(1); };
  window.checkoutClose = function(){ setModalOpen(false); };
  window.checkoutBack = function(){
    if (!step2.hidden && step3.hidden) { setStep(1); return; }
    if (!step3.hidden) { setStep(2); return; }
    // else no-op
  };
  window.gotoStep2 = function(){
    // Minimal validation
    const get = n => (step1.querySelector(`[name='${n}']`)?.value || '').trim();
    const required = ['name','email','phone','address','city','state','zip'];
    let ok = true;
    required.forEach(n => {
      const input = step1.querySelector(`[name='${n}']`);
      if (input && !input.value.trim()) { ok = false; input.style.borderColor = '#ff5a6e'; }
      else if (input) input.style.borderColor = '';
    });
    if (!ok) { alert('Please fill in your contact & shipping details.'); return; }

    setStep(2);
    totals();
  };
  window.gotoStep3 = function(){
    if (!method) method = 'card';
    setStep(3);
    prepareStep3();
  };

  // ---------- Bindings

  // Payment selection (single AND double click, idempotent)
  function bindPayment(){
    const map = [
      [btnCard, 'card'], [btnPayPal, 'paypal'], [btnVenmo, 'venmo'], [btnCashApp, 'cashapp'], [btnCrypto, 'crypto']
    ];
    const handler = (m) => (e)=>{ e.preventDefault(); setMethod(m); };
    map.forEach(([btn,m])=>{
      if (!btn) return;
      btn.addEventListener('click', handler(m));
      btn.addEventListener('dblclick', handler(m));
    });
  }

  // Qty buttons
  function bindQty(){
    if (qtyDec) qtyDec.addEventListener('click', (e)=>{ e.preventDefault(); qty = clampInt(qty-1,1,99); if (qtyInput) qtyInput.value = qty; totals(); });
    if (qtyInc) qtyInc.addEventListener('click', (e)=>{ e.preventDefault(); qty = clampInt(qty+1,1,99); if (qtyInput) qtyInput.value = qty; totals(); });
    if (qtyInput) qtyInput.addEventListener('input', ()=>{ qty = clampInt(qtyInput.value,1,99); qtyInput.value = qty; totals(); });
  }

  // Submit purchase (card method via Recurly)
  async function submitPurchase(e){
    e.preventDefault();
    if (method === 'crypto'){ 
      try {
        submitBtn.disabled = true;
        const order = { qty, unit_amount: SALE, total: qty * SALE };
        const res = await fetch('/api/payments/coinbase/create-charge', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ order })
        });
        const data = await res.json().catch(()=>({}));
        if (!res.ok) throw new Error(data?.error || 'Crypto init failed');
        if (data && (data.hosted_url || data.url)) {
          window.location.href = data.hosted_url || data.url; 
          return;
        }
        throw new Error('Coinbase charge not created');
      } catch(err){ 
        console.error(err); 
        alert(err?.message || 'Crypto payment failed'); 
        return; 
      } finally { submitBtn.disabled = false; } 
    }
    if (method !== 'card'){
      alert('Alternate methods (PayPal/Venmo/Cash App) show instructions only here. Choose Card or Crypto.'); 
      return;
    }
    if (!window.__recurlyBridge || typeof window.__recurlyBridge.tokenize !== 'function'){
      alert('Payment form not ready.'); return;
    }
    const getS1 = n => (step1.querySelector(`[name='${n}']`)?.value || '').trim();
    const full = getS1('name'); const ix = full.lastIndexOf(' ');
    const meta = {
      first_name: ix>0 ? full.slice(0,ix) : full,
      last_name:  ix>0 ? full.slice(ix+1) : '',
      email: getS1('email'),
      phone: getS1('phone')
    };
    try {
      submitBtn.disabled = true;
      const token = await window.__recurlyBridge.tokenize(meta);
      const unit_amount = SALE; // per paid bottle
      const body = JSON.stringify({ token: token?.id, qty, unit_amount });
      const res  = await fetch('/api/payments/recurly/charge', {
        method:'POST', headers:{'Content-Type':'application/json'}, body
      });
      const out = await res.json().catch(()=>({}));
      if (!res.ok){ throw new Error(out?.error || out?.message || 'Charge failed'); }

      // Success → redirect
      try {
        localStorage.setItem('co_purchase', JSON.stringify({ qty, unit_amount, total: qty*unit_amount }));
      } catch(_) {}
      window.location.href = '/thank-you.html';
    } catch(err){
      console.error('[Checkout error]', err);
      alert(err?.message || 'Payment failed');
    } finally {
      submitBtn.disabled = false;
    }
  }

  // Bindings
  bindPayment();
  bindQty();
  submitBtn && submitBtn.addEventListener('click', submitPurchase);

  // Initial paint
  totals();

  // If some other script already opened the modal (data-checkout-open=1), honor it
  if (document.documentElement.getAttribute('data-checkout-open') === '1'){
    setModalOpen(true);
    setStep(1);
  }
})();
