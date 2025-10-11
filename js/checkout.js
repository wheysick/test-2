/* ============================================================================
   checkout.js — FINAL (site-specific, Recurly + Coinbase + Alt methods)
   Matches your HTML IDs & inline onclick handlers.
   - Globals used by markup: checkoutOpen, checkoutClose, checkoutBack, gotoStep2, gotoStep3
   - Payment tiles: click + dblclick; idempotent selection
   - Card (Recurly): config/mount, tokenize, POST, redirect
   - Crypto (Coinbase): create charge, redirect to hosted_url
   - Cash App / Venmo / PayPal: instructions pane, then thank-you
============================================================================ */
(function(){
  'use strict';
  if (window.__CHECKOUT_FINAL__) return;
  window.__CHECKOUT_FINAL__ = true;

  // ---------- Tiny DOM helpers
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const show = el => { if (!el) return; el.hidden = false; el.removeAttribute('aria-hidden'); el.style.display = ''; };
  const hide = el => { if (!el) return; el.hidden = true;  el.setAttribute('aria-hidden','true'); el.style.display = 'none'; };
  const money = n => '$' + (Number(n)||0).toFixed(2);
  const clamp = (n,min=1,max=99) => { n=Math.floor(Number(n)||0); return n<min?min:n>max?max:n; };

  // ---------- Nodes (match your markup)
  const modal   = $('#checkoutModal');
  const step1   = $('#coStep1');
  const step2   = $('#coStep2');
  const step3   = $('#coStep3');
  const backLink= $('#coBackLink');
  const closeX  = $('#checkoutClose');

  // Step 2
  const qtyInput= $('#coQty');
  const qtyDec  = step2?.querySelector('.qty-dec');
  const qtyInc  = step2?.querySelector('.qty-inc');
  const pricePerEl = $('#pricePer');
  const itemsEl = $('#coItems');
  const merchEl = $('#coMerch');
  const methodEl= $('#coMethod');
  const taxEl   = $('#coTax');
  const shipEl  = $('#coShip');
  const totalEl = $('#coTotal');

  // Step 2 payment buttons
  const btnCard    = $('#pmCard');
  const btnPayPal  = $('#pmPayPal');
  const btnVenmo   = $('#pmVenmo');
  const btnCashApp = $('#pmCashApp');
  const btnCrypto  = $('#pmCrypto');

  // Step 3 panes / submit
  const cardPane = $('#coCardPane');
  const altPane  = $('#coAltPane');
  const submitBtn= $('#coSubmit');

  if (!modal || !step1 || !step2 || !step3) return;

  // ---------- Pricing / Config
  const MSRP = 90;           // crossed-out per paid bottle
  const SALE = 45;           // sale per paid bottle
  const TAX  = 0.00;         // set your tax rate if needed
  const SHIP = 0.00;         // shipping cost
  const ALT_DISCOUNT = 0.15; // 15% off for alt methods

  // ---------- State
  let qty = clamp(qtyInput?.value || 1);
  let method = 'card'; // 'card' | 'paypal' | 'venmo' | 'cashapp' | 'crypto'

  // ---------- Step helpers
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
    if (n===1){ show(step1); hide(step2); hide(step3); }
    if (n===2){ hide(step1); show(step2); hide(step3); unblockStep2(); }
    if (n===3){ hide(step1); hide(step2); show(step3); prepareStep3(); }
    modal.setAttribute('data-step', String(n));
  }

  // Kill overlays inside Step 2 that can block clicks/iframes
  function unblockStep2(){
    const bad = /overlay|backdrop|guard|mask|scrim|shield|veil|cover|blocker|glass/i;
    step2.querySelectorAll('*').forEach(el=>{
      const cls = el.className ? String(el.className) : '';
      if (!bad.test(cls)) return;
      const cs = getComputedStyle(el);
      if ((cs.position==='absolute' || cs.position==='fixed') && cs.pointerEvents!=='none'){
        el.style.pointerEvents='none';
      }
    });
  }

  // ---------- Payment method selection (click + dblclick)
  function setMethod(m){
    method = m;
    [btnCard,btnPayPal,btnVenmo,btnCashApp,btnCrypto].forEach(b=>b&&b.classList.remove('is-selected'));
    ({card:btnCard,paypal:btnPayPal,venmo:btnVenmo,cashapp:btnCashApp,crypto:btnCrypto}[m])?.classList.add('is-selected');
    totals();
  }
  function bindMethods(){
    const bind = (btn, m) => {
      if (!btn) return;
      const h = e => { e.preventDefault(); setMethod(m); };
      btn.addEventListener('click', h);
      btn.addEventListener('dblclick', h);
    };
    bind(btnCard,'card'); bind(btnPayPal,'paypal'); bind(btnVenmo,'venmo'); bind(btnCashApp,'cashapp'); bind(btnCrypto,'crypto');
  }

  // ---------- Totals
  function totals(){
    qty = clamp(qtyInput ? qtyInput.value : qty);
    const free   = qty;                 // Buy X Get X Free
    const merch  = SALE * qty;
    const disc   = (method==='card') ? 0 : merch * ALT_DISCOUNT;
    const taxable= Math.max(0, merch - disc);
    const tax    = taxable * TAX;
    const total  = taxable + tax + SHIP;

    if (pricePerEl) pricePerEl.textContent = money(SALE);
    if (itemsEl)    itemsEl.textContent    = `${qty+free} bottles (${qty} paid + ${free} free)`;
    if (merchEl)    merchEl.textContent    = money(merch);
    if (methodEl)   methodEl.textContent   = disc ? ('–' + money(disc)) : '$0.00';
    if (taxEl)      taxEl.textContent      = money(tax);
    if (shipEl)     shipEl.textContent     = SHIP ? money(SHIP) : 'FREE';
    if (totalEl)    totalEl.textContent    = money(total);

    try {
      localStorage.setItem('co_total', String(total.toFixed(2)));
      localStorage.setItem('co_qty', String(qty));
      localStorage.setItem('co_method', method);
    } catch(_) {}
  }
  function bindQty(){
    qtyDec && qtyDec.addEventListener('click', e=>{ e.preventDefault(); qty = clamp(qty-1); if (qtyInput) qtyInput.value=qty; totals(); });
    qtyInc && qtyInc.addEventListener('click', e=>{ e.preventDefault(); qty = clamp(qty+1); if (qtyInput) qtyInput.value=qty; totals(); });
    qtyInput && qtyInput.addEventListener('input', ()=>{ qty = clamp(qtyInput.value); qtyInput.value=qty; totals(); });
  }

  // ---------- Step 3 preparation
  function prepareStep3(){
    if (method === 'card'){
      show(cardPane); hide(altPane);
      // Prefer Recurly Elements (RecurlyUI), fall back to __recurlyBridge
      try {
        if (window.RecurlyUI && typeof window.RecurlyUI.mount === 'function'){
          window.RecurlyUI.mount();
        } else if (window.__recurlyBridge && typeof window.__recurlyBridge.mount === 'function'){
          window.__recurlyBridge.mount();
        }
      } catch(e){ console.warn('[Recurly mount]', e); }
    } else {
      hide(cardPane); show(altPane);
      if (altPane){
        const map = {
          paypal:  `<div class="alt-box"><h4>PayPal</h4><p>You’ll be redirected to PayPal to complete the purchase with a 15% discount applied.</p></div>`,
          venmo:   `<div class="alt-box"><h4>Venmo</h4><p>Send to <strong>@YourHandle</strong>. Include your email in the note. 15% discount applies.</p></div>`,
          cashapp: `<div class="alt-box"><h4>Cash App</h4><p>Send to <strong>$YourCashtag</strong>. Include your email in the note. 15% discount applies.</p></div>`,
          crypto:  `<div class="alt-box"><h4>Crypto</h4><p>We accept BTC/ETH/USDC. You’ll be sent to Coinbase to complete payment.</p></div>`
        };
        altPane.innerHTML = map[method] || `<div class="alt-box"><p>Alternate payment selected.</p></div>`;
      }
    }
  }

  // ---------- Globals used by your markup
  window.checkoutOpen  = function(){ setModalOpen(true); setStep(1); };
  window.checkoutClose = function(){ setModalOpen(false); };
  window.checkoutBack  = function(){
    if (!step2.hidden && step3.hidden) { setStep(1); return; }
    if (!step3.hidden)                 { setStep(2); return; }
  };
  window.gotoStep2 = function(){
    // Minimal validation of Step 1
    const req = ['name','email','phone','address','city','state','zip'];
    let ok = true;
    req.forEach(n=>{
      const inp = step1.querySelector(`[name='${n}']`);
      if (inp && !String(inp.value||'').trim()){ ok=false; inp.style.borderColor='#ff5a6e'; }
      else if (inp) inp.style.borderColor='';
    });
    if (!ok){ alert('Please fill in your contact & shipping details.'); return; }
    setStep(2);
    totals();
  };
  window.gotoStep3 = function(){ if (!method) method='card'; setStep(3); };

  // ---------- Submit (Card / Crypto / Alt)
  async function submitPurchase(e){
    e.preventDefault();

    // CRYPTO → Coinbase Commerce (redirect to hosted_url)
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
        const url = data?.hosted_url || data?.url;
        if (url){ window.location.href = url; return; }
        throw new Error('Coinbase charge not created');
      } catch(err){
        alert(err?.message || 'Crypto payment failed');
      } finally {
        submitBtn.disabled = false;
      }
      return;
    }

    // ALT METHODS (Cash App / Venmo / PayPal) — proceed to thank-you (you reconcile offline)
    if (method !== 'card'){
      window.location.href = '/thank-you.html';
      return;
    }

    // CARD → Recurly Elements (prefer) or Bridge
    const tokenizer = (window.RecurlyUI && typeof window.RecurlyUI.tokenize === 'function') ? window.RecurlyUI.tokenize : null;
    if (!tokenizer){ alert('Payment form not ready'); return; }

    if (!tokenizer){ alert('Payment form not ready.'); return; }

    /// Build full billing meta (nested for Recurly Elements)
    const meta = (function(){
      const get = n => (step1.querySelector(`[name='${n}']`)?.value || '').trim();
      const full = get('name'); const ix = full.lastIndexOf(' ');
      const addr1 = get('address') || get('address1') || get('street') || get('street_address');
      const city  = get('city');
      const state = get('state') || get('region');
      const zip   = get('zip') || get('postal') || get('postal_code');
      const country = (get('country') || 'US').toUpperCase();
      return {
        billing_info: {
          first_name: ix>0 ? full.slice(0,ix) : full,
          last_name:  ix>0 ? full.slice(ix+1) : '',
          email: get('email'),
          phone: get('phone'),
          address: {
            line1: addr1,
            city: city,
            region: state ? state.toUpperCase() : '',
            state: state ? state.toUpperCase() : '',
            postal_code: zip,
            zip: zip,
            country: country
          }
        }
      };
    })();

    try {
      submitBtn.disabled = true;

      // 1) Tokenize (validates card + meta)
      const token = await tokenizer(meta);

      // 2) Charge via your existing API
      const unit_amount = SALE;
      const res = await fetch('/api/payments/recurly/charge', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ token: token?.id || token, qty, unit_amount })
      });
      const out = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(out?.error || out?.message || 'Charge failed');

      // 3) Success → redirect
      try { localStorage.setItem('co_purchase', JSON.stringify({ qty, unit_amount, total: qty*unit_amount })); } catch(_){}
      window.location.href = '/thank-you.html';
    } catch(err){
      console.error('[Checkout error]', err);
      alert(err?.message || 'Payment failed');
    } finally {
      submitBtn.disabled = false;
    }
  }

  // ---------- Bindings
  bindMethods();
  bindQty();
  submitBtn && submitBtn.addEventListener('click', submitPurchase);

  backLink && backLink.addEventListener('click', (e)=>{ e.preventDefault(); window.checkoutBack(); });
  closeX   && closeX  .addEventListener('click', (e)=>{ e.preventDefault(); window.checkoutClose(); });

  // If something else already opened the modal, honor it
  if (document.documentElement.getAttribute('data-checkout-open') === '1'){
    setModalOpen(true); setStep(1);
  }

  // Initial totals paint
  totals();
})();
