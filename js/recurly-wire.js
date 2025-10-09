
/* ===== recurly-wire.js v23 — non-invasive bridge
   - Replaces Step 3 legacy inputs with Recurly Elements markup
   - Mounts/unmounts Elements on step enter/leave
   - Handles submit: tokenizes and posts to /api/payments/recurly/charge
*/
(function(){
  const $ = (s, ctx=document) => ctx.querySelector(s);
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts || {});

  const step3   = $('#coStep3');
  const payWrap = $('#coPayWrap');
  const submit  = $('#coSubmit');
  const back2   = $('#coBackTo2');
  const close   = $('#checkoutClose');

  if (!step3) return;

  const recurlyMarkup = `
    <fieldset class="cardset">
      <legend>Card details</legend>
      <label>Card number <div id="re-number"></div></label>
      <div class="co-row">
        <label>Expiry <div id="re-month"></div></label>
        <label>Year   <div id="re-year"></div></label>
        <label>CVC    <div id="re-cvv"></div></label>
      </div>
      <label>ZIP <div id="re-postal"></div></label>
    </fieldset>`;

  function ensureRecurlyMarkup(){
    if (!payWrap) return;
    // Remove any legacy input-based card fieldset
    const legacy = payWrap.querySelector('input[name="card"], input[name="exp"], input[name="cvc"], input[name="cczip"]');
    if (legacy) {
      const fs = legacy.closest('fieldset');
      if (fs) fs.remove();
    }
    // Inject our markup once
    if (!payWrap.querySelector('#re-number')) {
      payWrap.insertAdjacentHTML('afterbegin', recurlyMarkup);
    }
  }

  function mountIfNeeded(){
    if (!step3 || step3.hidden) return;
    ensureRecurlyMarkup();
    if (window.__recurlyMount) window.__recurlyMount();
  }
  function unmountIfNeeded(){
    if (window.__recurlyUnmount) window.__recurlyUnmount();
  }

  // Observe visibility changes of Step 3
  const obs = new MutationObserver(() => {
    if (!step3.hidden) mountIfNeeded();
  });
  obs.observe(step3, { attributes:true, attributeFilter:['hidden', 'aria-hidden', 'class'] });

  // Initial check in case we're already on Step 3
  if (!step3.hidden) mountIfNeeded();

  on(back2, 'click', unmountIfNeeded);
  on(close, 'click', unmountIfNeeded);

  on(submit, 'click', async (e) => {
    if (!window.__recurlyTokenize) return; // not our flow
    e.preventDefault();
    submit.disabled = true;
    try {
      const token = await window.__recurlyTokenize({});
      const email = $('#coStep1 [name="email"]')?.value || '';
      const totalNode = $('#coTotal');
      const total = totalNode ? Number(String(totalNode.textContent || '0').replace(/[^0-9.]/g,'')) : 90;
      const qtyNode = $('#coQty');
      const qty = qtyNode ? Number(qtyNode.value || '1') : 1;

      const res = await fetch('/api/payments/recurly/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, order: { total, qty, customer: { email } } })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Charge failed');

      // Success: trigger your success UI
      const success = $('#checkoutSuccess');
      if (success) {
        step3.hidden = true;
        success.hidden = false;
      } else {
        alert('Payment captured: ' + (data.id || 'OK'));
      }
      unmountIfNeeded();
    } catch (err) {
      alert(err.message || 'Payment failed');
    } finally {
      submit.disabled = false;
    }
  });
})();

// Before injecting any card markup:
const legacy = document.querySelector('#coPayWrap input[name="card"], #coPayWrap input[name="exp"], #coPayWrap input[name="cvc"], #coPayWrap input[name="cczip"]');
if (legacy) {
  const fs = legacy.closest('fieldset');
  if (fs) fs.remove();
}
