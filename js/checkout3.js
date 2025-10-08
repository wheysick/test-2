/* ===== checkout3.js v5.1 — mobile-solid open + polished steps + desktop CTA ready ===== */
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
  const tos     = document.getElementById("coTos");
  const submit  = document.getElementById("coSubmit");
  const closeX  = document.getElementById("checkoutClose");
  const success = document.getElementById("checkoutSuccess");

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
    if (n===2){ hide(step1); show(step2); hide(step3); }
    if (n===3){ hide(step1); hide(step2); show(step3); step3.querySelector('input,button')?.focus({preventScroll:true}); }
  }

  function totals(){
    const free=qty, merch=qty*SALE, disc=merch*(discount/100);
    const taxable=Math.max(0, merch-disc), tax=taxable*TAX, total=taxable+tax+SHIPPING;
    const set=(id,v)=>{ const n=$(id); if(n) n.textContent=v; };
    set("coFreeQty", String(free));
    set("coItemsLine", `${qty+free} bottles (${qty} paid + ${free} free)`);
    set("coMerch", fmt(merch));
    set("coDisc", disc>0?`-${fmt(disc)}`:"$0.00");
    set("coTax", fmt(tax));
    set("coTotal", fmt(total));
    const ship = step2.querySelector(".co-free-ship"); if (ship) ship.textContent = SHIPPING===0 ? "FREE" : fmt(SHIPPING);
    if (qtyInput) qtyInput.value = String(qty);
  }

  /* ---------- Open / close (bulletproof on mobile) ---------- */
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
    qty=1; method=null; discount=0; if(toStep3) toStep3.disabled=true; totals(); setStep(1);
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
      const h=(ev)=>openModal(ev);
      el.addEventListener("click",h,{capture:true});
      el.addEventListener("touchstart",h,{capture:true, passive:false});
      el.addEventListener("touchend",h,{capture:true, passive:false});
      el.addEventListener("pointerup",h,{capture:true});
      el.__bound=true;
    });
  }
  bindCTAs();
  new MutationObserver(bindCTAs).observe(document.documentElement,{subtree:true,childList:true,attributes:true});

  // Document-level safety net
  function trap(ev){
    const t = ev.target.closest?.(CTA_SEL);
    if (t){ openModal(ev); }
  }
  document.addEventListener("touchstart",trap,{capture:true,passive:false});
  document.addEventListener("touchend",trap,{capture:true,passive:false});
  document.addEventListener("pointerup",trap,{capture:true});
  document.addEventListener("click",trap,{capture:true});

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

  // Step 2
  step2 && step2.addEventListener("click",(e)=>{
    if(e.target.closest(".qty-inc")){ qty=Math.min(99,qty+1); totals(); return; }
    if(e.target.closest(".qty-dec")){ qty=Math.max(1, qty-1); totals(); return; }
    const btn=e.target.closest(".co-method"); if(!btn) return;
    step2.querySelectorAll(".co-method").forEach(b=>b.removeAttribute("aria-selected"));
    btn.setAttribute("aria-selected","true");
    method = btn.dataset.method || "card";
    discount = parseFloat(btn.dataset.discount || "0") || 0;
    toStep3 && (toStep3.disabled=false);
    totals();
  });
  step2 && step2.addEventListener("input",(e)=>{
    if (e.target.id!=="coQty") return;
    const v=e.target.value.replace(/[^0-9]/g,"");
    qty = Math.max(1, Math.min(99, parseInt(v||"1",10)));
    e.target.value = String(qty); totals();
  });
  toStep3 && toStep3.addEventListener("click",(e)=>{
    e.preventDefault(); if(!method) return; renderPay(method); setStep(3);
  });
  back1 && back1.addEventListener("click",()=>setStep(1));
  back2 && back2.addEventListener("click",()=>setStep(2));

  // Step 3
  function renderPay(m){
    const txt=(t)=>`<div class="altpay"><h4>${t[0]}</h4><p>${t[1]}</p></div>`;
    const map={
      card:`<fieldset class="cardset"><legend>Card details</legend>
              <label>Card number<input type="text" inputmode="numeric" placeholder="4242 4242 4242 4242"></label>
              <div class="co-row">
                <label>Expiry<input inputmode="numeric" placeholder="MM/YY"></label>
                <label>CVC<input inputmode="numeric" maxlength="4"></label>
                <label>ZIP<input inputmode="numeric" maxlength="5"></label>
              </div>
            </fieldset>`,
      venmo:txt(["Venmo","Send to @YourHandle — 10% off applied"]),
      cashapp:txt(["Cash App","Send to $YourCashtag — 10% off applied"]),
      paypal:txt(["PayPal","Redirect to PayPal — 10% off applied"]),
      crypto:txt(["Crypto","BTC/ETH/USDC — 15% off applied; address next"])
    };
    payWrap.innerHTML = map[m] || map.card;
  }
  submit && submit.addEventListener("click",(e)=>{
    e.preventDefault();
    if (!tos?.checked){ tos?.focus(); return; }
    hide(step3); show(success);
  });

  // initial
  priceWas && (priceWas.textContent="$90");
  priceNow && (priceNow.textContent="$45");
  totals();
})();
