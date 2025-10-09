// ===== checkout.js — 3-step modal + Recurly tokenization =====
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

  // Basic open/close helpers (your inline helpers call these too)
  function open(){ modal.classList.add('show'); modal.style.display='grid'; }
  function hide(){ modal.classList.remove('show'); modal.style.display='none'; }

  // Go to Step 3 and mount Recurly fields
  function showStep3(){
    step1.hidden = true;
    step3.hidden = false;
    if (window.RecurlyUI) window.RecurlyUI.mount();
  }

  // Back to Step 1 and unmount Recurly
  function showStep1(){
    step3.hidden = true;
    step1.hidden = false;
    if (window.RecurlyUI) window.RecurlyUI.unmount();
  }

  // Wire UI
  close?.addEventListener('click', (e)=>{ e.preventDefault(); hide(); });
  back?.addEventListener('click',  (e)=>{ e.preventDefault(); showStep1(); });
  toStep3?.addEventListener('click',(e)=>{ e.preventDefault(); showStep3(); });

  // Quantity buttons (optional; adjust to your markup)
  $$('.qty-inc').forEach(btn => btn.addEventListener('click', () => {
    const qty = $('#coQty'); if (!qty) return;
    qty.value = Math.min(99, Math.max(1, (+qty.value||1) + 1));
  }));
  $$('.qty-dec').forEach(btn => btn.addEventListener('click', () => {
    const qty = $('#coQty'); if (!qty) return;
    qty.value = Math.min(99, Math.max(1, (+qty.value||1) - 1));
  }));

  // Submit: tokenize + purchase
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
        // simple line items
        items: [{ sku: 'tirz-vial', qty: 1, price: 90 }]
      };

      // 1) Tokenize with Recurly
      const token = await window.RecurlyUI.tokenize(meta);

      // 2) Purchase via your Vercel function
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

  // Expose helpers for inline anchors
  window.checkoutOpen  = open;
  window.checkoutClose = hide;
  window.checkoutBack  = showStep1;
  window.gotoStep3     = showStep3;
})();
