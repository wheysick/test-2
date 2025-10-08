/* ===== checkout3.js v3.3 — minimal, working, fullscreen checkout ===== */
(function () {
  "use strict";

  // ----- DOM
  const modal   = document.getElementById("checkoutModal");
  if (!modal) return;

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

  // ----- Pricing
  const MSRP = 90, SALE = 90, TAX = 0.0875, SHIPPING = 0;
  let qty = 1, discount = 0, method = null;

  // ----- Utils
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => `$${n.toFixed(2)}`;
  const show = (el, on = true) => { if (el) { el.hidden = !on; el.setAttribute("aria-hidden", String(!on)); } };
  const setActive = (n) => steps.forEach(s => s.classList.toggle("is-active", String(n) === s.dataset.step));

  // ----- CTAs (broad but safe)
  const CTA_SEL = [
    "#floatingCta",
    ".floating-cta",
    ".open-checkout",
    "[data-open-checkout]",
    "[data-cta]",
    "button[data-cta]",
    "a[href='#offer']",
    "a[href*='#offer']",
    "a[href*='#checkout']",
    ".cta"
  ].join(",");

  function toggleCTAs(hide) {
    document.querySelectorAll(CTA_SEL).forEach(el => {
      if (hide) {
        if (el.__prevDisplay === undefined) el.__prevDisplay = getComputedStyle(el).display || "";
        el.style.display = "none";
        el.setAttribute("aria-hidden", "true");
      } else {
        el.style.display = el.__prevDisplay || "";
        el.removeAttribute("aria-hidden");
        delete el.__prevDisplay;
      }
    });
  }

  function computeTotals() {
    const free      = qty;
    const merch     = qty * SALE;
    const disc      = merch * (discount / 100);
    const taxable   = Math.max(0, merch - disc);
    const tax       = taxable * TAX;
    const total     = taxable + tax + SHIPPING;

    const set = (id, v) => { const n = $(id); if (n) n.textContent = v; };

    set("coPerWas", fmt(MSRP));
    set("coPerNow", fmt(SALE));
    const q = $("coQty"); if (q) q.value = String(qty);

    set("coItemsLine", `${qty + free} bottles (${qty} paid + ${free} free)`);
    set("coMerch", fmt(merch));
    set("coDisc", disc > 0 ? `-${fmt(disc)}` : "$0.00");
    set("coTax", fmt(tax));
    set("coShip", SHIPPING === 0 ? "FREE" : fmt(SHIPPING));
    set("coTotal", fmt(total));
  }

  // ----- Open / Close (EXPORTED for quick test)
  function openModal(e) {
    if (e && e.preventDefault) { e.preventDefault(); e.stopPropagation(); }
    modal.classList.add("show", "co-fullscreen");
    document.body.style.overflow = "hidden";
    document.documentElement.setAttribute("data-checkout-open", "1");
    toggleCTAs(true);

    setActive(1);
    show(step1, true); show(step2, false); show(step3, false);
    computeTotals();
  }
  function closeModal() {
    modal.classList.remove("show", "co-fullscreen");
    document.body.style.overflow = "";
    document.documentElement.removeAttribute("data-checkout-open");
    toggleCTAs(false);
  }
  window.checkoutOpen = openModal;
  window.checkoutClose = closeModal;

  // Bind CTAs (supports late DOM)
  function bindCTAs() {
    document.querySelectorAll(CTA_SEL).forEach(el => {
      if (el.__boundCheckout) return;
      el.addEventListener("click", openModal, { capture: true });
      el.addEventListener("touchstart", openModal, { capture: true });
      el.__boundCheckout = true;
    });
  }
  bindCTAs();
  new MutationObserver(bindCTAs).observe(document.documentElement, { childList: true, subtree: true });

  // Close controls
  closeBtn && closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("show")) closeModal(); });

  // ----- Step 1 → Step 2
  step1 && step1.addEventListener("submit", (e) => {
    e.preventDefault();
    const req = ["name", "email", "address"].map(f => step1.querySelector(`[name='${f}']`));
    const ok  = req.every(i => !!i && !!i.value.trim());
    req.forEach(i => i && (i.style.borderColor = i.value.trim() ? "" : "#ff4f4f"));
    if (!ok) return;

    setActive(2);
    show(step1, false); show(step2, true); show(step3, false);
    qty = 1; discount = 0; computeTotals();
  });

  // ----- Step 2 (qty & payment method)
  step2 && step2.addEventListener("click", (e) => {
    if (e.target.closest(".qty-inc")) { qty = Math.min(99, qty + 1); $("coQty") && ($("coQty").value = qty); computeTotals(); return; }
    if (e.target.closest(".qty-dec")) { qty = Math.max(1, qty - 1); $("coQty") && ($("coQty").value = qty); computeTotals(); return; }

    const btn = e.target.closest(".co-method");
    if (!btn) return;
    step2.querySelectorAll(".co-method").forEach(b => b.removeAttribute("aria-selected"));
    btn.setAttribute("aria-selected", "true");
    method = btn.dataset.method || "card";
    discount = parseFloat(btn.dataset.discount || "0") || 0;
    computeTotals();
  });

  // Step 2 → 3
  toStep3 && toStep3.addEventListener("click", (e) => {
    e.preventDefault();
    if (!method) return;
    renderPay(method);
    setActive(3);
    show(step2, false); show(step3, true);
  });

  // Back buttons
  back1 && back1.addEventListener("click", () => { setActive(1); show(step1, true); show(step2, false); show(step3, false); });
  back2 && back2.addEventListener("click", () => { setActive(2); show(step1, false); show(step2, true); show(step3, false); });

  // ----- Step 3 renderer
  function renderPay(m) {
    const txt = (t) => `<div class="altpay"><h4>${t[0]}</h4><p>${t[1]}</p></div>`;
    const map = {
      card: `<fieldset class="cardset"><legend>Card details</legend>
                <label>Card number<input type="text" placeholder="4242 4242 4242 4242"></label>
                <div class="co-row">
                  <label>Expiry<input placeholder="MM/YY"></label>
                  <label>CVC<input maxlength="4"></label>
                  <label>ZIP<input maxlength="5"></label>
                </div>
             </fieldset>`,
      venmo:  txt(["Venmo",  "Send to @YourHandle — 10% off applied"]),
      cashapp:txt(["Cash App","Send to $YourCashtag — 10% off applied"]),
      paypal: txt(["PayPal", "Redirect to PayPal — 10% off applied"]),
      crypto: txt(["Crypto", "BTC/ETH/USDC — 15% off applied; address next"])
    };
    payWrap.innerHTML = map[m] || map.card;
  }

  // Submit (demo)
  submit && submit.addEventListener("click", (e) => {
    e.preventDefault();
    if (!tos?.checked) { tos.focus(); return; }
    step3.hidden = true;
    $("checkoutSuccess") && $("checkoutSuccess").removeAttribute("hidden");
  });

  computeTotals();
})();
