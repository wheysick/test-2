/* ===== checkout3.js v6.4 — reliable stock service, top-right Back, connectors scaffolding ===== */
(function(){
  "use strict";

  const modal = document.getElementById("checkoutModal");
  if (!modal) return;

  const step1 = document.getElementById("coStep1");
  const step2 = document.getElementById("coStep2");
  const step3 = document.getElementById("coStep3");

  const toStep3 = document.getElementById("coToStep3");
  const payWrap = document.getElementById("coPayWrap");
  const submit  = document.getElementById("coSubmit");
  const closeX  = document.getElementById("checkoutClose");
  const success = document.getElementById("checkoutSuccess");
  const methodErr = document.getElementById("coMethodError");

  const priceWas = step2.querySelector(".co-price .was");
  const priceNow = step2.querySelector(".co-price .now");

  // Create top-right Back link
  let backLink = document.getElementById("coBackLink");
  if (!backLink) {
    backLink = document.createElement("a");
    backLink.id = "coBackLink";
    backLink.href = "#";
    backLink.textContent = "Back";
    backLink.style.display = "none";
    modal.appendChild(backLink);
  }

  // Pricing
  const MSRP=90, DISPLAY=45, SALE=90, TAX=0.0875, SHIPPING=0;
  let qty=1, method=null, discount=0, currentStep=1;

  const $ = (id)=>document.getElementById(id);
  const fmt = (n)=>`$${n.toFixed(2)}`;
  const show=(el)=>{ if(el){ el.hidden=false; el.setAttribute("aria-hidden","false"); } };
  const hide=(el)=>{ if(el){ el.hidden=true;  el.setAttribute("aria-hidden","true");  } };

  function setStep(n){
    currentStep = n;
    if (n===1){ show(step1); hide(step2); hide(step3); step1.querySelector('input')?.focus({preventScroll:true}); backLink.style.display = "none"; }
    if (n===2){ hide(step1); show(step2); hide(step3); ensureStockUI(); backLink.style.display = "inline"; }
    if (n===3){ hide(step1); hide(step2); show(step3); ensureStockUI(); step3.querySelector('input,button')?.focus({preventScroll:true}); backLink.style.display = "inline"; }
  }

  backLink.addEventListener("click", (e)=>{
    e.preventDefault();
    if (currentStep === 2) setStep(1);
    else if (currentStep === 3) setStep(2);
  });

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
    const qi = $("#coQty"); if (qi) qi.value = String(qty);
    return total;
  }
  function getTotal(){ return totals(); }

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
    Stock.start(); // start (or restart) global stock timer
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
      el.addEventListener("pointerdown",h,{capture:true});
      el.addEventListener("touchstart",h,{capture:true, passive:false});
      el.addEventListener("touchend",h,{capture:true, passive:false});
      el.addEventListener("pointerup",h,{capture:true});
      el.addEventListener("click",h,{capture:true});
      el.__bound=true;
    });
  }
  bindCTAs();
  new MutationObserver(bindCTAs).observe(document.documentElement,{subtree:true,childList:true,attributes:true});

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

    // Arrow navigation
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

    // double tap: go to step 3
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

  // Step 3: renderer with connectors
  function renderPay(m){
    payWrap.innerHTML = ""; // clear
    const total = getTotal();

    // Helpers
    const h = (html) => { const d=document.createElement("div"); d.innerHTML=html; return d.firstElementChild; };
    const cfg = (window.CO_CONFIG||{});

    if (m === "card"){
      // Recurly or fallback
      if (cfg.recurlyPublicKey){
        // Load recurly.js and mount hosted fields
        const loadScript = (src)=> new Promise((res,rej)=>{ if(document.querySelector(`script[src*="${src}"]`)) return res(); const s=document.createElement("script"); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
        loadScript("https://js.recurly.com/v4/recurly.js").then(()=>{
          // Build form with hosted field containers
          const form = h(`<form id="recurly-form" class="cardset">
            <legend>Card details</legend>
            <label>Card number<div id="recurly-number" style="height:44px;padding:10px 12px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(255,255,255,.06)"></div></label>
            <div class="co-row">
              <label>Expiry<div id="recurly-month" style="height:44px;padding:10px 12px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(255,255,255,.06)"></div></label>
              <label>Year<div id="recurly-year" style="height:44px;padding:10px 12px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(255,255,255,.06)"></div></label>
              <label>CVC<div id="recurly-cvv" style="height:44px;padding:10px 12px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(255,255,255,.06)"></div></label>
            </div>
            <input type="text" id="recurly-postal" placeholder="ZIP / Postal" style="margin-top:10px;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff"/>
          </form>`);
          payWrap.appendChild(form);

          const r = window.recurly; r.configure(cfg.recurlyPublicKey);
          r.ready(function(){
            r.attach("number", "#recurly-number");
            r.attach("month",  "#recurly-month");
            r.attach("year",   "#recurly-year");
            r.attach("cvv",    "#recurly-cvv");
          });

          // Hook Complete Order to tokenize
          submit?.addEventListener("click", recurlySubmitHandler);
          function recurlySubmitHandler(e){
            e.preventDefault();
            r.token(form, function (err, token) {
              if (err) { alert(err.message || "Card error"); return; }
              // Send token.id to your server to create the purchase
              fetch("/api/recurly-charge",{
                method:"POST",
                headers:{ "Content-Type":"application/json" },
                body: JSON.stringify({ token: token.id, amount: total, qty })
              }).then(()=>{
                hide(step3); show(success);
              }).catch(()=> alert("Server error"));
            });
          }
        });
      } else {
        // Fallback simple fields
        payWrap.innerHTML = `<fieldset class="cardset"><legend>Card details</legend>
              <label>Card number<input type="text" inputmode="numeric" placeholder="4242 4242 4242 4242"></label>
              <div class="co-row">
                <label>Expiry<input inputmode="numeric" placeholder="MM/YY"></label>
                <label>CVC<input inputmode="numeric" maxlength="4"></label>
                <label>ZIP<input inputmode="numeric" maxlength="5"></label>
              </div>
            </fieldset>`;
      }

      // Wallets row (ApplePay/GooglePay placeholders)
      const wallets = h(`<div class="co-or">OR</div>
        <div class="co-alt-wallets">
          <button class="co-wallet apple" type="button"><img src="assets/applepay.svg" width="24" height="24" alt=""/> Apple&nbsp;Pay</button>
          <button class="co-wallet gpay" type="button"><img src="assets/gpay.svg" width="24" height="24" alt=""/> Google&nbsp;Pay</button>
        </div>`);
      payWrap.appendChild(wallets);
      return;
    }

    if (m === "paypal" || m === "venmo"){
      const client = cfg.paypalClientId;
      payWrap.innerHTML = `<div id="pp-buttons"></div>`;
      if (!client){ payWrap.appendChild(h(`<p class="tiny muted" style="text-align:center">Add your PayPal client ID in <code>js/config.js</code> to enable ${(m==='venmo'?'Venmo':'PayPal')}.</p>`)); return; }
      const funding = (m==='venmo') ? "&enable-funding=venmo" : "";
      loadScript(`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(client)}&currency=USD${funding}`)
        .then(()=>{
          const create = (data, actions) => actions.order.create({
            purchase_units: [{ amount: { value: (getTotal()).toFixed(2) } }]
          });
          const onApprove = (data, actions) => actions.order.capture().then(()=>{ hide(step3); show(success); });
          window.paypal.Buttons({ style:{ layout:"vertical", color:"blue", shape:"pill", label:"pay" }, createOrder:create, onApprove }).render("#pp-buttons");
        }).catch(()=> payWrap.appendChild(h(`<p class="tiny muted">Failed to load PayPal.</p>`)));
      return;
    }

    if (m === "crypto"){
      const id = (window.CO_CONFIG||{}).coinbaseCheckoutId;
      payWrap.innerHTML = `<div class="altpay" style="text-align:center">
        <h4>Crypto checkout</h4>
        <p>We use Coinbase Commerce for crypto. Click below to open a secure checkout.</p>
        <p><a class="btn-main btn-lg" href="${id?`https://commerce.coinbase.com/checkout/${id}`:'#'}" target="_blank" rel="noopener">${id?'Pay with Coinbase':'Add checkout ID in js/config.js'}</a></p>
      </div>`;
      return;
    }

    if (m === "cashapp"){
      const cfg = (window.CO_CONFIG||{});
      payWrap.innerHTML = `<div class="altpay" style="text-align:center">
        <h4>Cash App Pay</h4>
        <p>This uses Square's Web Payments SDK. Add your <code>squareAppId</code> and <code>squareLocationId</code> in <code>js/config.js</code>.</p>
        <div id="cashapp-container" style="display:flex;justify-content:center;margin-top:8px"></div>
      </div>`;
      if (!cfg.squareAppId || !cfg.squareLocationId) return;
      loadScript("https://sandbox.web.squarecdn.com/v1/square.js").then(async ()=>{
        if (!window.Square) return;
        const payments = window.Square.payments(cfg.squareAppId, cfg.squareLocationId);
        const cashApp = await payments.cashAppPay({ redirectURL: window.location.href, referenceId: "sample-"+Date.now(), countryCode:"US" });
        await cashApp.attach("#cashapp-container");
        // Tokenize on click is handled by the SDK; you would POST the token to your server:
        // fetch("/api/square-cashapp", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ token, amount: getTotal() }) })
      });
      return;
    }
  }

  submit && submit.addEventListener("click",(e)=>{
    e.preventDefault();
    // If we're here with a non-Recurly method (e.g., fallback card), just show success demo
    hide(step3); show(success);
  });

  function loadScript(src){
    return new Promise((res, rej)=>{
      if (document.querySelector(`script[src*="${src}"]`)) return res();
      const s=document.createElement("script"); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s);
    });
  }

  /* ---------- Global stock countdown service (conflict-proof) ---------- */
  const Stock = (function(){
    const START = 47, MIN = 1, DURATION = 5 * 60 * 1000; // 5 minutes
    let startTs = 0, timer = 0, qty = START;

    function updateDom(){
      document.querySelectorAll("#coStockLine2 .qty, #coStockLine3 .qty").forEach(n=>{ n.textContent = qty; });
    }
    function schedule(){
      clearInterval(timer);
      timer = setInterval(tick, 1000);
    }
    function tick(){
      const now = Date.now();
      const elapsed = now - startTs;
      const totalDrops = START - MIN;
      const expected = START - Math.floor((elapsed / DURATION) * totalDrops);
      if (expected < qty) qty = expected;
      if (Math.random() < 0.18 && qty > MIN) qty = Math.max(MIN, qty - (1 + Math.floor(Math.random()*2)));
      qty = Math.max(MIN, qty);
      updateDom();
      if (qty <= MIN) clearInterval(timer);
    }
    return {
      start(){
        startTs = Date.now();
        qty = START;
        updateDom();
        schedule();
      }
    };
  })();
  window.__Stock = window.__Stock || Stock;
  function ensureStockUI(){
    // nothing extra; the stock lines exist in markup and Stock updates them
  }

  // initial
  priceWas && (priceWas.textContent="$90");
  priceNow && (priceNow.textContent="$45");
  totals();
})();
