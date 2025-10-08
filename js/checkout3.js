/* ===== checkout3.js v6.0 — polished arrows, stock meter countdown, tweaks ===== */
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
    startStockCountdown(); // initialize stock when opening
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
    const txt=(t)=>`<div class="altpay"><h4>${t[0]}</h4><p>${t[1]}</p></div>`;
    const wallets = `
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
            </fieldset>${wallets}`;

    const map={
      card: cardHTML,
      venmo:txt(["Venmo","Send to @YourHandle — 15% off applied"]),
      cashapp:txt(["Cash App","Send to $YourCashtag — 15% off applied"]),
      paypal:txt(["PayPal","Redirect to PayPal — 15% off applied"]),
      crypto:txt(["Crypto","BTC/ETH/USDC — 15% off applied; address next"])
    };
    payWrap.innerHTML = map[m] || map.card;
  }

  submit && submit.addEventListener("click",(e)=>{
    e.preventDefault();
    hide(step3); show(success);
  });

  // -------- Stock meter (shared across steps 2 & 3) --------
  let stockInitTime = null, stockEndTime = null, stockStart = 47, stockCurrent = 47, stockTimer = null;
  const durationMs = 15 * 60 * 1000; // 15 minutes

  function ensureStockUI(){
    const nodes = [$("#coStock2"), $("#coStock3")].filter(Boolean);
    nodes.forEach(n=>{
      const fill = n.querySelector(".co-stock-fill");
      const label = n.querySelector(".co-stock-label");
      const qtyEl = n.querySelector(".qty");
      const pct = Math.max(0, (stockCurrent/stockStart)*100);
      if (fill) fill.style.width = pct+"%";
      if (qtyEl) qtyEl.textContent = String(stockCurrent);
      if (stockCurrent <= 0){
        n.classList.add("soldout");
        if (label) label.innerHTML = `Sold out — <strong>Restocks at 9am tomorrow</strong>`;
      } else {
        n.classList.remove("soldout");
        if (label) label.innerHTML = `<span class="qty">${stockCurrent}</span> left in stock`;
      }
    });
  }

  function startStockCountdown(){
    if (stockInitTime) return; // already started
    stockStart = 47;
    stockCurrent = stockStart;
    stockInitTime = Date.now();
    stockEndTime = stockInitTime + durationMs;
    clearInterval(stockTimer);
    stockTimer = setInterval(step, 7000); // first tick after 7s
    ensureStockUI();
  }

  function step(){
    const now = Date.now();
    if (stockCurrent <= 0){ clearInterval(stockTimer); ensureStockUI(); return; }
    if (now >= stockEndTime){
      stockCurrent = 0; ensureStockUI(); clearInterval(stockTimer); return;
    }

    // Estimate ticks left based on average delay ~12s (randomized below)
    const avgDelay = 12000;
    const ticksLeft = Math.max(1, Math.floor((stockEndTime - now) / avgDelay));
    const idealPerTick = Math.max(1, Math.ceil(stockCurrent / ticksLeft));

    // pick decrement 1..3 biased toward meeting ideal
    let dec = Math.min(3, Math.max(1, idealPerTick + (Math.random()>.6 ? 1 : 0)));
    dec = Math.min(dec, stockCurrent);
    stockCurrent -= dec;
    ensureStockUI();

    // randomize next interval 8–18s, get slightly faster if behind schedule
    const factor = stockCurrent / Math.max(1, ticksLeft);
    let next = Math.floor(8000 + Math.random()*10000);
    if (factor > 2) next = Math.max(6000, next - 2500);
    clearInterval(stockTimer);
    stockTimer = setInterval(step, next);
  }

  // initial
  priceWas && (priceWas.textContent="$90");
  priceNow && (priceNow.textContent="$45");
  totals();
})();
