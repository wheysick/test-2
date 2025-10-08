
/* ===== checkout3.js v1.2 — Bulletproof CTA open on mobile ===== */
(function(){
  const modal = document.getElementById('checkoutModal');
  const closeBtn = document.getElementById('checkoutClose');

  const step1 = document.getElementById('coStep1');
  const step2 = document.getElementById('coStep2');
  const step3 = document.getElementById('coStep3');
  const steps = document.querySelectorAll('.co-step');

  const toStep3Btn = document.getElementById('coToStep3');
  const back1 = document.getElementById('coBackTo1');
  const back2 = document.getElementById('coBackTo2');

  const payWrap = document.getElementById('coPayWrap');
  const tos = document.getElementById('coTos');
  const submitBtn = document.getElementById('coSubmit');

  let chosenMethod = null;
  const state = { name:'', email:'', address:'' };

  function setActive(step) {
    steps.forEach(s => s.classList.toggle('is-active', s.dataset.step == step));
  }
  function show(el, yes=true){ if(!el) return; el.hidden = !yes; el.setAttribute('aria-hidden', String(!yes)); }
  function openModal(ev){
    if (ev) { ev.preventDefault(); ev.stopPropagation(); }
    if (!modal) return;
    modal.classList.add('show');
    document.body.classList.add('modal-open');
    document.body.style.overflow='hidden';
    setActive(1); show(step1, true); show(step2, false); show(step3, false);
    step1.querySelector('input[name="name"]')?.focus();
  }
  function closeModal(){
    modal.classList.remove('show');
    document.body.classList.remove('modal-open');
    document.body.style.overflow='';
  }

  function isCTA(el){
    return !!el && (el.matches('[data-cta]')
      || el.matches('a[href="#offer"]')
      || el.matches('#floatingCta')
      || el.matches('.floating-cta'));
  }

  ['click','touchend','pointerup'].forEach(evt => {
    document.addEventListener(evt, (e)=>{
      const t = e.target.closest('[data-cta], a[href="#offer"], #floatingCta, .floating-cta');
      if (isCTA(t)) openModal(e);
    }, { capture: true, passive: false });
  });

  function directBind(){
    document.querySelectorAll('[data-cta], a[href="#offer"], #floatingCta, .floating-cta').forEach(el => {
      if (el.__coBound) return;
      el.addEventListener('click', openModal, { passive: false });
      el.addEventListener('touchend', openModal, { passive: false });
      el.__coBound = true;
    });
  }
  directBind();
  let tries = 0; const iv = setInterval(()=>{ tries++; directBind(); if (tries > 4) clearInterval(iv); }, 500);

  closeBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e)=>{ if(e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape' && modal.classList.contains('show')) closeModal(); });

  step1?.addEventListener('submit', (e)=>{
    e.preventDefault();
    const name = step1.querySelector('[name="name"]');
    const email = step1.querySelector('[name="email"]');
    const address = step1.querySelector('[name="address"]');
    let ok = true;
    [name, email, address].forEach(inp => {
      if(!inp.value.trim()) { ok=false; inp.style.borderColor='#ff2a6d'; }
      else inp.style.borderColor='';
    });
    if (!ok) return;
    setActive(2); show(step1,false); show(step2,true); show(step3,false);
    const defaultBtn = step2.querySelector('.co-method[data-method="card"]');
    defaultBtn?.click();
  });

  step2?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.co-method');
    if (!btn) return;
    step2.querySelectorAll('.co-method').forEach(b=> b.removeAttribute('aria-selected'));
    btn.setAttribute('aria-selected','true');
    chosenMethod = btn.dataset.method;
    document.getElementById('coToStep3').disabled = false;
  });

  toStep3Btn?.addEventListener('click', (e)=>{
    e.preventDefault();
    if (!chosenMethod) return;
    renderPay(chosenMethod);
    setActive(3); show(step2,false); show(step3,true);
    tos.focus();
  });

  back1?.addEventListener('click', ()=>{ setActive(1); show(step1,true); show(step2,false); show(step3,false); });
  back2?.addEventListener('click', ()=>{ setActive(2); show(step1,false); show(step2,true); show(step3,false); });

  function renderPay(method){
    const blocks = {
      card: `
        <fieldset class="cardset">
          <legend>Card details</legend>
          <label>Card number
            <input type="text" name="card" inputmode="numeric" placeholder="4242 4242 4242 4242" required />
          </label>
          <div class="co-row">
            <label>Expiry
              <input type="text" name="exp" inputmode="numeric" placeholder="MM/YY" required />
            </label>
            <label>CVC
              <input type="text" name="cvc" inputmode="numeric" maxlength="4" required />
            </label>
            <label>ZIP
              <input type="text" name="cczip" inputmode="numeric" maxlength="5" required />
            </label>
          </div>
        </fieldset>`,
      venmo: methodBlock('Venmo', 'Scan a QR code or send to @YourHandle (10% off applied at confirmation).'),
      cashapp: methodBlock('Cash App', 'Send to $YourCashtag (10% off applied at confirmation).'),
      paypal: methodBlock('PayPal', 'You’ll be redirected to PayPal (10% off applied at confirmation).'),
      crypto: methodBlock('Crypto', 'Pay with BTC/ETH/USDC (15% off applied). We’ll show an address and real‑time total.')
    };
    payWrap.innerHTML = blocks[method] || blocks.card;
  }
  function methodBlock(name, copy){
    return `
      <div class="altpay">
        <h4 style="margin:.2rem 0 .4rem; font-size:1.05rem;">${name} checkout</h4>
        <p style="color:#cfcfd3; line-height:1.6;">${copy}</p>
      </div>`;
  }

  submitBtn?.addEventListener('click', (e)=>{
    e.preventDefault();
    if (!tos.checked) { tos.focus(); return; }
    step3.hidden = true;
    document.getElementById('checkoutSuccess').hidden = false;
  });

  document.getElementById('successClose')?.addEventListener('click', (e)=>{ e.preventDefault(); closeModal(); });
})();
