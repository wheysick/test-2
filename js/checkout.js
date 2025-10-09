// ===== checkout.js — v7.3 (fix: prevent Step 1 submit from closing modal) =====
(function(){
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const modal   = $('#checkoutModal');
  const step1   = $('#coStep1');
  const step3   = $('#coStep3');
  const submit  = $('#coSubmit');
  const close   = $('#checkoutClose');
  const back    = $('#coBackLink');
  const toStep3 = $('#coToStep3');

  if (!modal) return;

  // ---- modal show/hide
  function open(){ modal.classList.add('show'); modal.style.display='grid'; }
  function hide(){ modal.classList.remove('show'); modal.style.display='none'; }

  // ---- step switching
  function showStep3(){
    if (step1) step1.hidden = true;
    if (step3) step3.hidden = false;
    if (window.RecurlyUI) window.RecurlyUI.mount();
  }
  function showStep1(){
    if (step3) step3.hidden = true;
    if (step1) step1.hidden = false;
    if (window.RecurlyUI) window.RecurlyUI.unmount();
  }

  // 🔒 Global guard: prevent ANY <form> inside the checkout from navigating
  modal.addEventListener('submit', (e)=>{ e.preventDefault(); });

  // ✅ Specific: when Step 1 is submitted (Enter key or a submit button), go to Step 3
  step1?.addEventListener('submit', (e)=>{ e.preventDefault(); showStep3(); });

  // Also wire the explicit “Continue” button/link
  toStep3?.addEventListener('click', (e)=>{ e.preventDefault(); showStep3(); });

  // Basic controls
  close?.addEventListener('click', (e)=>{ e.preventDefault(); hide(); });
  back?.addEventListener('click',  (e)=>{ e.preventDefault(); showStep1(); });

  // (Optional) quantity buttons if present
  $$('.qty-inc').forEach(btn => btn.addEventListener('click', () => {
    const qty = $('#coQty'); if (!qty) return;
    qty.value = Math.min(99, Math.max(1, (+qty.value||1) + 1));
  }));
  $$('.qty-dec').forEach(btn => btn.addEventListener('click', () => {
    const qty = $('#coQty'); if (!qty) return;
    qty.value = Math.min(99, Math.max(1, (+qty.value||1) - 1));
  }));

  // ---- Submit payment
  submit?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!window.RecurlyUI){ alert('Payment form not ready'); return; }

    submit.disabled = true;
    const original = submit.textContent;
    submit.textContent = 'Processing…';

    try {
      // Collect customer/shipping from Step 1
      const get = (n) => step1.querySelector(`[name="${n}"]`)?.value?.trim() || '';
      const full = get('name') || '';
      let first = full, last = '';
      if (full.includes(' ')){ const i = full.lastIndexOf(' '); first = full.slice(0,i); last = full.slice(i+1); }

      const meta = {
        first_name: first,
        last_name:  last,
        email:      get('email'),
        phone:      get('phone'),
        address:    get('address'),
        city:       get('city'),
        state:      get('state'),
        zip:        get('zip'),
        items: [{ sku: 'tirz-vial', qty: 1, price: 90 }]
      };

      // 1) Tokenize with Recurly
      const token = await window.RecurlyUI.tokenize(meta);

      // 2) Purchase via backend (Vercel function in your repo)
      const resp = await fetch('/api/payments/recurly/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.id || token, customer: meta })
      });

      const data = await resp.json();
      if (!resp.ok) {
        const reasons = Array.isArray(data?.errors) ? `\n\n${data.errors.join('\n')}` : '';
        throw new Error((data && data.error) ? `${data.error}${reasons}` : 'Payment failed.');
      }

      // Success UI
      step3.hidden = true;
      $('#checkoutSuccess').hidden = false;
    } catch (err) {
      alert(err?.message || 'Payment failed');
    } finally {
      submit.disabled = false;
      submit.textContent = original;
    }
  });

  // Expose helpers for any inline anchors you have
  window.checkoutOpen  = open;
  window.checkoutClose = hide;
  window.checkoutBack  = showStep1;
  window.gotoStep3     = showStep3;
})();
