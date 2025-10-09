// ===== checkout.js — v10.2 (add gotoStep2/gotoStep3 globals) =====
(function(){
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const modal   = $('#checkoutModal');
  if (!modal) return;

  const step1   = $('#coStep1');
  const step2   = $('#coStep2');
  const step3   = $('#coStep3');
  const submit  = $('#coSubmit');
  const close   = $('#checkoutClose');
  const back    = $('#coBackLink') || $('#coBack');
  const toStep2 = $('#coToStep2');
  const toStep3 = $('#coToStep3');

  // Force all .open-checkout clicks to open the modal (capture beats others)
  document.addEventListener('click', function(e){
    const a = e.target.closest && e.target.closest('.open-checkout');
    if (!a) return;
    e.preventDefault();
    checkoutOpen();
  }, true);

  // Prevent native submits (Enter) from closing modal
  modal.addEventListener('submit', (e)=>{ if (modal.contains(e.target)) e.preventDefault(); }, true);
  step1 && step1.addEventListener('submit', (e)=>{ e.preventDefault(); setStep(2); }, true);

  // Step-2 totals (B1G1 math + tax)
  const PRICE = 90.00, TAX_RATE = 0.0874;
  const qtyInput = $('#coQty');
  const elItems = $('#coItems'), elMerch = $('#coMerch'), elMethod = $('#coMethod');
  const elTax   = $('#coTax'),   elShip  = $('#coShip'),  elTotal  = $('#coTotal');
  let qty = 1;
  const fmt = n => '$' + n.toFixed(2);
  function setQty(n){ qty = Math.min(99, Math.max(1, n|0)); if(qtyInput) qtyInput.value = String(qty); updateTotals(); }
  function updateTotals(){
    const merch = qty * PRICE;
    const tax   = +(merch * TAX_RATE).toFixed(2);
    const total = merch + tax;
    elItems && (elItems.textContent = `${qty*2} bottles (${qty} paid + ${qty} free)`);
    elMerch && (elMerch.textContent = fmt(merch));
    elMethod && (elMethod.textContent = fmt(0));
    elTax   && (elTax.textContent   = fmt(tax));
    elShip  && (elShip.textContent  = 'FREE');
    elTotal && (elTotal.textContent = fmt(total));
  }
  qtyInput && qtyInput.addEventListener('input', ()=>{ const v=parseInt(qtyInput.value.replace(/[^0-9]/g,''),10); setQty(isNaN(v)?1:v); });
  $$('.qty-inc').forEach(b => b.addEventListener('click', ()=> setQty(qty+1)));
  $$('.qty-dec').forEach(b => b.addEventListener('click', ()=> setQty(qty-1)));
  updateTotals();

  // Step switching
  function setStep(n){
    [step1, step2, step3].forEach((el,i)=>{
      if (!el) return;
      const on = (i===n-1);
      el.hidden = !on;
      el.setAttribute('aria-hidden', String(!on));
    });
    if (n===3){
      if (window.RecurlyUI) window.RecurlyUI.mount();
      fixClickBlockers();
    } else {
      if (window.RecurlyUI) window.RecurlyUI.unmount();
    }
  }
  toStep2 && toStep2.addEventListener('click', (e)=>{ e.preventDefault(); setStep(2); });
  toStep3 && toStep3.addEventListener('click', (e)=>{ e.preventDefault(); setStep(3); });
  back   && back  .addEventListener('click', (e)=>{ e.preventDefault(); if (!step3.hidden) setStep(2); else setStep(1); });
  close  && close .addEventListener('click', (e)=>{ e.preventDefault(); checkoutClose(); });

  // Hosted-field clickability
  function fixClickBlockers(){
    try {
      const wrappers = step3.querySelectorAll('label, .row, .co-row, .co-field');
      wrappers.forEach(el => { el.style.pointerEvents = 'none'; });
      ['re-number','re-month','re-year','re-cvv','re-postal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.style.pointerEvents = 'auto'; el.style.position='relative'; el.style.zIndex='100003'; }
      });
    } catch (e) {}
  }

  // Submit payment
  submit && submit.addEventListener('click', async (e)=>{
    e.preventDefault();
    try {
      if (!window.RecurlyUI) throw new Error('Payment form not ready');

      submit.disabled = true;
      const orig = submit.textContent;
      submit.textContent = 'Processing…';

      const get = (n) => step1.querySelector(`[name="${n}"]`)?.value?.trim() || '';
      const full = get('name') || '';
      let first = full, last = '';
      if (full.includes(' ')){ const i=full.lastIndexOf(' '); first=full.slice(0,i); last=full.slice(i+1); }

// ...inside the coSubmit click handler (right before tokenize):

// meta is your existing object built from Step 1
const meta = {
  first_name: first, last_name: last,
  email: get('email'), phone: get('phone'),
  address: get('address'), city: get('city'),
  state: get('state'), zip: get('zip'),
  country: 'US',
  items: [{ sku: 'tirz-vial', qty, price: PRICE }]
};

// Map to Recurly's expected tokenization keys
const billingForToken = {
  first_name:  meta.first_name,
  last_name:   meta.last_name,
  email:       meta.email,
  phone:       meta.phone,
  address1:    meta.address || 'N/A',   // <- Recurly expects address1
  city:        meta.city    || 'N/A',
  state:       meta.state   || 'NA',
  postal_code: meta.zip     || '00000', // <- Recurly expects postal_code
  country:     meta.country || 'US'
};

// 1) Tokenize with proper keys
const token = await window.RecurlyUI.tokenize(billingForToken);

// 2) Proceed to server purchase with your existing `meta`
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

  // Public helpers used by inline onclick in your HTML
  window.checkoutOpen  = function(){ modal.classList.add('show'); modal.style.display='grid'; document.documentElement.setAttribute('data-checkout-open','1'); document.body.style.overflow='hidden'; setStep(1); };
  window.checkoutClose = function(){ modal.classList.remove('show'); modal.style.display='none'; document.documentElement.removeAttribute('data-checkout-open'); document.body.style.overflow=''; };
  window.checkoutBack  = function(){ if (!step3.hidden) setStep(2); else setStep(1); };
  window.gotoStep2     = function(){ setStep(2); };
  window.gotoStep3     = function(){ setStep(3); };
})();
