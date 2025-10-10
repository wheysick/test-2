// ===== checkout.js — v10.6 (step nav hardening, alt-method panes, back fix) =====
(function(){
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const modal   = $('#checkoutModal');
  if (!modal) return;

  const step1   = $('#coStep1');
  const step2   = $('#coStep2');
  const step3   = $('#coStep3');
  const submit  = $('#coSubmit');
  const submitWrap = $('#coSubmitWrap');
  const close   = $('#checkoutClose');
  const toStep2 = $('#coToStep2');
  const toStep3 = $('#coToStep3');
  const cardset = $('#coCardPane');
  const altPane = $('#coAltPane');

  // Always open checkout on any .open-checkout (capture beats others)
  document.addEventListener('click', function(e){
    const a = e.target.closest && e.target.closest('.open-checkout');
    if (!a) return;
    e.preventDefault();
    checkoutOpen();
  }, true);

  // === Close controls: button, ESC key, and click-outside ===
if (close) {
  close.addEventListener('click', (e) => {
    e.preventDefault();
    checkoutClose();
  });
}

// Close on ESC (capture so it wins)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('show')) {
    checkoutClose();
  }
}, true);

// Optional: click outside the card closes
modal.addEventListener('click', (e) => {
  if (e.target === modal) checkoutClose();
});


  // DEFENSIVE: delegated step navigation (capture) so we never get stuck on step 1
  modal.addEventListener('click', function(e){
    const g2 = e.target.closest && e.target.closest('#coToStep2, [data-goto-step="2"]');
    if (g2){ e.preventDefault(); setStep(2); return; }
    const g3 = e.target.closest && e.target.closest('#coToStep3, [data-goto-step="3"]');
    if (g3){ e.preventDefault(); setStep(3); return; }
  }, true);

  // Prevent native submits (Enter) from navigating away
  modal.addEventListener('submit', (e)=>{ if (modal.contains(e.target)) e.preventDefault(); }, true);

  // Pressing Enter on Step 1 should advance to Step 2
  step1 && step1.addEventListener('submit', (e)=>{ e.preventDefault(); setStep(2); }, true);

  // Step-2 pricing + totals
  const PRICE = 90.00, TAX_RATE = 0.0874, ALT_DISC_RATE = 0.15;
  const qtyInput = $('#coQty');
  const elItems = $('#coItems'), elMerch = $('#coMerch'), elMethod = $('#coMethod');
  const elTax   = $('#coTax'),   elShip  = $('#coShip'),  elTotal  = $('#coTotal');
  let qty = 1;
  let payMethod = 'card'; // card | paypal | venmo | cashapp | crypto

  const fmt = n => '$' + n.toFixed(2);
  function setQty(n){ qty = Math.min(99, Math.max(1, n|0)); if(qtyInput) qtyInput.value = String(qty); updateTotals(); }

  function updateTotals(){
    const merch = qty * PRICE;
    const disc  = (payMethod === 'card') ? 0 : +(merch * ALT_DISC_RATE).toFixed(2);
    const taxable = Math.max(0, merch - disc);
    const tax   = +(taxable * TAX_RATE).toFixed(2);
    const total = taxable + tax;
    elItems && (elItems.textContent = `${qty*2} bottles (${qty} paid + ${qty} free)`);
    elMerch && (elMerch.textContent = fmt(merch));
    elMethod && (elMethod.textContent = disc ? ('−' + fmt(disc)) : fmt(0));
    elTax   && (elTax.textContent   = fmt(tax));
    elShip  && (elShip.textContent  = 'FREE');
    elTotal && (elTotal.textContent = fmt(total));
  }

  qtyInput && qtyInput.addEventListener('input', ()=>{ const v=parseInt(qtyInput.value.replace(/[^0-9]/g,''),10); setQty(isNaN(v)?1:v); });
  $$('.qty-inc').forEach(b => b.addEventListener('click', ()=> setQty(qty+1)));
  $$('.qty-dec').forEach(b => b.addEventListener('click', ()=> setQty(qty-1)));

  // Payment method selection (Step 2)
  const payButtons = {
    card:   $('#pmCard'),
    paypal: $('#pmPayPal'),
    venmo:  $('#pmVenmo'),
    cashapp:$('#pmCashApp'),
    crypto: $('#pmCrypto')
  };
  function selectMethod(kind){
    payMethod = kind;
    Object.entries(payButtons).forEach(([k, el])=>{
      if (!el) return;
      if (k === 'card') {
        el.classList.toggle('is-selected', kind === 'card');
        el.setAttribute('aria-selected', String(kind === 'card'));
      } else {
        el.setAttribute('aria-selected', String(kind === k));
      }
    });
    updateTotals();
  }
  // Click + Double-click to jump to Step 3
  if (payButtons.card){ 
    payButtons.card.addEventListener('click', ()=> selectMethod('card'));
    payButtons.card.addEventListener('dblclick', ()=>{ selectMethod('card'); setStep(3); });
  }
  if (payButtons.paypal){
    payButtons.paypal.addEventListener('click', ()=> selectMethod('paypal'));
    payButtons.paypal.addEventListener('dblclick', ()=>{ selectMethod('paypal'); setStep(3); });
  }
  if (payButtons.venmo){
    payButtons.venmo.addEventListener('click', ()=> selectMethod('venmo'));
    payButtons.venmo.addEventListener('dblclick', ()=>{ selectMethod('venmo'); setStep(3); });
  }
  if (payButtons.cashapp){
    payButtons.cashapp.addEventListener('click', ()=> selectMethod('cashapp'));
    payButtons.cashapp.addEventListener('dblclick', ()=>{ selectMethod('cashapp'); setStep(3); });
  }
  if (payButtons.crypto){
    payButtons.crypto.addEventListener('click', ()=> selectMethod('crypto'));
    payButtons.crypto.addEventListener('dblclick', ()=>{ selectMethod('crypto'); setStep(3); });
  }

  updateTotals();

  // Step switching
  function currentStep(){
    if (step3 && !step3.hidden) return 3;
    if (step2 && !step2.hidden) return 2;
    return 1;
  }
  function setStep(n){
    [step1, step2, step3].forEach((el,i)=>{
      if (!el) return;
      const on = (i===n-1);
      el.hidden = !on;
      el.setAttribute('aria-hidden', String(!on));
    });
    if (n===3){
      renderStep3UI();
      if (payMethod === 'card'){
        if (window.RecurlyUI) window.RecurlyUI.mount();
      } else {
        if (window.RecurlyUI) window.RecurlyUI.unmount();
      }
      fixClickBlockers();
    } else {
      if (window.RecurlyUI) window.RecurlyUI.unmount();
    }
  }

  // Keep the inline onclick working too
  window.gotoStep2 = function(){ setStep(2); };
  window.gotoStep3 = function(){ setStep(3); };

  // Step 3 UI per method
  function renderStep3UI(){
    if (!step3) return;
    const total = elTotal ? elTotal.textContent : '';
    if (payMethod === 'card'){
      cardset && (cardset.hidden = false);
      altPane && (altPane.hidden = true, altPane.innerHTML = '');
      if (submitWrap) submitWrap.style.display = '';
      return;
    }
    cardset && (cardset.hidden = true);
    if (submitWrap) submitWrap.style.display = 'none';

    let title = '', body = '', primary = '', url = '#', help = '';
    switch (payMethod){
      case 'paypal':
        title = 'Pay with PayPal';
        body  = 'You will be redirected to PayPal to complete your payment. Your total reflects a 15% method discount.';
        primary = 'Continue to PayPal'; url = '/pay/paypal/start';
        help = 'After paying, you\'ll be returned here automatically.'; break;
      case 'venmo':
        title = 'Pay with Venmo';
        body  = 'We\'ll open Venmo to complete your payment. Your total reflects a 15% method discount.';
        primary = 'Open Venmo'; url = '/pay/venmo/start';
        help = 'If Venmo does not open automatically, open the Venmo app and check your requests.'; break;
      case 'cashapp':
        title = 'Pay with Cash App';
        body  = 'Use Cash App to complete your payment. Your total reflects a 15% method discount.';
        primary = 'Open Cash App'; url = '/pay/cashapp/start';
        help = 'If Cash App does not open, visit cash.app and search for our cashtag.'; break;
      case 'crypto':
        title = 'Pay with Crypto';
        body  = 'Send the exact total to the address shown. Your order ships once the transaction confirms.';
        primary = 'Copy Address'; url = '#';
        help = 'Tip: Copy the address and send the exact amount from your wallet.'; break;
    }

    const altHTML = `
      <div class="alt-pane">
        <h4>${title}</h4>
        <div class="alt-row"><strong>Total:</strong> ${total}</div>
        <div class="alt-row">${body}</div>
        <div class="alt-actions">
          <button type="button" class="alt-btn" id="altPrimary">${primary}</button>
          <button type="button" class="alt-btn secondary" id="altBack">Choose another method</button>
        </div>
        <div class="alt-row" style="opacity:.85;font-size:13px;margin-top:8px;">${help}</div>
      </div>`;

    if (altPane){
      altPane.innerHTML = altHTML;
      altPane.hidden = false;
      const altPrimary = $('#altPrimary');
      const altBack = $('#altBack');
      if (altPrimary){
        altPrimary.addEventListener('click', ()=>{
          if (payMethod === 'crypto'){
            const addr = 'bc1q-example-crypto-address-1234';
            if (navigator.clipboard) navigator.clipboard.writeText(addr);
            altPrimary.textContent = 'Address Copied';
            setTimeout(()=> altPrimary.textContent = primary, 1600);
          } else {
            window.location.href = url;
          }
        });
      }
      if (altBack){ altBack.addEventListener('click', ()=>{ setStep(2); }); }
    }
  }

  // Hosted-field clickability (defensive)
  function fixClickBlockers(){
    try {
      const wrappers = step3.querySelectorAll('label, .row, .co-row, .co-field');
      wrappers.forEach(el => { el.style.pointerEvents = 'none'; });
      ['re-number','re-month','re-year','re-cvv','re-postal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.style.pointerEvents = 'auto'; el.style.position='relative'; el.style.zIndex='10'; }
      });
    } catch (e) {}
  }

  // Submit (card only)
  submit && submit.addEventListener('click', async (e)=>{
    e.preventDefault();
    try {
      if (payMethod !== 'card') { return; }
      if (!window.RecurlyUI) throw new Error('Payment form not ready');

      submit.disabled = true;
      const orig = submit.textContent;
      submit.textContent = 'Processing…';

      const get = (n) => step1.querySelector(`[name="${n}"]`)?.value?.trim() || '';
      const full = get('name') || '';
      let first = full, last = '';
      if (full.includes(' ')){ const i=full.lastIndexOf(' '); first=full.slice(0,i); last=full.slice(i+1); }

      const meta = {
        first_name: first, last_name: last,
        email: get('email'), phone: get('phone'),
        address: get('address'), city: get('city'),
        state: get('state'), zip: get('zip'),
        country: 'US',
        items: [{ sku: 'tirz-vial', qty, price: PRICE }]
      };

      const token = await window.RecurlyUI.tokenize({});

      const resp = await fetch('/api/payments/recurly/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.id || token, customer: meta })
      });

      let data=null; try{ data = await resp.json(); } catch(_){}
      if (!resp.ok) {
        const reasons = Array.isArray(data?.errors) ? `\n• ${data.errors.join('\n• ')}` : '';
        throw new Error((data?.error || `Payment failed (HTTP ${resp.status})`) + reasons);
      }

      step3.hidden = true; const ok = $('#checkoutSuccess'); if (ok) ok.hidden = false;
    } catch (err) {
      alert(err?.message || 'Payment failed');
    } finally {
      submit.disabled = false;
      submit.textContent = 'Complete Order';
    }
  });

  // Stock countdown: 47 -> 1 over 5 minutes, persists across re-open
  const STOCK_START = 47, STOCK_END = 1, STOCK_MS = 5*60*1000;
  let stockTimer = null, stockT0 = null;
  const STOCK_KEY = 'coStockT0_v1';

  function stockNow(){
    if (!stockT0) return STOCK_START;
    const now = Date.now();
    const t1 = stockT0 + STOCK_MS;
    const clamped = Math.max(0, Math.min(STOCK_MS, t1 - now));
    const ratio = clamped / STOCK_MS; // 1 -> 0
    const span = STOCK_START - STOCK_END;
    const value = STOCK_END + Math.round(span * ratio);
    return Math.max(STOCK_END, Math.min(STOCK_START, value));
  }
  function renderStock(){
    const v = stockNow();
    const s2 = $('#coStock'); const s3 = $('#coStockLine3 .qty');
    if (s2) s2.textContent = String(v);
    if (s3) s3.textContent = String(v);
  }
  function startStock(){
    if (stockTimer) return;
    const saved = parseInt(sessionStorage.getItem(STOCK_KEY)||'',10);
    stockT0 = Number.isFinite(saved) ? saved : Date.now();
    if (!Number.isFinite(saved)) sessionStorage.setItem(STOCK_KEY, String(stockT0));
    renderStock();
    stockTimer = setInterval(()=>{
      renderStock();
      if (stockNow() <= STOCK_END){ clearInterval(stockTimer); stockTimer=null; }
    }, 1000);
  }
  function stopStock(){ if (stockTimer){ clearInterval(stockTimer); stockTimer=null; } }

  // Public helpers (also used by inline onclick)
  window.checkoutOpen  = function(){
    modal.classList.add('show'); modal.style.display='grid';
    document.documentElement.setAttribute('data-checkout-open','1'); document.body.style.overflow='hidden';
    setStep(1); startStock();
  };
  window.checkoutClose = function(){
    modal.classList.remove('show'); modal.style.display='none';
    document.documentElement.removeAttribute('data-checkout-open'); document.body.style.overflow='';
    stopStock();
  };
  window.checkoutBack  = function(){ const s=currentStep(); setStep(s===3?2:1); };

  // For quick console checks if needed
  window._debugSetStep = setStep;
})();

// in checkout.js — save on change
(function(){
  const fields = ['name','email','phone','address','city','state','zip'];
  function save(){ if(!step1) return;
    const data={}; fields.forEach(n=> data[n] = step1.querySelector(`[name="${n}"]`)?.value?.trim()||'');
    localStorage.setItem('coStep1', JSON.stringify(data));
  }
  function load(){ try{
    const d = JSON.parse(localStorage.getItem('coStep1')||'{}');
    Object.entries(d).forEach(([n,v])=>{ const el=step1?.querySelector(`[name="${n}"]`); if(el && !el.value) el.value=v||''; });
  }catch{} }
  load(); step1?.addEventListener('input', save);
})();
