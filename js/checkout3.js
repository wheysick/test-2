/* ===== checkout3.js v6.4 — Back link (top-left), robust stock counter, Recurly + Coinbase scaffolds ===== */
(function(){
  "use strict";

  const modal = document.getElementById("checkoutModal");
  if (!modal) return;

  const step1 = document.getElementById("coStep1");
  const step2 = document.getElementById("coStep2");
  const step3 = document.getElementById("coStep3");

  const toStep3 = document.getElementById("coToStep3");
  const qtyInput= document.getElementById("coQty");
  const payWrap = document.getElementById("coPayWrap");
  const submit  = document.getElementById("coSubmit");
  const closeX  = document.getElementById("checkoutClose");
  const success = document.getElementById("checkoutSuccess");
  const methodErr = document.getElementById("coMethodError");

  // Add global Back link (top-left inside the panel)
  let backLink = document.getElementById('coBackLink');
  if (!backLink){
    backLink = document.createElement('button');
    backLink.id = 'coBackLink';
    backLink.className = 'co-backlink';
    backLink.innerHTML = '← Back';
    modal.querySelector('.checkout-card')?.insertAdjacentElement('afterbegin', backLink);
  }

  const priceWas = step2.querySelector(".co-price .was");
  const priceNow = step2.querySelector(".co-price .now");

  // Pricing
  const MSRP=90, DISPLAY=45, SALE=90, TAX=0.0875, SHIPPING=0;
  let qty=1, method=null, discount=0;

  const $ = (id)=>document.getElementById(id);
  const fmt = (n)=>`$${n.toFixed(2)}`;
  const show=(el)=>{ if(el){ el.hidden=false; el.setAttribute("aria-hidden","false"); } };
  const hide=(el)=>{ if(el){ el.hidden=true;  el.setAttribute("aria-hidden","true");  } };

  function setStep(n){
    const s1 = n===1, s2 = n===2, s3 = n===3;
    if (s1){ show(step1); hide(step2); hide(step3); backLink.style.display='none'; }
    if (s2){ hide(step1); show(step2); hide(step3); backLink.style.display='inline-flex'; stock.start(); }
    if (s3){ hide(step1); hide(step2); show(step3); backLink.style.display='inline-flex'; stock.start(); }
  }

  function totals(){
    const free=qty, merch=qty*SALE, disc=merch*(discount/100);
    const taxable=Math.max(0, merch-disc), tax=taxable*TAX, total=taxable+tax+SHIPPING;
    const set=(id,v)=>{ const n=$(id); if(n) n.textContent=v; };
    set("coItemsLine", `${qty+free} bottles (${qty} paid + ${free} free)`);
    set("coMerch", fmt(merch));
    set("coDisc", disc>0?`-${fmt(disc)}`:"$0.00");
    set("coTax", fmt(tax));
    set("coTotal", fmt(total));
    const ship = step2.querySelector(".co-free-ship"); if (ship) ship.textContent = SHIPPING===0 ? "FREE" : fmt(SHIPPING);
    if (qtyInput) qtyInput.value = String(qty);
  }

  /* ---------- Open / close ---------- */
  const CTA_SEL = ".floating-cta,[data-cta],[data-open-checkout],.open-checkout,.cta,a[href='#offer'],a[href*='#offer'],a[href*='#checkout'],.masthead-cta";
  let openGuard=0;

  function openModal(e){
    const now=Date.now(); if (now-openGuard<250) return; openGuard=now;
    e?.preventDefault?.(); e?.stopPropagation?.();
    modal.classList.add("show","co-fullscreen");
    document.documentElement.setAttribute("data-checkout-open","1");
    document.body.style.overflow="hidden";
    priceWas && (priceWas.textContent=fmt(MSRP));
    priceNow && (priceNow.textContent=fmt(DISPLAY));
    qty=1; method=null; discount=0; totals(); setStep(1);
    if (methodErr) hide(methodErr);
    stock.reset(); stock.start(); // always (re)start
  }
  function closeModal(e){
    e?.preventDefault?.(); e?.stopPropagation?.();
    modal.classList.remove("show","co-fullscreen");
    document.documentElement.removeAttribute("data-checkout-open");
    document.body.style.overflow="";
  }
  window.checkoutOpen=openModal; window.checkoutClose=closeModal;

  function bindCTAs(){
    document.querySelectorAll(CTA_SEL).forEach(el=>{
      if(el.__bound) return;
      const h=(ev)=>{ ev.preventDefault(); ev.stopPropagation(); openModal(ev); };
      el.addEventListener("click",h,{capture:true});
      el.addEventListener("pointerup",h,{capture:true});
      el.addEventListener("touchend",h,{capture:true, passive:false});
      el.__bound=true;
    });
  }
  bindCTAs();
  new MutationObserver(bindCTAs).observe(document.documentElement,{subtree:true,childList:true,attributes:true});

  // Back link behavior
  backLink.addEventListener('click', (e)=>{
    e.preventDefault();
    if (!step2.hidden) { setStep(1); return; }
    if (!step3.hidden) { setStep(2); return; }
  });

  // Close
  closeX && closeX.addEventListener("click", closeModal);
  modal.addEventListener("click",(e)=>{ if (e.target===modal) closeModal(e); });
  document.addEventListener("keydown",(e)=>{ if (e.key==="Escape" && modal.classList.contains("show")) closeModal(e); });

  // Step 1
  step1 && step1.addEventListener("submit",(e)=>{
    e.preventDefault();
    const req=["name","email","address"].map(n=>step1.querySelector(`[name='${n}']`));
    const ok=req.every(i=>i && i.value.trim());
    req.forEach(i=>i && (i.style.borderColor = i.value.trim()? "" : "#ff5a6e"));
    if(!ok) return; setStep(2); totals();
  });

  // Step 2 — qty + methods + arrows + double tap
  let lastTapTime=0, lastMethod=null;
  step2 && step2.addEventListener("click",(e)=>{
    if(e.target.closest(".qty-inc")){ qty=Math.min(99,qty+1); totals(); return; }
    if(e.target.closest(".qty-dec")){ qty=Math.max(1, qty-1); totals(); return; }

    const strip = step2.querySelector(".co-xpay-strip");
    if (e.target.closest(".xpay-nav.prev")){ strip?.scrollBy({left:-240,behavior:"smooth"}); return; }
    if (e.target.closest(".xpay-nav.next")){ strip?.scrollBy({left: 240,behavior:"smooth"}); return; }

    const btn = e.target.closest(".co-xpay, .co-xpay-primary");
    if(!btn) return;

    step2.querySelectorAll(".co-xpay, .co-xpay-primary").forEach(b=>b.removeAttribute("aria-selected"));
    btn.setAttribute("aria-selected","true");
    method = btn.dataset.method || "card";
    discount = parseFloat(btn.dataset.discount || "0") || 0;
    totals();
    if (methodErr) hide(methodErr);

    // double tap to step 3
    const now = Date.now();
    if (lastMethod===method && (now - lastTapTime) < 350){
      renderPay(method); setStep(3); return;
    }
    lastMethod = method; lastTapTime = now;
  });

  step2 && step2.addEventListener("input",(e)=>{
    if (e.target.id!=="coQty") return;
    const v=e.target.value.replace(/[^0-9]/g,"");
    qty = Math.max(1, Math.min(99, parseInt(v||"1",10)));
    e.target.value = String(qty); totals();
  });

  toStep3 && toStep3.addEventListener("click",(e)=>{
    e.preventDefault();
    if(!method){
      if (methodErr){ methodErr.textContent = "Must select payment method"; show(methodErr); }
      return;
    }
    renderPay(method); setStep(3);
  });

  // Step 3 Payment Renderer (Recurly hosted fields for card + wallet row + OR)
  function renderPay(m){
    const wallets = `
      <div class="co-or">OR</div>
      <div class="co-alt-wallets">
        <button class="co-wallet apple" type="button" aria-label="Apple Pay"><img src="assets/applepay.svg" alt="" width="24" height="24"/><span>Apple&nbsp;Pay</span></button>
        <button class="co-wallet gpay" type="button" aria-label="Google Pay"><img src="assets/gpay.svg" alt="" width="24" height="24"/><span>Google&nbsp;Pay</span></button>
      </div>`;

    const recurlyCard = `
      <form id="recurlyForm">
        <fieldset class="cardset">
          <legend>Card details</legend>
          <div class="recurly-hosted-field" data-recurly="number"></div>
          <div class="co-row" style="margin-top:10px">
            <div class="recurly-hosted-field" data-recurly="month"></div>
            <div class="recurly-hosted-field" data-recurly="year"></div>
            <div class="recurly-hosted-field" data-recurly="cvv"></div>
          </div>
          <label style="margin-top:10px">ZIP
            <input id="coPostal" inputmode="numeric" maxlength="10" placeholder="Zip / Postal">
          </label>
        </fieldset>
      </form>`;

    const txt=(t)=>`<div class="altpay" style="text-align:center"><h4>${t[0]}</h4><p>${t[1]}</p></div>`;

    const map={
      card: recurlyCard + wallets,
      venmo:txt(["Venmo","Send to @YourHandle — 15% off applied"]),
      cashapp:txt(["Cash App","Send to $YourCashtag — 15% off applied"]),
      paypal:txt(["PayPal","Redirect to PayPal — 15% off applied"]),
      crypto:txt(["Crypto","BTC/ETH/USDC — 15% off applied; address next"])
    };
    payWrap.innerHTML = map[m] || (recurlyCard + wallets);
    if ((m||'card')==='card') initRecurlyHostedFields();
  }

  // Submit (Complete Order)
  submit && submit.addEventListener("click", async (e)=>{
    e.preventDefault();
    const order = buildOrder();

    try {
      if (method === 'card') {
        const token = await getRecurlyToken();
        if (!token) throw new Error('Card tokenization failed');
        await fetch('/api/payments/recurly/charge', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ token: token.id || token, order })
        });
        hide(step3); show(success);
        return;
      }

      if (method === 'crypto') {
        const res = await fetch('/api/payments/coinbase/create-charge', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ order })
        });
        const data = await res.json();
        if (data?.hosted_url) { window.location.href = data.hosted_url; return; }
        throw new Error('Coinbase charge not created');
      }

      if (method === 'paypal' || method === 'venmo' || method === 'cashapp') {
        // TODO: Implement PayPal/Braintree/Square flows server-side, then redirect here.
        alert('This payment method requires server-side connector setup. See /api-samples for code.');
        return;
      }

      // default (card)
      hide(step3); show(success);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Payment failed. Please try again.');
    }
  });

  function buildOrder(){
    const free=qty, merch=qty*SALE, disc=merch*(discount/100);
    const taxable=Math.max(0, merch-disc), tax=taxable*TAX, total=taxable+tax+SHIPPING;
    return { qty, free, merch, discountPct:discount, tax, total, method };
  }

  /* ---------- Recurly.js Hosted Fields integration (client side) ---------- */
  let recurlyConfigured = false, hostedFields = null;

  function initRecurlyHostedFields(){
    if (!window.recurly) return;
    try {
      if (!recurlyConfigured){
        const pk = document.querySelector('meta[name="recurly-public-key"]')?.content || window.RECURLY_PUBLIC_KEY;
        if (!pk) { console.warn('Recurly public key missing. Add <meta name="recurly-public-key" content="pk_xxx">'); return; }
        window.recurly.configure(pk);
        recurlyConfigured = true;
      }
      const form = document.getElementById('recurlyForm');
      if (!form) return;
      hostedFields?.destroy?.();
      hostedFields = window.recurly.HostedFields({
        fields: {
          number: { selector: form.querySelector('[data-recurly="number"]') },
          month:  { selector: form.querySelector('[data-recurly="month"]') },
          year:   { selector: form.querySelector('[data-recurly="year"]') },
          cvv:    { selector: form.querySelector('[data-recurly="cvv"]') }
        },
        style: {
          all: { fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Arial', fontSize: '16px', color: '#E9ECF2' },
          focus: { color: '#fff' }
        }
      });
    } catch(e){ console.warn('Recurly init error', e); }
  }

  function getRecurlyToken(){
    return new Promise((resolve, reject)=>{
      try {
        if (!hostedFields){ reject(new Error('Payment form not ready')); return; }
        const postal = document.getElementById('coPostal')?.value || '';
        hostedFields.token({ postal_code: postal }, (err, token)=>{
          if (err) return reject(err);
          resolve(token);
        });
      } catch(e){ reject(e); }
    });
  }

  /* ---------- Robust stock counter (47 → 1 in ~5m) ---------- */
  const stock = (function(){
    const START=47, MIN=1, DURATION=5*60*1000;
    let current=START, endAt=0, timer=0, running=false;

    function paint(){
      document.querySelectorAll('#coStockLine2,#coStockLine3').forEach(n=>{
        if(!n) return;
        const val = Math.max(MIN, current);
        n.innerHTML = `<span class="qty">${val}</span> left in stock`;
      });
    }
    function step(){
      const now = Date.now();
      if (current <= MIN){ running=false; return; }
      const msLeft = Math.max(1, endAt - now);
      const avgInterval = 5000;
      const stepsLeft = Math.max(1, Math.floor(msLeft / avgInterval));
      const idealDec = Math.max(1, Math.ceil((current - MIN) / stepsLeft));
      let dec = Math.min(3, Math.max(1, idealDec + (Math.random()>.6?1:0)));
      dec = Math.min(dec, current - MIN);
      current -= dec;
      paint();
      timer = setTimeout(step, Math.floor(3000 + Math.random()*4000));
    }
    return {
      reset(){
        clearTimeout(timer);
        current = START; endAt = Date.now() + DURATION; running=false; paint();
      },
      start(){
        if (running) return; running=true; paint(); timer=setTimeout(step, 2500);
      }
    };
  })();

  // initial
  totals();
})();
