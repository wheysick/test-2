/* ===== recurly-wire.js — dedupe legacy form, mount Elements on #recurly-* ===== */
(function(){
  const $ = (s, ctx=document) => ctx.querySelector(s);
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts||{});

  const payWrap = $('#coPayWrap');
  const submit  = $('#coSubmit');
  const step1   = $('#coStep1');

  function killLegacy(){
    if (!payWrap) return;
    // Remove obvious legacy inputs (plain HTML fields) if present
    const legacyInputs = payWrap.querySelectorAll('input[name="card"], input[name="cardnumber"], input[name="exp"], input[name="month"], input[name="year"], input[name="cvc"], input[name="cczip"]');
    legacyInputs.forEach(inp => {
      const blk = inp.closest('fieldset,.co-field,.form-group,.row') || inp;
      blk.remove();
    });

    // If both #recurly- and #re- containers exist, remove the #re-* to avoid duplicates
    const reStyle = payWrap.querySelector('#re-number, #re-month, #re-year, #re-cvv, #re-postal');
    if (reStyle) {
      const fs = reStyle.closest('fieldset') || reStyle.parentElement;
      if (fs) fs.remove();
    }
  }

  function customerMeta(){
    const get = n => step1 ? (step1.querySelector(`[name='${n}']`)?.value || '').trim() : '';
    const full = get('name');
    let first = full, last = '';
    if (full.includes(' ')){ const ix = full.lastIndexOf(' '); first = full.slice(0,ix); last = full.slice(ix+1); }
    return { first_name: first || '', last_name: last || '', email: get('email'), phone: get('phone') };
  }

  async function onSubmit(ev){
    ev?.preventDefault?.();
    if (!submit) return;
    submit.disabled = true;
    try {
      if (window.RecurlyUI) window.RecurlyUI.mount();
      const token = await window.RecurlyUI.tokenize(customerMeta());

      // Basic purchase payload (server endpoint already expects this)
      const qty  = Number(document.querySelector('#coQty')?.value || 1) || 1;
      const unit = Number(document.body.dataset.price || 90) || 90;
      const res = await fetch('/api/payments/recurly/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token?.id, qty, unit_amount: unit })
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out?.error || out?.message || 'Charge failed');
      document.getElementById('checkoutSuccess')?.removeAttribute('hidden');
      document.getElementById('coStep3')?.setAttribute('hidden','hidden');
    } catch (e) {
      alert(e.message || 'Payment failed');
    } finally {
      submit.disabled = false;
    }
  }

  function boot(){
    killLegacy();
    if (window.RecurlyUI) window.RecurlyUI.mount();
    on(submit, 'click', onSubmit);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
