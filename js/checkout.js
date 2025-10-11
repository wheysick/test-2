/* ============================================================================
   checkout.js — Unified FINAL (UI + Recurly Elements only)
   Replaces old checkout3.js and earlier checkout.js flows.
   - Modal open/close + steps
   - Qty & method selection
   - Recurly Elements mount + tokenization
   - Correct billing_info.address shape for Recurly
============================================================================ */
(function(){
  'use strict';
  if (window.__CHECKOUT_UNIFIED__) return;
  window.__CHECKOUT_UNIFIED__ = true;

  // ---------- Tiny DOM helpers
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const fmt = (n)=>`$${Number(n||0).toFixed(2)}`;
  const show = el => { if (el){ el.hidden=false; el.setAttribute('aria-hidden','false'); } };
  const hide = el => { if (el){ el.hidden=true;  el.setAttribute('aria-hidden','true'); } };

  // ---------- Nodes
  let modal = $('#checkoutModal');
  const step1   = $('#coStep1');
  const step2   = $('#coStep2');
  const step3   = $('#coStep3');
  const toStep3 = $('#coToStep3');
  const payWrap = $('#coPayWrap');
  const submit  = $('#coSubmit');
  const methodErr = $('#coMethodErr');

  // Back link pinned top-left (create if not in DOM)
  let backLink = $('#coBackLink');
  if (!backLink){
    backLink = document.createElement('button');
    backLink.id = 'coBackLink';
    backLink.className = 'co-backlink';
    backLink.type = 'button';
    backLink.textContent = '← Back';
    $('.modal-content.checkout-card')?.insertAdjacentElement('afterbegin', backLink);
  }

  // ---------- Pricing + state
  const MSRP=90, SALE=45, TAX=0.0875, SHIPPING=0;
  let qty=1, method=null, discount=0;
  let customer = {}; // step 1 capture

  // ---------- Modal control
  function setModalOpen(b){
    if (!modal) modal = $('#checkoutModal');
    if (!modal) { console.warn('[checkout] #checkoutModal missing'); return; }
    modal.classList.toggle('show', !!b);
    if (b){ modal.classList.add('co-fullscreen'); document.body.style.overflow='hidden'; }
    else { modal.classList.remove('co-fullscreen'); document.body.style.overflow=''; }
  }
  function setStep(n){
    if (n===1){ show(step1); hide(step2); hide(step3); backLink.style.display='none'; }
    if (n===2){ hide(step1); show(step2); hide(step3); backLink.style.display='inline-flex'; stock.start(); }
    if (n===3){ hide(step1); hide(step2); show(step3); backLink.style.display='inline-flex'; stock.start(); prepareStep3(); }
    modal?.setAttribute('data-step', String(n));
  }
  // Open/close + global triggers
  let openGuard=0;
  function checkoutOpen(e){
    const now=Date.now(); if (now-openGuard<250) return; openGuard=now;
    e?.preventDefault?.(); e?.stopPropagation?.();
    qty=1; method=null; discount=0; totals();
    setModalOpen(true); setStep(1);
  }
  function checkoutClose(e){
    e?.preventDefault?.(); e?.stopPropagation?.();
    setModalOpen(false);
  }
  window.checkoutOpen  = checkoutOpen;
  window.checkoutClose = checkoutClose;
  window.checkoutBack  = function(){
    if (!step2.hidden && step3.hidden){ setStep(1); return; }
    if (!step3.hidden)                 { setStep(2); return; }
  };

  // Click-any-known-CTA opens checkout
  const CTA_SEL = ".floating-cta,[data-cta],[data-open-checkout],.open-checkout,.cta,a[href='#offer'],a[href*='#offer'],a[href*='#checkout'],.masthead-cta";
  document.addEventListener('click', (e)=>{
    const t = e.target.closest?.(CTA_SEL);
    if (t){ e.preventDefault(); e.stopPropagation(); checkoutOpen(e); }
  }, true);
  // Modal close behaviors
  backLink.addEventListener('click', (e)=>{ e.preventDefault(); window.checkoutBack(); });
  modal?.addEventListener('click', (e)=>{ if (e.target===modal) checkoutClose(e); });
  document.addEventListener('keydown',(e)=>{ if(e.key==='Escape' && modal?.classList.contains('show')) checkoutClose(e); });

  // ---------- Step 1
  function getStep1Values(){
    if (!step1) return {};
    const get = n => (step1.querySelector(`[name='${n}']`)?.value || '').trim();
    const full = get('name'); const ix = full.lastIndexOf(' ');
    return {
      first_name: ix>0 ? full.slice(0,ix) : full,
      last_name:  ix>0 ? full.slice(ix+1) : '',
      email: get('email'),
      phone: get('phone'),
      address1: get('address') || get('address1') || get('street') || get('street_address'),
      city: get('city'),
      state: get('state') || get('region'),
      zip:   get('zip') || get('postal') || get('postal_code'),
      country: (get('country') || 'US').toUpperCase()
    };
  }
  step1?.addEventListener('submit',(e)=>{
    e.preventDefault();
    const req=['name','email','address'].map(n=>step1.querySelector(`[name='${n}']`));
    const ok=req.every(i=>i && i.value.trim());
    req.forEach(i=>i&&(i.style.borderColor=i.value.trim()?'':'#ff5a6e'));
    if(!ok) return;
    customer = getStep1Values();
    setStep(2); totals();
  });

  // ---------- Step 2
  const qtyDec = step2?.querySelector('.qty-dec');
  const qtyInc = step2?.querySelector('.qty-inc');
  const qtyInput = $('#coQty');
  step2?.addEventListener('click',(e)=>{
    if(e.target.closest('.qty-inc')){ qty = Math.min(99, qty+1); totals(); return; }
    if(e.target.closest('.qty-dec')){ qty = Math.max(1,  qty-1); totals(); return; }
    const strip = step2.querySelector('.co-xpay-strip');
    if(e.target.closest('.xpay-nav.prev')){ strip?.scrollBy({left:-240,behavior:'smooth'}); return; }
    if(e.target.closest('.xpay-nav.next')){ strip?.scrollBy({left: 240,behavior:'smooth'}); return; }
    const btn = e.target.closest('.co-xpay, .co-xpay-primary'); if(!btn) return;
    step2.querySelectorAll('.co-xpay,.co-xpay-primary').forEach(b=>b.removeAttribute('aria-selected'));
    btn.setAttribute('aria-selected','true');
    method = btn.dataset.method || 'card';
    discount = parseFloat(btn.dataset.discount || '0') || 0;
    totals();
    methodErr && hide(methodErr);
  });
  step2?.addEventListener('input',(e)=>{
    if (e.target.id!=='coQty') return;
    const v=e.target.value.replace(/[^0-9]/g,'');
    qty=Math.max(1,Math.min(99,parseInt(v||'1',10)));
    e.target.value=String(qty); totals();
  });
  toStep3?.addEventListener('click',(e)=>{
    e.preventDefault();
    if(!method){ methodErr && (methodErr.textContent='Must select payment method', show(methodErr)); return; }
    setStep(3);
  });

  function totals(){
    const free=qty, merch=qty*SALE, disc=merch*(discount/100);
    const taxable=Math.max(0, merch-disc), tax=taxable*TAX, total=taxable+tax+SHIPPING;
    const set=(id,v)=>{ const n=document.getElementById(id); if(n) n.textContent=v; };
    set('coItemsLine', `${qty+free} bottles (${qty} paid + ${free} free)`);
    set('coMerch', fmt(merch));
    set('coDisc', disc>0?`-${fmt(disc)}`:'$0.00');
    set('coTax', fmt(tax));
    set('coTotal', fmt(total));
    if (qtyInput) qtyInput.value = String(qty);
    // expose for any external code
    window.__orderQty   = qty;
    window.__orderTotal = total;
  }

  // ---------- Step 3 (Recurly Elements only)
  let elements=null, hostedMounted=false, recurlyConfigured=false;
  function prepareStep3(){
    // render fields
    if (payWrap){
      payWrap.innerHTML = `
      <form id="recurlyForm" onsubmit="return false">
        <fieldset class="cardset">
          <legend>Card details</legend>
          <label>Card number
            <div class="recurly-hosted-field" id="recurly-number"></div>
          </label>
          <div class="co-row" style="margin-top:10px">
            <label>Expiry <div class="recurly-hosted-field" id="recurly-month"></div></label>
            <label>Year   <div class="recurly-hosted-field" id="recurly-year"></div></label>
            <label>CVC    <div class="recurly-hosted-field" id="recurly-cvv"></div></label>
          </div>
          <label style="margin-top:10px">ZIP
            <input id="coPostal" inputmode="numeric" maxlength="10" placeholder="Zip / Postal" value="${customer?.zip||''}">
          </label>
        </fieldset>
      </form>`;
    }
    // mount Elements
    mountRecurlyElements();
  }

  function mountRecurlyElements(){
    try{
      if (!window.recurly || typeof window.recurly.configure!=='function'){
        console.warn('[Recurly] not loaded yet'); return;
      }
      if (!recurlyConfigured){
        const pk = document.querySelector('meta[name="recurly-public-key"]')?.content || window.RECURLY_PUBLIC_KEY;
        if(!pk){ console.warn('[Recurly] public key missing'); return; }
        // Accept object or shorthand
        try{ window.recurly.configure({ publicKey: pk, api: window.RECURLY_API || undefined }); }
        catch{ window.recurly.configure(pk); }
        recurlyConfigured=true;
      }
      if (!elements){ elements = window.recurly.Elements(); }

      // Create & attach
      const style = { all: { fontSize:'16px', color:'#E9ECF2', placeholder:{ color:'rgba(234,236,239,.55)' } } };
      elements.CardNumberElement({ style }).attach('#recurly-number');
      elements.CardMonthElement({  style }).attach('#recurly-month');
      elements.CardYearElement({   style }).attach('#recurly-year');
      elements.CardCvvElement({    style }).attach('#recurly-cvv');

      hostedMounted = true;
      console.log('[Recurly] Elements mounted');
    }catch(e){ console.warn('[Recurly mount]', e?.message||e); }
  }

  async function ensureHostedReady(timeout=7000){
    const start=Date.now();
    const hasIframes = () => payWrap?.querySelectorAll('.recurly-hosted-field iframe').length >= 3;
    while (!hostedMounted || !hasIframes()){
      if (Date.now()-start > timeout) throw new Error('Payment form is still loading — please try again.');
      await new Promise(r=>setTimeout(r,150));
    }
  }

  function buildMeta(){
    // Nested shape Recurly Elements expects (address inside billing_info)
    const c = customer || {};
    const postal = $('#coPostal')?.value?.trim() || c.zip || '';
    const state = (c.state || '').toUpperCase();
    const country = (c.country || 'US').toUpperCase();
    return {
      billing_info: {
        first_name: c.first_name || '',
        last_name:  c.last_name  || '',
        email:      c.email      || '',
        phone:      c.phone      || '',
        address: {
          line1:       c.address1 || '',
          line2:       c.address2 || '',
          city:        c.city     || '',
          region:      state,
          state:       state,           // some builds reference 'state'
          postal_code: postal,
          zip:         postal,          // mirror for safety
          country:     country
        }
      }
    };
  }

  function tokenize(){
    return new Promise((resolve,reject)=>{
      try{
        const meta = buildMeta();
        window.recurly.token(elements, meta, (err, token)=>{
          if (err){
            const details = err.fields ? Object.entries(err.fields).map(([k,v])=>`${k}: ${Array.isArray(v)?v.join(', '):v}`).join('; ') : '';
            return reject(new Error(details ? `${err.message} — ${details}` : (err.message || 'Payment validation failed')));
          }
          resolve(token);
        });
      }catch(e){ reject(e); }
    });
  }

  // ---------- Submit
  submit?.addEventListener('click', async (e)=>{
    e.preventDefault();
    try{
      if (method !== 'card'){ alert('Select a card method to continue.'); return; }
      submit.disabled = true; submit.textContent = 'Processing…';
      await ensureHostedReady();
      const token = await tokenize();

      const free=qty, merch=qty*SALE, disc=merch*(discount/100);
      const taxable=Math.max(0, merch-disc), tax=taxable*TAX, total=taxable+tax+SHIPPING;
      const order = { qty, free, merch, discountPct:discount, tax, total, method, customer };

      const res = await fetch('/api/payments/recurly/charge', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ token: token?.id || token, order })
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data?.error || data?.message || 'Charge failed');

      alert('Payment authorized (sandbox).'); // replace with your success UI
      // window.location.href = '/thank-you.html';
    }catch(err){
      console.error('[Checkout error]', err);
      alert(err?.message || 'Payment failed.');
    }finally{
      submit.disabled = false; submit.textContent = 'Complete Order';
    }
  });

  // ---------- Deterministic stock counter (47→1 in ~5min)
  const stock = (function(){
    const START=47, MIN=1, DURATION=5*60*1000;
    let startTs=0, interval=0;
    function ensureStart(reset=false){ if (reset || !startTs) startTs = Date.now(); }
    function value(){ const f=Math.min(1,Math.max(0,(Date.now()-startTs)/DURATION)); return Math.max(MIN, START - Math.round((START-MIN)*f)); }
    function paint(){
      const v=value();
      ['coStockLine2','coStockLine3'].forEach(id=>{ const n=document.getElementById(id); if(n) n.innerHTML=`<span class="qty">${v}</span> left in stock`; });
    }
    return { reset(){ clearInterval(interval); ensureStart(true); paint(); },
             start(){ clearInterval(interval); ensureStart(false); paint(); interval=setInterval(paint,1000); } };
  })();

  // ---------- Boot
  totals();

})();
