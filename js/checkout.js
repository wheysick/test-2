// ===== checkout.js — v10 (reviews sidebar fixed, Step 2 like screenshot, safe mounts) =====
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

  // Totals state
  const PRICE = 90.00;         // price per paid bottle
  const TAX_RATE = 0.0874;     // ~8.74% like your screenshot
  let qty = 1;                 // paid bottles (B1G1 => total bottles = qty*2)

  // Prevent native submits from closing modal
  modal.addEventListener('submit', (e)=>{ if (modal.contains(e.target)) e.preventDefault(); }, true);
  step1 && step1.addEventListener('submit', (e)=>{ e.preventDefault(); setStep(2); }, true);

  // Qty controls
  const qtyInput = $('#coQty');
  function setQty(n){
    qty = Math.min(99, Math.max(1, n|0));
    if (qtyInput) qtyInput.value = String(qty);
    updateTotals();
  }
  $$('.qty-inc').forEach(b => b.addEventListener('click', ()=> setQty(qty+1)));
  $$('.qty-dec').forEach(b => b.addEventListener('click', ()=> setQty(qty-1)));
  qtyInput && qtyInput.addEventListener('input', ()=> {
    const v = parseInt(qtyInput.value.replace(/[^0-9]/g,''),10);
    setQty(isNaN(v)?1:v);
  });

  // Step navigation
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
  back && back.addEventListener('click', (e)=>{ e.preventDefault(); if (!step3.hidden) setStep(2); else setStep(1); });
  close && close.addEventListener('click', (e)=>{ e.preventDefault(); checkoutClose(); });

  // Totals UI elements
  const elItems = $('#coItems'), elMerch = $('#coMerch'), elMethod = $('#coMethod');
  const elTax   = $('#coTax'),  elShip  = $('#coShip'),  elTotal  = $('#coTotal');

  function fmt(n){ return '$' + n.toFixed(2); }
  function updateTotals(){
    const totalBottles = qty*2; // B1G1
    const merch = qty * PRICE;
    const methodDiscount = 0.00;
    const tax = +(merch * TAX_RATE).toFixed(2);
    const total = merch - methodDiscount + tax; // shipping FREE

    if (elItems) elItems.textContent = `${totalBottles} bottles (${qty} paid + ${qty} free)`;
    if (elMerch) elMerch.textContent = fmt(merch);
    if (elMethod) elMethod.textContent = fmt(methodDiscount);
    if (elTax)   elTax.textContent = fmt(tax);
    if (elShip)  elShip.textContent = 'FREE';
    if (elTotal) elTotal.textContent = fmt(total);
  }
  updateTotals();

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

  // Public helpers used by header/CTA
  window.checkoutOpen = function(){
    modal.classList.add('show');
    modal.style.display='grid';
    document.documentElement.setAttribute('data-checkout-open','1');
    document.body.style.overflow='hidden';
    setStep(1);
  };
  window.checkoutClose = function(){
    modal.classList.remove('show');
    modal.style.display='none';
    document.documentElement.removeAttribute('data-checkout-open');
    document.body.style.overflow='';
  };
  window.checkoutBack = function(){ if (!step3.hidden) setStep(2); else setStep(1); };
})();
