/* ===== checkout3.js v4.0 — matches provided HTML exactly (desktop + mobile solid) ===== */
(function () {
  "use strict";

  // ----- DOM hooks (your exact markup)
  const modal   = document.getElementById("checkoutModal");
  if (!modal) return;

  const step1   = document.getElementById("coStep1");
  const step2   = document.getElementById("coStep2");
  const step3   = document.getElementById("coStep3");

  const toStep3 = document.getElementById("coToStep3");
  const back1   = document.getElementById("coBackTo1");
  const back2   = document.getElementById("coBackTo2");

  const qtyInput= document.getElementById("coQty");
  const payWrap = document.getElementById("coPayWrap");
  const tos     = document.getElementById("coTos");
  const submit  = document.getElementById("coSubmit");
  const closeX  = document.getElementById("checkoutClose");
  const success = document.getElementById("checkoutSuccess");
  const successClose = document.getElementById("successClose");

  // price row in your HTML (Step 2)
  const priceWasEl = step2.querySelector(".co-price .was");
  const priceNowEl = step2.querySelector(".co-price .now");

  // ----- Pricing (logic vs. display)
  const MSRP        = 90;  // compare-at (was)
  const DISPLAY_NOW = 45;  // what you show under "$90 $45 / bottle" (purely visual)
  const SALE        = 90;  // what they actually pay per paid bottle
  const TAX_RATE    = 0.0875;
  const SHIPPING    = 0;

  // ----- State
  let qty = 1;
  let method = null;       // "card" | "venmo" | "cashapp" | "paypal" | "crypto"
  let discountPct = 0;     // 0 | 10 | 15

  // ----- Helpers
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => `$${n.toFixed(2)}`;
  const hide = (el) => { if (el) { el.hidden = true; el.setAttribute("aria-hidden","true"); } };
  const show = (el) => { if (el) { el.hidden = false; el.setAttribute("aria-hidden","false"); } };

  function setStep(n) {
    if (n === 1) { show(step1); hide(step2); hide(step3); }
    if (n === 2) { hide(step1); show(step2); hide(step3); }
    if (n === 3) { hide(step1); hide(step2); show(step3); }
  }

  // ----- Totals
  function computeTotals() {
    const free = qty;                          // free mirrors qty
    const merch = qty * SALE;                  // charged per paid bottle
    const disc = merch * (discountPct / 100);
    const taxable = Math.max(0, merch - disc);
    const tax = taxable * TAX_RATE;
    const total = taxable + tax + SHIPPING;

    // Step-2 “You get X FREE”
    const freeEl = $("coFreeQty");
    if (freeEl) freeEl.textContent = String(free);

    // Items line + money lines
    const setText = (id, text) => { const n = $(id); if (n) n.textContent = text; };
    setText("coItemsLine", `${qty + free} bottles (${qty} paid + ${free} free)`);
    setText("coMerch", fmt(merch));
    setText("coDisc", disc > 0 ? `-${fmt(disc)}` : "$0.00");
    setText("coTax", fmt(tax));
    setText("coTotal", fmt(total));

    const shipEl = $("coTaxLabel"); // label exists; shipping value is static "FREE" element in your HTML
    if (shipEl) shipEl.textContent = "Tax";
  }

  // ----- Open / Close (robust desktop + mobile)
  const CTA_SEL = ".floating-cta,[data-cta],[data-open-checkout],.open-checkout,.cta,a[href='#offer'],a[href*='#offer'],a[href*='#checkout']";

  function openModal(e) {
    if (e) { e.preventDefault?.(); e.stopPropagation?.(); }
    modal.classList.add("show","co-fullscreen");
    document.documentElement.setAttribute("data-checkout-open","1");
    document.body.style.overflow = "hidden";
    // paint the price row to what you want to show
    if (priceWasEl) priceWasEl.textContent = fmt(MSRP);
    if (priceNowEl) priceNowEl.textContent = fmt(DISPLAY_NOW);
    qty = 1; if (qtyInput) qtyInput.value = "1";
    method = null; discountPct = 0; toStep3 && (toStep3.disabled = true);
    setStep(1);
    computeTotals();
  }
  function closeModal(e) {
    if (e) { e.preventDefault?.(); e.stopPropagation?.(); }
    modal.classList.remove("show","co-fullscreen");
    document.documentElement.removeAttribute("data-checkout-open");
    document.body.style.overflow = "";
  }
  window.checkoutOpen = openModal;
  window.checkoutClose = closeModal;

  function bindCTAs() {
    document.querySelectorAll(CTA_SEL).forEach(el => {
      if (el.__boundCheckout) return;
      const h = (ev)=>openModal(ev);
      el.addEventListener("click", h, {capture:true});
      el.addEventListener("touchend", h, {capture:true, passive:false});
      el.addEventListener("pointerup", h, {capture:true});
      el.__boundCheckout = true;
    });
  }
  bindCTAs();
  new MutationObserver(bindCTAs).observe(document.documentElement, {subtree:true, childList:true, attributes:true});

  // backdrops / esc / close
  closeX && closeX.addEventListener("click", closeModal);
  modal.addEventListener("click", (e)=>{ if (e.target === modal) closeModal(e); });
  document.addEventListener("keydown", (e)=>{ if (e.key === "Escape" && modal.classList.contains("show")) closeModal(e); });

  // ----- Step 1 → Step 2
  step1 && step1.addEventListener("submit", (e) => {
    e.preventDefault();
    // simple requireds: name, email, address
    const req = ["name","email","address"].map(n => step1.querySelector(`[name='${n}']`));
    const ok = req.every(i => !!i && !!i.value.trim());
    req.forEach(i => i && (i.style.borderColor = i.value.trim() ? "" : "#ff4f4f"));
    if (!ok) return;
    setStep(2);
    computeTotals();
  });

  // ----- Step 2 (qty + method)
  step2 && step2.addEventListener("click", (e) => {
    if (e.target.closest(".qty-inc")) {
      qty = Math.min(99, (parseInt(qtyInput?.value || "1", 10) || 1) + 1);
      if (qtyInput) qtyInput.value = String(qty);
      computeTotals();
      return;
    }
    if (e.target.closest(".qty-dec")) {
      qty = Math.max(1, (parseInt(qtyInput?.value || "1", 10) || 1) - 1);
      if (qtyInput) qtyInput.value = String(qty);
      computeTotals();
      return;
    }

    const btn = e.target.closest(".co-method");
    if (!btn) return;

    step2.querySelectorAll(".co-method").forEach(b => b.removeAttribute("aria-selected"));
    btn.setAttribute("aria-selected","true");

    method = btn.dataset.method || "card";
    discountPct = parseFloat(btn.dataset.discount || "0") || 0;
    if (toStep3) toStep3.disabled = false;

    computeTotals();
  });

  // manual qty typing
  step2 && step2.addEventListener("input", (e) => {
    if (e.target.id !== "coQty") return;
    const v = e.target.value.replace(/[^0-9]/g, "");
    qty = Math.max(1, Math.min(99, parseInt(v || "1", 10)));
    e.target.value = String(qty);
    computeTotals();
  });

  // Step 2 → Step 3
  toStep3 && toStep3.addEventListener("click", (e) => {
    e.preventDefault();
    if (!method) return;
    renderPay(method);
    setStep(3);
  });

  // Back buttons
  back1 && back1.addEventListener("click", () => setStep(1));
  back2 && back2.addEventListener("click", () => setStep(2));

  // ----- Step 3 renderer (uses your container #coPayWrap)
  function renderPay(m) {
    const txt = (t) => `<div class="altpay"><h4>${t[0]}</h4><p>${t[1]}</p></div>`;
    const map = {
      card: `<fieldset class="cardset"><legend>Card details</legend>
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

  // Submit demo
  submit && submit.addEventListener("click", (e) => {
    e.preventDefault();
    if (!tos?.checked) { tos?.focus(); return; }
    hide(step3);
    show(success);
  });
  successClose && successClose.addEventListener("click", (e)=>{ e.preventDefault(); closeModal(); });

})();
