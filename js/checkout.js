// ===== checkout.js — v10.11 (hide PayPal/Venmo, colorful Cash App/Crypto, thank-you redirects) =====
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

  // === Close controls ===
  if (close) close.addEventListener('click', (e) => { e.preventDefault(); checkoutClose(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('show')) checkoutClose(); }, true);
  modal.addEventListener('click', (e) => { if (e.target === modal) checkoutClose(); });

  // Delegated step navigation (capture)
  modal.addEventListener('click', function(e){
    const g2 = e.target.closest && e.target.closest('#coToStep2, [data-goto-step="2"]');
    if (g2){ e.preventDefault(); setStep(2); return; }
    const g3 = e.target.closest && e.target.closest('#coToStep3, [data-goto-step="3"]');
    if (g3){ e.preventDefault(); setStep(3); return; }
  }, true);

  // Prevent native submits (Enter) from navigating away
  modal.addEventListener('submit', (e)=>{ if (modal.contains(e.target)) e.preventDefault(); }, true);

  // Enter on Step 1 -> Step 2
  step1 && step1.addEventListener('submit', (e)=>{ e.preventDefault(); setStep(2); }, true);

  // ===== Pricing + totals =====
  const PRICE = 90.00, TAX_RATE = 0.0874, ALT_DISC_RATE = 0.15;
  const qtyInput = $('#coQty');
  const elItems = $('#coItems'), elMerch = $('#coMerch'), elMethod = $('#coMethod');
  const elTax   = $('#coTax'),   elShip  = $('#coShip'),  elTotal  = $('#coTotal');
  let qty = 1;
  let payMethod = 'card'; // card | paypal | venmo | cashapp | crypto

  const fmt = n => '$' + Number(n).toFixed(2);
  function setQty(n){ qty = Math.min(99, Math.max(1, n|0)); if(qtyInput) qtyInput.value = String(qty); updateTotals(); }

  function computeTotals(){
    const merch = qty * PRICE;
    const disc  = (payMethod === 'card') ? 0 : +(merch * ALT_DISC_RATE).toFixed(2);
    const taxable = Math.max(0, merch - disc);
    const tax   = +(taxable * TAX_RATE).toFixed(2);
    const total = +(taxable + tax).toFixed(2);
    return { merch, disc, tax, total, taxable };
  }

  function updateTotals(){
    const { merch, disc, tax, total } = computeTotals();
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

  // ===== Payment method selection (parity with v10.6) =====
  const payButtons = {
    card:   $('#pmCard'),
    paypal: $('#pmPayPal'),
    venmo:  $('#pmVenmo'),
    cashapp:$('#pmCashApp'),
    crypto: $('#pmCrypto')
  };

  // Add styling hooks for colors
  Object.entries(payButtons).forEach(([k, el])=>{ if (el) el.classList.add('pm', `pm--${k}`); });

  // Hide Venmo/PayPal (both JS and CSS safety)
  if (payButtons.paypal) payButtons.paypal.style.display = 'none';
  if (payButtons.venmo)  payButtons.venmo.style.display  = 'none';

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
  if (payButtons.card){ 
    payButtons.card.addEventListener('click', ()=> selectMethod('card'));
    payButtons.card.addEventListener('dblclick', ()=>{ selectMethod('card'); setStep(3); });
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

  // ===== Step switching =====
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
  window.gotoStep2 = function(){ setStep(2); };
  window.gotoStep3 = function(){ setStep(3); };

  function getStep1Val(n){
    return step1?.querySelector(`[name="${n}"]`)?.value?.trim() || '';
  }
  function getCustomerMeta(){
    const full = getStep1Val('name');
    let first = full, last='';
    if (full && full.includes(' ')){ const i=full.lastIndexOf(' '); first=full.slice(0,i); last=full.slice(i+1); }
    return {
      first_name: first || '',
      last_name: last || '',
      email: getStep1Val('email'),
      phone: getStep1Val('phone'),
      address: getStep1Val('address'),
      city: getStep1Val('city'),
      state: getStep1Val('state'),
      zip: getStep1Val('zip'),
      country: 'US'
    };
  }

  // ==== Utility: persistent order number ====
  function userKey(){
    const email = getStep1Val('email') || '';
    let s = 0; const src = email || (navigator.userAgent||'guest');
    for (let i=0;i<src.length;i++) s = (s*31 + src.charCodeAt(i)) >>> 0;
    return s.toString(36).toUpperCase();
  }
  function getOrderId(){
    let id = sessionStorage.getItem('coOrderId');
    if (!id){
      const uk = userKey().slice(0,5);
      id = 'T' + uk + '-' + Date.now().toString(36).toUpperCase().slice(-6);
      sessionStorage.setItem('coOrderId', id);
    }
    return id;
  }
  async function copyToClipboard(s){
    try { await navigator.clipboard?.writeText(s); }
    catch(_) { window.prompt('Copy to clipboard:', s); }
  }

  // ===== Step 3 UI per method =====
  function renderStep3UI(){
    if (!step3) return;
    const totals = computeTotals();
    const amount = totals.total.toFixed(2);
    const totalFormatted = fmt(totals.total);

    modal?.setAttribute('data-alt-mode', (payMethod === 'card') ? '0' : '1');

    if (payMethod === 'card'){
      cardset && (cardset.hidden = false);
      if (altPane){ altPane.hidden = true; altPane.innerHTML = ''; }
      if (submitWrap) submitWrap.style.display = '';
      return;
    }

    cardset && (cardset.hidden = true);
    if (submitWrap) submitWrap.style.display = 'none';

    let title = '', body = '', primary = '', url = '#', help = '', extraHTML = '';
    const isDesktop = window.matchMedia && window.matchMedia('(pointer:fine)').matches && !/android|iphone|ipad|ipod/i.test(navigator.userAgent || '');

    switch (payMethod){
      case 'cashapp': {
        title = 'Pay with Cash App';
        const cashtag = 'selfhacking';
        const orderId = getOrderId();
        const noteLine = 'input your order number in the cashapp payment notes with nothing else';
        const cashUrl = `https://cash.app/$${cashtag}?amount=${encodeURIComponent(amount)}&note=${encodeURIComponent(orderId)}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(cashUrl)}`;

        body  = `Send the exact total to <strong>$${cashtag}</strong>. Use note: <strong>${orderId}</strong>.`;
        primary = 'Open Cash App';
        url = cashUrl;
        help = 'After you send the payment, tap “I Sent the Payment” so we can match it faster.';

        const qrBlock = isDesktop ?
          `<div class="alt-row" style="display:flex;justify-content:center;margin:12px 0;">
             <img id="cashQr" src="${qrUrl}" width="240" height="240" alt="Cash App QR for $${cashtag}">
           </div>` : '';

        const copyRow = `
          <div class="alt-row" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;justify-content:center;align-items:center;text-align:center;">
            <button type="button" class="alt-btn secondary copy-btn" data-copy="$${cashtag}" aria-label="Copy cashtag">$ Copy Cashtag</button>
            <button type="button" class="alt-btn secondary copy-btn" data-copy="${amount}" aria-label="Copy amount">📋 Copy Amount ${amount}</button>
            <button type="button" class="alt-btn secondary copy-btn" data-copy="${orderId}" aria-label="Copy order number">🧾 Copy Order #</button>
          </div>
          <div class="alt-row" style="font-size:12px;opacity:.9;margin-top:4px;text-align:center;"><em>${noteLine}</em></div>`;

        extraHTML = qrBlock + copyRow + `
          <div class="alt-actions" style="margin-top:10px;gap:10px;display:flex;flex-wrap:wrap;justify-content:center;">
            ${isDesktop ? '' : '<button type="button" class="alt-btn" id="altPrimary">Open Cash App</button>'}
            <button type="button" class="alt-btn" id="markPaidBtn">I Sent the Payment</button>
            <button type="button" class="alt-btn secondary" id="altBack">Choose another method</button>
          </div>`;
        break;
      }

      case 'crypto':
        title = 'Pay with Crypto';
        body  = 'You\'ll be redirected to Coinbase Commerce to pay with BTC, ETH, USDC, and more. Your total reflects a 15% method discount.';
        primary = 'Continue to Coinbase'; url = '#';
        help = 'After the network confirms, we\'ll email your receipt and ship your order.'; break;
    }

    // Center both Cash App and Crypto headings
    const h4Style = (payMethod === 'crypto' || payMethod === 'cashapp')
      ? ' style="display:flex;justify-content:center;align-items:center;text-align:center;width:100%;margin:0 auto;"'
      : '';

    const baseHTML = `
      <div class="alt-pane">
        <h4${h4Style}>${title}</h4>
        <div class="alt-row"><strong>Total:</strong> ${totalFormatted}</div>
        <div class="alt-row">${body}</div>
        ${payMethod === 'cashapp' ? '' : `
        <div class="alt-actions">
          <button type="button" class="alt-btn" id="altPrimary">${primary}</button>
          <button type="button" class="alt-btn secondary" id="altBack">Choose another method</button>
        </div>`}
        ${extraHTML}
        <div class="alt-row" style="opacity:.85;font-size:13px;margin-top:8px;">${help}</div>
      </div>`;

    if (altPane){
      altPane.innerHTML = baseHTML;
      altPane.hidden = false;

      const root = altPane.querySelector('.alt-pane');
      if (root){
        root.classList.toggle('crypto', payMethod === 'crypto');
        root.setAttribute('data-method', payMethod);
      }

      const altPrimary = $('#altPrimary');
      const altBack = $('#altBack');

      if (altPrimary){
        altPrimary.addEventListener('click', async ()=>{
          if (payMethod === 'crypto'){
            try {
              altPrimary.disabled = true; altBack && (altBack.disabled = true);
              altPrimary.textContent = 'Creating charge…';

              const customer = getCustomerMeta();
              const body = { qty, email: customer.email || '', total: computeTotals().total,
                meta: { ...customer, sku: 'tirz-vial', free_qty: qty, paid_qty: qty, order_id: getOrderId() } };

              const resp = await fetch('/api/payments/coinbase/create-charge', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
              });
              const d = await resp.json().catch(()=>null);
              if (!resp.ok || !d?.hosted_url) throw new Error(d?.error || `Charge creation failed (HTTP ${resp.status})`);
              if (typeof track === 'function') track('co_submit',{ method:'crypto', qty, total: body.total });
              window.location.href = d.hosted_url;
            } catch (err) {
              alert(err?.message || 'Crypto checkout failed');
              altPrimary.disabled = false; altBack && (altBack.disabled = false);
              altPrimary.textContent = 'Continue to Coinbase';
            }
            return;
          }
          if (url && url !== '#') {
            if (typeof track === 'function') track('co_submit',{ method: payMethod, qty, total: computeTotals().total });
            window.location.href = url;
          }
        });
      }
      if (altBack){ altBack.addEventListener('click', ()=>{ setStep(2); }); }

      // Cash App extras
      if (payMethod === 'cashapp'){
        $$('.copy-btn', altPane).forEach(btn => {
          btn.addEventListener('click', async ()=>{
            const val = btn.getAttribute('data-copy') || '';
            await copyToClipboard(val);
            const orig = btn.textContent; btn.textContent = '✓ Copied'; btn.disabled = true;
            setTimeout(()=>{ btn.textContent = orig; btn.disabled = false; }, 1200);
          });
        });
        const markBtn = $('#markPaidBtn');
        if (markBtn){
          markBtn.addEventListener('click', async ()=>{
            try {
              markBtn.disabled = true;
              const customer = getCustomerMeta();
              const payload = {
                order_id: getOrderId(),
                method: 'cashapp',
                cashtag: '$selfhacking',
                amount: computeTotals().total,
                qty,
                email: customer.email || '',
                meta: customer,
                ts: Date.now()
              };
              const r = await fetch('/api/payments/cashapp/mark-paid', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
              });
              if (!r.ok){
                const err = await r.json().catch(()=>({}));
                throw new Error(err?.error || `HTTP ${r.status}`);
              }
              if (typeof track === 'function') track('co_mark_paid', { method:'cashapp', order_id: payload.order_id, amount: payload.amount });
              // Redirect to thank-you (pending)
              window.location.href = `/thank-you?m=cashapp&status=pending&order=${encodeURIComponent(payload.order_id)}`;
            } catch (e) {
              alert(e?.message || 'Could not mark as paid');
              markBtn.disabled = false;
            }
          });
        }
      }
    }
  }

  // ===== Hosted-field clickability (defensive) =====
  function fixClickBlockers(){
    try {
      const wrappers = step3?.querySelectorAll('label, .row, .co-row, .co-field') || [];
      wrappers.forEach(el => { el.style.pointerEvents = 'none'; });
      ['re-number','re-month','re-year','re-cvv','re-postal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.style.pointerEvents = 'auto'; el.style.position='relative'; el.style.zIndex='10'; }
      });
    } catch (e) {}
  }

  // ===== Submit (card only) — redirect to thank-you =====
  submit && submit.addEventListener('click', async (e)=>{
    e.preventDefault();
    try {
      if (payMethod !== 'card') { return; }
      if (!window.RecurlyUI) throw new Error('Payment form not ready');

      submit.disabled = true;
      submit.textContent = 'Processing…';

      const customer = getCustomerMeta();
      const token = await window.RecurlyUI.tokenize({});

      const resp = await fetch('/api/payments/recurly/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.id || token, customer, items: [{ sku: 'tirz-vial', qty, price: PRICE }] })
      });

      let data=null; try{ data = await resp.json(); } catch(_){}
      if (!resp.ok) {
        const reasons = Array.isArray(data?.errors) ? `\n• ${data.errors.join('\n• ')}` : '';
        throw new Error((data?.error || `Payment failed (HTTP ${resp.status})`) + reasons);
      }

      const oid = getOrderId();
      if (typeof track === 'function') track('co_submit', { method:'card', order_id: oid, total: computeTotals().total });
      window.location.href = `/thank-you?m=card&order=${encodeURIComponent(oid)}`;
    } catch (err) {
      alert(err?.message || 'Payment failed');
    } finally {
      submit.disabled = false;
      submit.textContent = 'Complete Order';
    }
  });

  // ===== Stock countdown =====
  const STOCK_START = 47, STOCK_END = 1, STOCK_MS = 5*60*1000;
  let stockTimer = null, stockT0 = null;
  const STOCK_KEY = 'coStockT0_v1';

  function stockNow(){
    if (!stockT0) return STOCK_START;
    const now = Date.now();
    const t1 = stockT0 + STOCK_MS;
    const clamped = Math.max(0, Math.min(STOCK_MS, t1 - now));
    const ratio = clamped / STOCK_MS;
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

  // Public helpers
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

  window._debugSetStep = setStep;
})();
