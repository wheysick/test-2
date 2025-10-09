===== js/checkout.js (final) =====
// ===== checkout.js — v9.0 (3-step flow, qty + totals, CTA hide, hosted-fields clickable) =====
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
  const qtyEl   = $('#coQty');
  const subtotal= $('#coSubtotal');
  const shipping= $('#coShipping');
  const discount= $('#coDiscount');
  const totalEl = $('#coTotal');

  // ---- price state
  const PRICE = 90.00;
  let qty = Math.max(1, parseInt(qtyEl && qtyEl.value || '1', 10) || 1);
  let discountVal = 0.00;
  const shippingVal = 0.00;

  function fmt(n){ return '$' + n.toFixed(2); }

  function computeTotals(){
    const sub = Math.max(0, qty) * PRICE;
    const tot = Math.max(0, sub - discountVal + shippingVal);
    if (subtotal) subtotal.textContent = fmt(sub);
    if (shipping) shipping.textContent = fmt(shippingVal);
    if (discount) discount.textContent = '-' + fmt(discountVal).slice(1);
    if (totalEl)  totalEl.textContent = fmt(tot);
  }

  // ---- guards (prevent native submits closing modal)
  modal.addEventListener('submit', (e)=>{ if (modal.contains(e.target)) { e.preventDefault(); } }, true);
  step1 && step1.addEventListener('submit', (e)=>{ e.preventDefault(); setStep(2); }, true);

  // ---- qty controls
  function setQty(n){
    qty = Math.min(99, Math.max(1, n));
    if (qtyEl) qtyEl.value = String(qty);
    computeTotals();
  }
  if (qtyEl){
    qtyEl.addEventListener('input', ()=>{
      const v = parseInt(qtyEl.value.replace(/[^0-9]/g,''), 10);
      setQty(isNaN(v) ? 1 : v);
    });
  }
  $$('.qty-inc').forEach(b => b.addEventListener('click', ()=> setQty(qty+1)));
  $$('.qty-dec').forEach(b => b.addEventListener('click', ()=> setQty(qty-1)));

  // ---- step switching
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
  toStep3 && toStep3.addEventListener('click', (e)=>{
    e.preventDefault();
    const method = (document.querySelector('input[name="paymethod"]:checked')||{}).value || 'card';
    if (method !== 'card') { alert('Only card is enabled right now. Choose Card.'); return; }
    setStep(3);
  });
  back && back.addEventListener('click', (e)=>{ e.preventDefault(); if (!step3.hidden) setStep(2); else setStep(1); });
  close && close.addEventListener('click', (e)=>{
    e.preventDefault();
    modal.classList.remove('show'); modal.style.display='none';
    document.documentElement.removeAttribute('data-checkout-open');
    document.body.style.overflow='';
  });

  // ---- hosted field clickability
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

  // ---- submit payment
  submit && submit.addEventListener('click', async (e)=>{
    e.preventDefault();
    try {
      if (!window.RecurlyUI) throw new Error('Payment form not ready');

      submit.disabled = true;
      const orig = submit.textContent;
      submit.textContent = 'Processing…';

      // collect Step 1 data
      const get = (n) => step1.querySelector(`[name="${n}"]`)?.value?.trim() || '';
      const full = get('name') || '';
      let first = full, last = '';
      if (full.includes(' ')){ const i=full.lastIndexOf(' '); first=full.slice(0,i); last=full.slice(i+1); }

      const meta = {
        first_name: first, last_name: last,
        email: get('email'), phone: get('phone'),
        address: get('address'), city: get('city'),
        state: get('state'), zip: get('zip'),
        items: [{ sku: 'tirz-vial', qty, price: PRICE }]
      };

      const token = await window.RecurlyUI.tokenize(meta);
      const resp = await fetch('/api/payments/recurly/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.id || token, customer: meta })
      });
      let data=null; try{ data=await resp.json(); }catch(_){}
      if (!resp.ok){
        const reasons = Array.isArray(data?.errors) ? `\n• ${data.errors.join('\n• ')}` : '';
        throw new Error((data?.error || `Payment failed (HTTP ${resp.status})`) + reasons);
      }

      step3.hidden = true;
      const ok = $('#checkoutSuccess'); if (ok) ok.hidden = false;
    } catch (err){
      alert(err?.message || 'Payment failed');
    } finally {
      submit.disabled = false;
      submit.textContent = 'Complete Order';
    }
  });

  // ---- init
  computeTotals();
})();
