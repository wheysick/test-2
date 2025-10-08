/* ===== checkout3.js v5.0 — Instant mobile open, consistent steps, premium totals ===== */
(function(){
  "use strict";

  const modal    = document.getElementById("checkoutModal");
  if (!modal) return;

  const step1    = document.getElementById("coStep1");
  const step2    = document.getElementById("coStep2");
  const step3    = document.getElementById("coStep3");

  const toStep3  = document.getElementById("coToStep3");
  const back1    = document.getElementById("coBackTo1");
  const back2    = document.getElementById("coBackTo2");

  const qtyInput = document.getElementById("coQty");
  const payWrap  = document.getElementById("coPayWrap");
  const tos      = document.getElementById("coTos");
  const submit   = document.getElementById("coSubmit");
  const closeX   = document.getElementById("checkoutClose");
  const success  = document.getElementById("checkoutSuccess");

  // Visual price row (Step 2) — keep the *display* $90 $45 while charging $90/bottle
  const priceWas = step2.querySelector(".co-price .was");
  const priceNow = step2.querySelector(".co-price .now");

  /* ---------- Business logic ---------- */
  const MSRP      = 90;  // compare-at (visual only)
  const DISPLAY   = 45;  // visual "now"
  const SALE      = 90;  // actual price per paid bottle
  const TAX_RATE  = 0.0875;
  const SHIPPING  = 0;

  let qty = 1, method = null, discountPct = 0;

  /* ---------- Utils ---------- */
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => `$${n.toFixed(2)}`;
  const show = (el) => { if(el){ el.hidden = false; el.setAttribute("aria-hidden","false"); } };
  const hide = (el) => { if(el){ el.hidden = true;  el.setAttribute("aria-hidden","true");  } };

  function setStep(n){
    if (n===1){ show(step1); hide(step2); hide(step3); focusFirst(step1); }
    if (n===2){ hide(step1); show(step2); hide(step3); }
    if (n===3){ hide(step1); hide(step2); show(step3); focusFirst(step3); }
  }
  function focusFirst(scope){
    const el = scope?.querySelector("input,button,select,textarea");
    el && el.focus({preventScroll:true});
  }

  function computeTotals(){
    const free     = qty;               // 1:1 free
    const merch    = qty * SALE;        // charge real price
    const disc     = merch * (discountPct/100);
    const taxable  = Math.max(0, merch - disc);
    const tax      = taxable * TAX_RATE;
    const total    = taxable + tax + SHIPPING;

    const set = (id, val) => { const n = $(id); if (n) n.textContent = val; };

    set("coFreeQty", String(free));
    set("coItemsLine", `${qty + free} bottles (${qty} paid + ${free} free)`);
    set("coMerch", fmt(merch));
    set("coDisc", disc>0 ? `-${fmt(disc)}` : "$0.00");
    set("coTax",  fmt(tax));
    set("coTotal",fmt(total));
    const shipText = step2.querySelector(".co-free-ship"); if (shipText) shipText.textContent = SHIPPING===0 ? "FREE" : fmt(SHIPPING);

    if (qtyInput) qtyInput.value = String(qty);
  }

  /* ---------- Open / Close with bulletproof mobile binding ---------- */
  const CTA_SEL = ".floating-cta,[data-cta],[data-open-checkout],.open-checkout,.cta,a[href='#offer'],a[href*='#offer'],a[href*='#checkout']";
  let openGuard = 0;

  function openModal(ev){
    const now = Date.now(); if (now - openGuard < 300) return; // de-bounce double fire
    openGuard = now;

    ev?.preventDefault?.(); ev?.stopPropagation?.();
    modal.classList.add("show","co-fullscreen");
    document.documentElement.setAttribute("data-checkout-open","1");
    document.body.style.overflow="hidden";

    // paint visual price
    if (priceWas) priceWas.textContent = fmt(MSRP);
    if (priceNow) priceNow.textContent = fmt(DISPLAY);

    qty = 1; discountPct = 0; method = null;
    if (qtyInput) qtyInput.value = "1";
    if (toStep3) toStep3.disabled = true;

    setStep(1);
    computeTotals();
  }
  function closeModal(ev){
    ev?.preventDefault?.(); ev?.stopPropagation?.();
    modal.classList.remove("show","co-fullscreen");
    document.documentElement.removeAttribute("data-checkout-open");
    document.body.style.overflow="";
  }

  // Expose for inline fallback
  window.checkoutOpen = openModal;
  window.checkoutClose = closeModal;

  function bindCTAs(){
    document.querySelectorAll(CTA_SEL).forEach(el=>{
      if (el.__boundCheckout) return;
      const h = (e)=>openModal(e);
      // Capture & non-passive so nothing swallows it on mobile
      el.addEventListener("click", h, {capture:true});
      el.addEventListener("touchend", h, {capture:true, passive:false});
      el.addEventListener("pointerup", h, {capture:true});
      el.__boundCheckout = true;
    });
  }
  bindCTAs();
  new MutationObserver(bindCTAs).observe(document.documentElement,{subtree:true,childList:true,attributes:true});

  // Document-level trap (last resort for aggressive frameworks)
  function docTrap(e){
    const t = e.target.closest?.(CTA_SEL);
    if (t){ openModal(e); }
  }
  document.addEventListener("touchend", docTrap, {capture:true, passive:false});
  document.addEventListener("pointerup", docTrap, {capture:true});
  document.addEventListener("click", docTrap, {capture:true});

  // Close controls
  closeX && closeX.addEventListener("click", closeModal);
  modal.addEventListener("click", (e)=>{ if (e.target === modal) closeModal(e); });
  document.addEventListener("keydown", (e)=>{ if (e.key === "Escape" && modal.classList.contains("show")) closeModal(e); });

  /* ---------- Step 1 ---------- */
  step1 && step1.addEventListener("submit",(e)=>{
    e.preventDefault();
    const req = ["name","email","address"].map(n=>step1.querySelector(`[name='${n}']`));
    const ok  = req.every(i=>i && i.value.trim());
    req.forEach(i => i && (i.style.borderColor = i.value.trim() ? "" : "#ff5a6e"));
    if (!ok) return;
    setStep(2);
    computeTotals();
  });

  /* ---------- Step 2 ---------- */
  step2 && step2.addEventListener("click",(e)=>{
    if (e.target.closest(".qty-inc")) { qty = Math.min(99, qty+1); computeTotals(); return; }
    if (e.target.closest(".qty-dec")) { qty = Math.max(1,  qty-1); computeTotals(); return; }

    const btn = e.target.closest(".co-method");
    if (!btn) return;
    step2.querySelectorAll(".co-method").forEach(b=>b.removeAttribute("aria-selected"));
    btn.setAttribute("aria-selected","true");
    method = btn.dataset.method || "card";
    discountPct = parseFloat(btn.dataset.discount || "0") || 0;
    if (toStep3) toStep3.disabled = false;
    computeTotals();
  });

  step2 && step2.addEventListener("input",(e)=>{
    if (e.target.id !== "coQty") return;
    const v = e.target.value.replace(/[^0-9]/g,"");
    qty = Math.max(1, Math.min(99, parseInt(v || "1", 10)));
    e.target.value = String(qty);
    computeTotals();
  });

  toStep3 && toStep3.addEventListener("click",(e)=>{
    e.preventDefault();
    if (!method) return;
    renderPay(method);
    setStep(3);
  });

  back1 && back1.addEventListener("click",()=>setStep(1));
  back2 && back2.addEventListener("click",()=>setStep(2));

  /* ---------- Step 3 renderer ---------- */
  function renderPay(m){
    const txt = (t)=>`<div class="altpay"><h4>${t[0]}</h4><p>${t[1]}</p></div>`;
    const map = {
      card:`<fieldset class="cardset"><legend>Card details</legend>
              <label>Card number<input type="text" inputmode="numeric" placeholder="4242 4242 4242 4242"></label>
              <div class="co-row">
                <label>Expiry<input inputmode="numeric" placeholder="MM/YY"></label>
                <label>CVC<input inputmode="numeric" maxlength="4"></label>
                <label>ZIP<input inputmode="numeric" maxlength="5"></label>
              </div>
            </fieldset>`,
      venmo:  txt(["Venmo","Send to @YourHandle — 10% off applied"]),
      cashapp:txt(["Cash App","Send to $YourCashtag — 10% off applied"]),
      paypal: txt(["PayPal","Redirect to PayPal — 10% off applied"]),
      crypto: txt(["Crypto","BTC/ETH/USDC — 15% off applied; address next"])
    };
    payWrap.innerHTML = map[m] || map.card;
  }

  /* ---------- Step 3 submit (demo) ---------- */
  submit && submit.addEventListener("click",(e)=>{
    e.preventDefault();
    if (!tos?.checked){ tos?.focus(); return; }
    hide(step3);
    show(success);
  });

  // initial paint
  if (priceWas) priceWas.textContent = "$90";
  if (priceNow) priceNow.textContent = "$45";
  computeTotals();
})();
