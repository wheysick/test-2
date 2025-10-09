/* ===== checkout3.js — v6.6 patch =====
   - Back link at top-left
   - Render payment UI once; prevent duplicates
   - Recurly Hosted Fields wait-for-script + init
   - Deterministic stock counter (47→1 in ~5min) shared across steps
*/
(function(){
  "use strict";

  const modal  = document.getElementById('checkoutModal');
  if (!modal) return;

  const step1  = document.getElementById('coStep1');
  const step2  = document.getElementById('coStep2');
  const step3  = document.getElementById('coStep3');
  const toStep3= document.getElementById('coToStep3');
  const payWrap= document.getElementById('coPayWrap');
  const submit = document.getElementById('coSubmit');
  const closeX = document.getElementById('checkoutClose');
  const methodErr = document.getElementById('coMethodError');

  // Insert Back (top-left inside card)
  let backLink = document.getElementById('coBackLink');
  if (!backLink){
    backLink = document.createElement('button');
    backLink.id = 'coBackLink';
    backLink.className = 'co-backlink';
    backLink.type = 'button';
    backLink.textContent = '← Back';
    modal.querySelector('.checkout-card')?.insertAdjacentElement('afterbegin', backLink);
  }

  const fmt = (n)=>`$${n.toFixed(2)}`;
  const show = (el)=>{ if(el){ el.hidden=false; el.setAttribute('aria-hidden','false'); } };
  const hide = (el)=>{ if(el){ el.hidden=true;  el.setAttribute('aria-hidden','true'); } };

  // Pricing
  const MSRP=90, DISPLAY=45, SALE=90, TAX=0.0875, SHIPPING=0;
  let qty=1, method=null, discount=0;

  function totals(){
    const free=qty, merch=qty*SALE, disc=merch*(discount/100);
    const taxable=Math.max(0, merch-disc), tax=taxable*TAX, total=taxable+tax+SHIPPING;
    const set=(id,v)=>{ const n=document.getElementById(id); if(n) n.textContent=v; };
    set('coItemsLine', `${qty+free} bottles (${qty} paid + ${free} free)`);
    set('coMerch', fmt(merch));
    set('coDisc', disc>0?`-${fmt(disc)}`:'$0.00');
    set('coTax', fmt(tax));
    set('coTotal', fmt(total));
    const ship = step2?.querySelector('.co-free-ship'); if (ship) ship.textContent = SHIPPING===0 ? 'FREE' : fmt(SHIPPING);
    const q = document.getElementById('coQty'); if (q) q.value = String(qty);
  }

  function setStep(n){
    const s1=n===1, s2=n===2, s3=n===3;
    if (s1){ show(step1); hide(step2); hide(step3); backLink.style.display='none'; }
    if (s2){ hide(step1); show(step2); hide(step3); backLink.style.display='inline-flex'; stock.start(); }
    if (s3){ hide(step1); hide(step2); show(step3); backLink.style.display='inline-flex'; stock.start(); }
  }

  /* ---------- Open / close ---------- */
  const CTA_SEL = ".floating-cta,[data-cta],[data-open-checkout],.open-checkout,.cta,a[href='#offer'],a[href*='#offer'],a[href*='#checkout'],.masthead-cta";
  let openGuard=0;
  function openModal(e){
    const now = Date.now(); if (now-openGuard<250) return; openGuard=now;
    e?.preventDefault?.(); e?.stopPropagation?.();
    modal.classList.add('show','co-fullscreen');
    document.documentElement.setAttribute('data-checkout-open','1');
    document.body.style.overflow='hidden';
    qty=1; method=null; discount=0; totals(); setStep(1);
    if (methodErr) hide(methodErr);
    stock.reset(); stock.start();
  }
  function closeModal(e){
    e?.preventDefault?.(); e?.stopPropagation?.();
    modal.classList.remove('show','co-fullscreen');
    document.documentElement.removeAttribute('data-checkout-open');
    document.body.style.overflow='';
  }
  window.checkoutOpen=openModal; window.checkoutClose=closeModal;

  function bindCTAs(){
    document.querySelectorAll(CTA_SEL).forEach(el=>{
      if (el.__bound) return;
      const h=(ev)=>{ ev.preventDefault(); ev.stopPropagation(); openModal(ev); };
      el.addEventListener('click',h,{capture:true});
      el.addEventListener('pointerup',h,{capture:true});
      el.addEventListener('touchend',h,{capture:true,passive:false});
      el.__bound=true;
    });
  }
  bindCTAs(); new MutationObserver(bindCTAs).observe(document.documentElement,{subtree:true,childList:true,attributes:true});

  backLink.addEventListener('click', (e)=>{
    e.preventDefault();
    if (!step2.hidden) { setStep(1); return; }
    if (!step3.hidden) { setStep(2); return; }
  });
  closeX?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e)=>{ if (e.target===modal) closeModal(e); });
  document.addEventListener('keydown', (e)=>{ if (e.key==='Escape'&&modal.classList.contains('show')) closeModal(e); });

  // Step 1
  step1?.addEventListener('submit',(e)=>{
    e.preventDefault();
    const req=['name','email','address'].map(n=>step1.querySelector(`[name='${n}']`));
    const ok=req.every(i=>i && i.value.trim());
    req.forEach(i=>i&&(i.style.borderColor=i.value.trim()?'':'#ff5a6e'));
    if(!ok) return; setStep(2); totals();
  });

  // Step 2
  let lastTapTime=0, lastMethod=null;
  step2?.addEventListener('click',(e)=>{
    if(e.target.closest('.qty-inc')){ qty=Math.min(99,qty+1); totals(); return; }
    if(e.target.closest('.qty-dec')){ qty=Math.max(1, qty-1); totals(); return; }
    const strip = step2.querySelector('.co-xpay-strip');
    if(e.target.closest('.xpay-nav.prev')){ strip?.scrollBy({left:-240,behavior:'smooth'}); return; }
    if(e.target.closest('.xpay-nav.next')){ strip?.scrollBy({left: 240,behavior:'smooth'}); return; }
    const btn = e.target.closest('.co-xpay, .co-xpay-primary'); if(!btn) return;
    step2.querySelectorAll('.co-xpay,.co-xpay-primary').forEach(b=>b.removeAttribute('aria-selected'));
    btn.setAttribute('aria-selected','true');
    method = btn.dataset.method || 'card';
    discount = parseFloat(btn.dataset.discount || '0') || 0;
    totals();
    if (methodErr) hide(methodErr);
    const now=Date.now();
    if (lastMethod===method && (now-lastTapTime)<350){ renderPay(method); setStep(3); return; }
    lastMethod=method; lastTapTime=now;
  });
  step2?.addEventListener('input',(e)=>{
    if (e.target.id!=='coQty') return;
    const v=e.target.value.replace(/[^0-9]/g,'');
    qty = Math.max(1, Math.min(99, parseInt(v||'1',10)));
    e.target.value = String(qty); totals();
  });
  toStep3?.addEventListener('click',(e)=>{
    e.preventDefault();
    if(!method){ methodErr && (methodErr.textContent='Must select payment method', show(methodErr)); return; }
    renderPay(method); setStep(3);
  });

  // Step 3 renderer — render ONCE and init Recurly when ready
  let currentPayRendered = null;
  function renderPay(m){
    m = m || 'card';
    if (currentPayRendered === m && payWrap.children.length) return;
    currentPayRendered = m;

    const wallets = `
      <div class="co-or">OR</div>
      <div class="co-alt-wallets">
        <button class="co-wallet apple" type="button" aria-label="Apple Pay"><img src="assets/applepay.svg" width="24" height="24" alt=""/><span>Apple&nbsp;Pay</span></button>
        <button class="co-wallet gpay"  type="button" aria-label="Google Pay"><img src="assets/gpay.svg" width="24" height="24" alt=""/><span>Google&nbsp;Pay</span></button>
      </div>`;

    const recurlyCard = `
      <form id="recurlyForm" onsubmit="return false">
        <fieldset class="cardset">
          <legend>Card details</legend>
          <label>Card number
            <div class="recurly-hosted-field" data-recurly="number"></div>
          </label>
          <div class="co-row" style="margin-top:10px">
            <label>Expiry <div class="recurly-hosted-field" data-recurly="month"></div></label>
            <label>Year   <div class="recurly-hosted-field" data-recurly="year"></div></label>
            <label>CVC    <div class="recurly-hosted-field" data-recurly="cvv"></div></label>
          </div>
          <label style="margin-top:10px">ZIP
            <input id="coPostal" inputmode="numeric" maxlength="10" placeholder="Zip / Postal">
          </label>
        </fieldset>
      </form>`;

    // clear then inject once
    while (payWrap.firstChild) payWrap.removeChild(payWrap.firstChild);

    if (m === 'card') {
      payWrap.insertAdjacentHTML('beforeend', recurlyCard + wallets);
      whenRecurlyReady(initRecurlyHostedFields);
    } else if (m === 'venmo') {
      payWrap.insertAdjacentHTML('beforeend', `<div class="altpay" style="text-align:center"><h4>Venmo</h4><p>Send to @YourHandle — 15% off applied</p></div>`);
    } else if (m === 'cashapp') {
      payWrap.insertAdjacentHTML('beforeend', `<div class="altpay" style="text-align:center"><h4>Cash App</h4><p>Send to $YourCashtag — 15% off applied</p></div>`);
    } else if (m === 'paypal') {
      payWrap.insertAdjacentHTML('beforeend', `<div class="altpay" style="text-align:center"><h4>PayPal</h4><p>Redirect to PayPal — 15% off applied</p></div>`);
    } else if (m === 'crypto') {
      payWrap.insertAdjacentHTML('beforeend', `<div class="altpay" style="text-align:center"><h4>Crypto</h4><p>BTC/ETH/USDC — 15% off applied; address next</p></div>`);
    } else {
      payWrap.insertAdjacentHTML('beforeend', recurlyCard + wallets);
      whenRecurlyReady(initRecurlyHostedFields);
    }
  }

  function whenRecurlyReady(cb){
    if (window.recurly && typeof window.recurly.configure === 'function'){ cb(); return; }
    let tries=0; const id=setInterval(()=>{
      if (window.recurly && typeof window.recurly.configure === 'function'){ clearInterval(id); cb(); }
      else if (++tries>60){ clearInterval(id); console.warn('[Recurly] script not ready'); }
    }, 250);
  }

  // Recurly Hosted Fields init + token getter
  let recurlyConfigured=false, hostedFields=null;
  function initRecurlyHostedFields(){
    if (!window.recurly) return;
    try{
      if (!recurlyConfigured){
        const pk = document.querySelector('meta[name="recurly-public-key"]')?.content || window.RECURLY_PUBLIC_KEY;
        if(!pk){ console.warn('[Recurly] public key missing'); return; }
        console.log('[Recurly] configuring with public key', pk);
        window.recurly.configure(pk);
        recurlyConfigured=true;
      }
      const form = document.getElementById('recurlyForm'); if (!form) return;
      hostedFields?.destroy?.();
      hostedFields = window.recurly.HostedFields({
        fields:{
          number:{ selector: form.querySelector('[data-recurly="number"]') },
          month: { selector: form.querySelector('[data-recurly="month"]')  },
          year:  { selector: form.querySelector('[data-recurly="year"]')   },
          cvv:   { selector: form.querySelector('[data-recurly="cvv"]')    }
        },
        style:{ all:{ fontFamily:'Inter, system-ui, -apple-system, Segoe UI, Arial', fontSize:'16px', color:'#E9ECF2' } }
      });
    }catch(e){ console.warn('Recurly init error', e); }
  }
  function getRecurlyToken(){
    return new Promise((resolve,reject)=>{
      try{
        if (!hostedFields) return reject(new Error('Payment form not ready'));
        const postal = document.getElementById('coPostal')?.value || '';
        hostedFields.token({ postal_code: postal }, (err, token)=>{
          if (err) return reject(err);
          resolve(token);
        });
      }catch(e){ reject(e); }

  async function ensureHostedReady(timeout=7000){
    const start = Date.now();
    // If hostedFields isn't ready, try to initialize again gracefully
    if (!hostedFields) initRecurlyHostedFields();
    const hasIframes = ()=> payWrap.querySelectorAll('.recurly-hosted-field iframe').length >= 3;
    while (!hostedFields || !hasIframes()){
      if (Date.now() - start > timeout) throw new Error('Payment form is still loading — please try again.');
      await new Promise(r=>setTimeout(r,150));
    }
  }

    });
  }

  // Submit (Complete Order)
  submit?.addEventListener('click', async (e)=>{
    e.preventDefault();
    const order = buildOrder();
    try{
      if (method === 'card'){
        submit.disabled = true; submit.textContent = 'Processing…';
        await ensureHostedReady();
        const token = await getRecurlyToken();
        await fetch('/api/payments/recurly/charge', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ token: token.id || token, order }) });
        submit.disabled=false; submit.textContent='Complete Order';
        return;
      }
      if (method === 'crypto'){
        const res = await fetch('/api/payments/coinbase/create-charge', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ order })
        });
        const data = await res.json();
        if (data?.hosted_url) { window.location.href = data.hosted_url; return; }
        throw new Error('Coinbase charge not created');
      }
      alert('This payment method requires server-side connector setup.');
    }catch(err){ console.error(err); submit.disabled=false; submit.textContent='Complete Order'; alert(err.message || 'Payment failed.');
    }
  });

  function buildOrder(){
    const free=qty, merch=qty*SALE, disc=merch*(discount/100);
    const taxable=Math.max(0, merch-disc), tax=taxable*TAX, total=taxable+tax+SHIPPING;
    return { qty, free, merch, discountPct:discount, tax, total, method };
  }

  /* ---------- Deterministic stock counter (47→1 in ~5min) ---------- */
  const stock = (function(){
    const START=47, MIN=1, DURATION=5*60*1000;
    let startTs = 0, interval = 0;
    function ensureStart(reset=false){ if (reset || !startTs) startTs = Date.now(); }
    function value(){
      const f = Math.min(1, Math.max(0, (Date.now()-startTs)/DURATION));
      return Math.max(MIN, START - Math.round((START-MIN)*f));
    }
    function paint(){
      const v = value();
      ['coStockLine2','coStockLine3'].forEach(id=>{
        const n = document.getElementById(id);
        if (n) n.innerHTML = `<span class="qty">${v}</span> left in stock`;
      });
    }
    return {
      reset(){ clearInterval(interval); ensureStart(true); paint(); },
      start(){ clearInterval(interval); ensureStart(false); paint(); interval=setInterval(paint,1000); }
    };
  })();

  totals();
})();
