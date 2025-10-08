/* ===== checkout3.js v6.3 — centered step-3, fast 5-min stockline (47→1), OR divider ===== */
(function(){
  "use strict";

  const modal = document.getElementById("checkoutModal");
  if (!modal) return;

  const step1 = document.getElementById("coStep1");
  const step2 = document.getElementById("coStep2");
  const step3 = document.getElementById("coStep3");

  const toStep3 = document.getElementById("coToStep3");
  const back1   = document.getElementById("coBackTo1");
  const back2   = document.getElementById("coBackTo2");

  const qtyInput= document.getElementById("coQty");
  const payWrap = document.getElementById("coPayWrap");
  const submit  = document.getElementById("coSubmit");
  const closeX  = document.getElementById("checkoutClose");
  const success = document.getElementById("checkoutSuccess");
  const methodErr = document.getElementById("coMethodError");

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
    if (n===1){ show(step1); hide(step2); hide(step3); step1.querySelector('input')?.focus({preventScroll:true}); }
    if (n===2){ hide(step1); show(step2); hide(step3); ensureStockUI(); }
    if (n===3){ hide(step1); hide(step2); show(step3); ensureStockUI(); step3.querySelector('input,button')?.focus({preventScroll:true}); }
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
    resetStockCountdown(); // new open → reset fast countdown
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

  // Safety net
  function trap(ev){
    const t = ev.target.closest?.(CTA_SEL);
    if (t){ ev.preventDefault(); ev.stopPropagation(); openModal(ev); }
  }
  ["pointerdown","touchstart","touchend","pointerup","click"].forEach(evt=>{
    document.addEventListener(evt, trap, {capture:true, passive:false});
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
  back1 && back1.addEventListener("click",()=>setStep(1));
  back2 && back2.addEventListener("click",()=>setStep(2));

  // Step 3
  function renderPay(m){
    const txt=(t)=>`<div class="altpay" style="text-align:center"><h4>${t[0]}</h4><p>${t[1]}</p></div>`;
    const wallets = `
      <div class="co-or">OR</div>
      <div class="co-alt-wallets">
        <button class="co-wallet apple" type="button" aria-label="Apple Pay">
          <img src="assets/applepay.svg" alt="" width="24" height="24"/><span>Apple&nbsp;Pay</span>
        </button>
        <button class="co-wallet gpay" type="button" aria-label="Google Pay">
          <img src="assets/gpay.svg" alt="" width="24" height="24"/><span>Google&nbsp;Pay</span>
        </button>
      </div>`;

    const cardHTML = `<fieldset class="cardset"><legend>Card details</legend>
              <label>Card number<input type="text" inputmode="numeric" placeholder="4242 4242 4242 4242"></label>
              <div class="co-row">
                <label>Expiry<input inputmode="numeric" placeholder="MM/YY"></label>
                <label>CVC<input inputmode="numeric" maxlength="4"></label>
                <label>ZIP<input inputmode="numeric" maxlength="5"></label>
              </div>
            </fieldset>`;

    const map={
      card: cardHTML + wallets,
      venmo:txt(["Venmo","Send to @YourHandle — 15% off applied"]),
      cashapp:txt(["Cash App","Send to $YourCashtag — 15% off applied"]),
      paypal:txt(["PayPal","Redirect to PayPal — 15% off applied"]),
      crypto:txt(["Crypto","BTC/ETH/USDC — 15% off applied; address next"])
    };
    payWrap.innerHTML = map[m] || (cardHTML + wallets);
  }

  submit && submit.addEventListener("click",(e)=>{
    e.preventDefault();
    hide(step3); show(success);
  });

  // -------- FAST Stock line (47 → 1 in ~5 minutes) --------
  let stockStart = 47;
  let stockCurrent = stockStart;
  let stockEndTime = 0;
  let stockTimeout = 0;
  const durationMs = 5 * 60 * 1000; // 5 minutes

  function ensureStockUI(){
    const nodes = [$("#coStockLine2"), $("#coStockLine3")].filter(Boolean);
    nodes.forEach(n=>{
      if (!n) return;
      if (stockCurrent <= 1){
        n.classList.remove("soldout");
        n.innerHTML = `<span class="qty">1</span> left in stock`;
      } else {
        n.classList.remove("soldout");
        n.innerHTML = `<span class="qty">${stockCurrent}</span> left in stock`;
      }
    });
  }

  function scheduleNext(ms){ clearTimeout(stockTimeout); stockTimeout = setTimeout(step, ms); }

  function resetStockCountdown(){
    stockCurrent = stockStart;
    stockEndTime = Date.now() + durationMs;
    ensureStockUI();
    scheduleNext(3000); // first update after 3s
  }

  function step(){
    const now = Date.now();
    if (stockCurrent <= 1){ ensureStockUI(); return; }
    const msLeft = Math.max(1, stockEndTime - now);
    // average ~5s between updates → compute ideal decrement to reach 1
    const avgInterval = 5000;
    const stepsLeft = Math.max(1, Math.floor(msLeft / avgInterval));
    const idealDec = Math.max(1, Math.ceil((stockCurrent - 1) / stepsLeft));
    let dec = Math.min(3, Math.max(1, idealDec + (Math.random()>.6?1:0)));
    dec = Math.min(dec, stockCurrent - 1); // never below 1
    stockCurrent -= dec;
    ensureStockUI();
    const next = Math.floor(3000 + Math.random()*4000);
    scheduleNext(next);
  }

  // initial
  priceWas && (priceWas.textContent="$90");
  priceNow && (priceNow.textContent="$45");
  totals();
})();
