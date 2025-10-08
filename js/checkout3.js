/* ===== checkout3.js v3.6 — bulletproof open/close + premium checkout ===== */
(function () {
  "use strict";

  // ------- DOM
  const modal   = document.getElementById("checkoutModal");
  if (!modal) return;

  const panel   = modal.querySelector(".co-panel");
  const step1   = document.getElementById("coStep1");
  const step2   = document.getElementById("coStep2");
  const step3   = document.getElementById("coStep3");
  const steps   = document.querySelectorAll(".co-step");

  const toStep3 = document.getElementById("coToStep3");
  const back1   = document.getElementById("coBackTo1");
  const back2   = document.getElementById("coBackTo2");
  const payWrap = document.getElementById("coPayWrap");
  const submit  = document.getElementById("coSubmit");
  const tos     = document.getElementById("coTos");
  const closeBtn= document.getElementById("checkoutClose");

  // ------- Pricing
  const MSRP = 90, SALE = 90, TAX = 0.0875, SHIPPING = 0;
  let qty = 1, discount = 0, method = null;

  // ------- Utils
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => `$${n.toFixed(2)}`;
  const show = (el,on=true)=>{ if(el){ el.hidden=!on; el.setAttribute("aria-hidden", String(!on)); } };
  const setActive = (n)=> steps.forEach(s => s.classList.toggle("is-active", s.dataset.step == String(n)));

  // ------- Open / Close (exported + hardened)
  function openModal(e){
    e?.preventDefault?.(); e?.stopPropagation?.();
    modal.classList.add("show","co-fullscreen");
    document.documentElement.setAttribute("data-checkout-open","1");
    document.body.style.overflow="hidden";
    setActive(1); show(step1,true); show(step2,false); show(step3,false);
    updateTotals();
  }
  function closeModal(e){
    e?.preventDefault?.(); e?.stopPropagation?.();
    modal.classList.remove("show","co-fullscreen");
    document.documentElement.removeAttribute("data-checkout-open");
    document.body.style.overflow="";
  }
  window.checkoutOpen = openModal;   // you can call this anywhere
  window.checkoutClose = closeModal;

  // ------- Bulletproof CTA binding (desktop + mobile)
  const CTA_SEL = [
    ".open-checkout","[data-open-checkout]","[data-cta]",
    "a[href='#offer']","a[href*='#offer']","a[href*='#checkout']",
    ".floating-cta","#floatingCta",".cta"
  ].join(",");

  function bindCTAs(){
    document.querySelectorAll(CTA_SEL).forEach(el=>{
      if (el.__boundCheckout) return;
      const h = (ev)=>{ openModal(ev); };
      el.addEventListener("click", h, {capture:true});
      el.addEventListener("touchend", h, {capture:true, passive:false});
      el.addEventListener("pointerup", h, {capture:true});
      el.__boundCheckout = true;
    });
  }
  bindCTAs();
  new MutationObserver(bindCTAs).observe(document.documentElement,{subtree:true,childList:true,attributes:true});

  // Safety: document-level catch-all (last resort for mobile frameworks swallowing events)
  function docTrap(ev){
    const t = ev.target.closest && ev.target.closest(CTA_SEL);
    if (t){ ev.preventDefault(); ev.stopPropagation(); openModal(); }
  }
  document.addEventListener("touchend", docTrap, {capture:true, passive:false});
  document.addEventListener("pointerup", docTrap, {capture:true});
  document.addEventListener("click", docTrap, {capture:true});

  // Close interactions
  closeBtn && closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e)=>{ if (e.target === modal) closeModal(e); });
  document.addEventListener("keydown", (e)=>{ if (e.key === "Escape" && modal.classList.contains("show")) closeModal(e); });

  // ------- Totals
  function updateTotals(){
    const free    = qty;
    const merch   = qty * SALE;
    const disc    = merch * (discount/100);
    const taxable = Math.max(0, merch - disc);
    const tax     = taxable * TAX;
    const total   = taxable + tax + SHIPPING;

    const set = (id, v) => { const n = $(id); if (n) n.textContent = v; };

    set("coPerNow", fmt(SALE));     // keep it simple and honest
    set("coItemsLine", `${qty + free} bottles (${qty} paid + ${free} free)`);
    set("coMerch", fmt(merch));
    set("coDisc", disc>0 ? `-${fmt(disc)}` : "$0.00");
    set("coTax", fmt(tax));
    set("coShip", SHIPPING===0 ? "FREE" : fmt(SHIPPING));
    set("coTotal", fmt(total));
    const q = $("coQty"); if (q) q.value = String(qty);
  }

  // ------- Step 1 → 2
  step1 && step1.addEventListener("submit", (e)=>{
    e.preventDefault();
    const req = ["name","email","address"].map(f=>step1.querySelector(`[name='${f}']`));
    const ok  = req.every(i=>!!i && !!i.value.trim());
    req.forEach(i=> i && (i.style.borderColor = i.value.trim() ? "" : "#ff5a6e"));
    if(!ok) return;

    setActive(2); show(step1,false); show(step2,true); show(step3,false);
    qty = 1; discount = 0; updateTotals();
  });

  // ------- Step 2 (qty + method)
  step2 && step2.addEventListener("click",(e)=>{
    if (e.target.closest(".qty-inc")){ qty = Math.min(99, qty+1); updateTotals(); return; }
    if (e.target.closest(".qty-dec")){ qty = Math.max(1,  qty-1); updateTotals(); return; }

    const btn = e.target.closest(".co-method");
    if (!btn) return;
    step2.querySelectorAll(".co-method").forEach(b=>b.removeAttribute("aria-selected"));
    btn.setAttribute("aria-selected","true");
    method   = btn.dataset.method || "card";
    discount = parseFloat(btn.dataset.discount || "0") || 0;
    updateTotals();
  });

  // Step 2 → 3
  toStep3 && toStep3.addEventListener("click",(e)=>{
    e.preventDefault();
    if (!method) return;
    renderPay(method);
    setActive(3); show(step2,false); show(step3,true);
  });

  // Back
  back1 && back1.addEventListener("click",()=>{ setActive(1); show(step1,true);  show(step2,false); show(step3,false); });
  back2 && back2.addEventListener("click",()=>{ setActive(2); show(step1,false); show(step2,true);  show(step3,false); });

  // ------- Step 3 renderer (clean)
  function renderPay(m){
    const txt = (h)=>`<div class="altpay"><h4>${h[0]}</h4><p>${h[1]}</p></div>`;
    const map = {
      card:`<fieldset class="cardset"><legend>Card details</legend>
              <label>Card number<input type="text" inputmode="numeric" placeholder="4242 4242 4242 4242"></label>
              <div class="co-row">
                <label>Expiry<input placeholder="MM/YY" inputmode="numeric"></label>
                <label>CVC<input maxlength="4" inputmode="numeric"></label>
                <label>ZIP<input maxlength="5" inputmode="numeric"></label>
              </div>
            </fieldset>`,
      venmo:  txt(["Venmo","Send to @YourHandle — 10% off applied"]),
      cashapp:txt(["Cash App","Send to $YourCashtag — 10% off applied"]),
      paypal: txt(["PayPal","Redirect to PayPal — 10% off applied"]),
      crypto: txt(["Crypto","BTC/ETH/USDC — 15% off applied; address next"])
    };
    payWrap.innerHTML = map[m] || map.card;
  }

  // Submit (demo)
  submit && submit.addEventListener("click",(e)=>{
    e.preventDefault();
    if (!tos?.checked){ tos?.focus(); return; }
    step3.hidden = true;
    $("checkoutSuccess")?.removeAttribute("hidden");
  });

  // Prepaint
  updateTotals();
})();
