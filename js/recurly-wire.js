/* ===== recurly-wire.js — singleton mount, live de-dupe, submits with token ===== */
(function(){
  const $  = (s, ctx=document) => ctx.querySelector(s);
  const $$ = (s, ctx=document) => Array.from(ctx.querySelectorAll(s));

  let mounted = false;

  function haveRecurlyContainers(){
    return $('#recurly-number') && $('#recurly-month') && $('#recurly-year') && $('#recurly-cvv') && $('#recurly-postal');
  }

  function nukeLegacyAndDuplicates(){
    const wrap = $('#coPayWrap'); if (!wrap) return;

    // Remove any plain/legacy inputs (entire block if possible)
    wrap.querySelectorAll('input[name="card"], input[name="cardnumber"], input[name="exp"], input[name="month"], input[name="year"], input[name="exp-month"], input[name="exp-year"], input[name="cvc"], input[name="cczip"]').forEach(inp => {
      const blk = inp.closest('fieldset,.co-field,.form-group,.row') || inp;
      blk.remove();
    });

    // If any #re-* containers exist, remove that set to avoid two stacks
    wrap.querySelectorAll('#re-number, #re-month, #re-year, #re-cvv, #re-postal').forEach(el => {
      const blk = el.closest('fieldset') || el.parentElement; if (blk) blk.remove(); else el.remove();
    });

    // If more than one #recurly-number exists, keep the last one (newest)
    const allNums = $$('#coPayWrap #recurly-number');
    if (allNums.length > 1){
      for (let i = 0; i < allNums.length - 1; i++){
        const fs = allNums[i].closest('fieldset'); if (fs) fs.remove(); else allNums[i].remove();
      }
    }
  }

  function ensureMounted(){
    if (!window.recurly) return;
    if (!haveRecurlyContainers()) return;

    // Only mount once per lifecycle
    if (mounted) return;
    nukeLegacyAndDuplicates();

    if (!window.RecurlyUI){
      // Minimal singleton helper
      window.RecurlyUI = (function(){
        let elements = null; let fields = {};
        function mount(){
          if (elements) return elements;
          elements = window.recurly.Elements();
          const style = { fontSize:'16px', color:'#E9ECF2', placeholder:{ color:'rgba(234,236,239,.55)' } };
          fields.number = elements.CardNumberElement({ style });
          fields.month  = elements.CardMonthElement({ style });
          fields.year   = elements.CardYearElement({ style });
          fields.cvv    = elements.CardCvvElement({ style });
          fields.postal = elements.CardPostalCodeElement({ style });

          fields.number.attach('#recurly-number');
          fields.month.attach('#recurly-month');
          fields.year.attach('#recurly-year');
          fields.cvv.attach('#recurly-cvv');
          fields.postal.attach('#recurly-postal');
          return elements;
        }
        function tokenize(meta){
          return new Promise((resolve, reject)=>{
            if (!elements) mount();
            window.recurly.token(elements, meta || {}, (err, token)=>{
              if (err){
                const details = err.fields ? Object.entries(err.fields).map(([k,v]) => `${k}: ${Array.isArray(v)?v.join(', '):v}`).join('; ') : '';
                if (details) err.message = `${err.message} — ${details}`;
                reject(err);
              } else resolve(token);
            });
          });
        }
        return { mount, tokenize };
      })();
    }

    window.RecurlyUI.mount();
    mounted = true;
  }

  // Observe changes inside the modal; dedupe+mount when Step 3 injects markup
  const modal = document.getElementById('checkoutModal') || document.documentElement;
  const obs = new MutationObserver(() => {
    mounted = false; // allow re-mount if step rebuilt
    ensureMounted();
  });
  obs.observe(modal, { subtree:true, childList:true });

  // Run on ready and on load
  document.addEventListener('DOMContentLoaded', ensureMounted);
  window.addEventListener('load', ensureMounted);

  // Hook the submit button (id = coSubmit)
  document.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('#coSubmit');
    if (!btn) return;
    ev.preventDefault();
    const step1 = document.getElementById('coStep1');
    const get = n => step1 ? (step1.querySelector(`[name='${n}']`)?.value || '').trim() : '';
    const meta = (()=>{ const full=get('name'); const ix=full.lastIndexOf(' '); return { first_name: ix>0? full.slice(0,ix):full, last_name: ix>0? full.slice(ix+1):'', email:get('email'), phone:get('phone') }; })();
    try {
      btn.disabled = true;
      ensureMounted();
      const token = await window.RecurlyUI.tokenize(meta);
      const qty  = Number(document.querySelector('#coQty')?.value || 1) || 1;
      const unit = Number(document.body.dataset.price || 90) || 90;
      const res = await fetch('/api/payments/recurly/charge', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ token: token?.id, qty, unit_amount: unit }) });
      const out = await res.json();
      if (!res.ok) throw new Error(out?.error || out?.message || 'Charge failed');
      document.getElementById('checkoutSuccess')?.removeAttribute('hidden');
      document.getElementById('coStep3')?.setAttribute('hidden','hidden');
    } catch (e) {
      alert(e.message || 'Payment failed');
    } finally { btn.disabled = false; }
  });
})();
