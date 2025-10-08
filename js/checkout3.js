/* ===== checkout3.js v3.2 — Final polished fullscreen checkout ===== */
(function(){
  const modal = document.getElementById("checkoutModal");
  if(!modal) return;

  // Elements
  const step1 = document.getElementById("coStep1");
  const step2 = document.getElementById("coStep2");
  const step3 = document.getElementById("coStep3");
  const steps = document.querySelectorAll(".co-step");
  const toStep3 = document.getElementById("coToStep3");
  const back1 = document.getElementById("coBackTo1");
  const back2 = document.getElementById("coBackTo2");
  const payWrap = document.getElementById("coPayWrap");
  const submit = document.getElementById("coSubmit");
  const tos = document.getElementById("coTos");
  const closeBtn = document.getElementById("checkoutClose");

  // Pricing constants
  const MSRP = 90, SALE = 90, TAX = 0.0875, SHIPPING = 0;
  let qty = 1, discount = 0, method = null;

  const $ = id => document.getElementById(id);
  const fmt = n => `$${n.toFixed(2)}`;
  const show = (el,on=true)=>{ if(el){ el.hidden=!on; el.setAttribute("aria-hidden",String(!on)); }};
  const setActive = n => steps.forEach(s=>s.classList.toggle("is-active", s.dataset.step == n));

  /* ---------- CTA open/close ---------- */
  const CTA_SEL = "#floatingCta, .floating-cta, [data-cta], .cta, a[href='#offer'], button[data-cta], .open-checkout";
  function toggleCTAs(hide){
    document.querySelectorAll(CTA_SEL).forEach(el=>{
      if(hide){
        el.__prevDisplay = getComputedStyle(el).display || "";
        el.style.display = "none";
      } else {
        el.style.display = el.__prevDisplay || "";
      }
    });
  }

  function openModal(e){
    if(e){ e.preventDefault(); e.stopPropagation(); }
    modal.classList.add("show","co-fullscreen");
    document.body.style.overflow="hidden";
    document.documentElement.setAttribute("data-checkout-open","1");
    toggleCTAs(true);
    setActive(1);
    show(step1,true); show(step2,false); show(step3,false);
  }

  function closeModal(){
    modal.classList.remove("show","co-fullscreen");
    document.body.style.overflow="";
    document.documentElement.removeAttribute("data-checkout-open");
    toggleCTAs(false);
  }

  // Bind CTAs (works with late-loaded)
  const bindTriggers = ()=>{
    document.querySelectorAll(CTA_SEL).forEach(el=>{
      if(el.__bound) return;
      ["click","touchstart"].forEach(evt=>el.addEventListener(evt, openModal, {passive:false}));
      el.__bound = true;
    });
  };
  bindTriggers();
  new MutationObserver(bindTriggers).observe(document.documentElement,{subtree:true,childList:true});

  closeBtn?.addEventListener("click", closeModal);
  modal.addEventListener("click", e=>{ if(e.target===modal) closeModal(); });
  document.addEventListener("keydown", e=>{ if(e.key==="Escape" && modal.classList.contains("show")) closeModal(); });

  /* ---------- Totals ---------- */
  function updateTotals(){
    const free = qty, merch = qty*SALE, disc = merch*(discount/100);
    const taxable = merch - disc, tax = taxable*TAX, total = taxable + tax + SHIPPING;
    $("coPerWas")?.textContent = fmt(MSRP);
    $("coPerNow")?.textContent = fmt(SALE);
    $("coItemsLine")?.textContent = `${qty+free} bottles (${qty} paid + ${free} free)`;
    $("coMerch")?.textContent = fmt(merch);
    $("coDisc")?.textContent = disc>0 ? `-${fmt(disc)}` : "$0.00";
    $("coTax")?.textContent = fmt(tax);
    $("coShip")?.textContent = SHIPPING===0 ? "FREE" : fmt(SHIPPING);
    $("coTotal")?.textContent = fmt(total);
  }

  /* ---------- Step 1 ---------- */
  step1?.addEventListener("submit", e=>{
    e.preventDefault();
    const req = ["name","email","address"].map(f=>step1.querySelector(`[name='${f}']`));
    const ok = req.every(i=>!!i?.value.trim());
    req.forEach(i=>i && (i.style.borderColor = i.value.trim() ? "" : "#ff4f4f"));
    if(!ok) return;
    setActive(2); show(step1,false); show(step2,true); show(step3,false);
    qty=1; discount=0; updateTotals();
  });

  /* ---------- Step 2 ---------- */
  step2?.addEventListener("click", e=>{
    if(e.target.closest(".qty-inc")){ qty=Math.min(99,qty+1); $("coQty").value=qty; updateTotals(); return; }
    if(e.target.closest(".qty-dec")){ qty=Math.max(1,qty-1); $("coQty").value=qty; updateTotals(); return; }

    const btn = e.target.closest(".co-method");
    if(!btn) return;
    step2.querySelectorAll(".co-method").forEach(b=>b.removeAttribute("aria-selected"));
    btn.setAttribute("aria-selected","true");
    method = btn.dataset.method; discount = parseFloat(btn.dataset.discount || 0);
    updateTotals();
  });

  toStep3?.addEventListener("click", e=>{
    e.preventDefault();
    if(!method) return;
    renderPay(method);
    setActive(3); show(step2,false); show(step3,true);
  });

  back1?.addEventListener("click", ()=>{ setActive(1); show(step1,true); show(step2,false); });
  back2?.addEventListener("click", ()=>{ setActive(2); show(step1,false); show(step2,true); });

  /* ---------- Step 3 ---------- */
  function renderPay(m){
    const txt=(t)=>`<div class='altpay'><h4>${t[0]}</h4><p>${t[1]}</p></div>`;
    const map={
      card:`<fieldset class='cardset'><legend>Card details</legend>
              <label>Card number<input type='text' placeholder='4242 4242 4242 4242'></label>
              <div class='co-row'><label>Expiry<input placeholder='MM/YY'></label>
              <label>CVC<input maxlength='4'></label>
              <label>ZIP<input maxlength='5'></label></div>
            </fieldset>`,
      venmo:txt(["Venmo","Send to @YourHandle — 10% off applied"]),
      cashapp:txt(["Cash App","Send to $YourCashtag — 10% off applied"]),
      paypal:txt(["PayPal","Redirect to PayPal — 10% off applied"]),
      crypto:txt(["Crypto","BTC/ETH/USDC — 15% off applied; address next"])
    };
    payWrap.innerHTML = map[m] || map.card;
  }

  submit?.addEventListener("click", e=>{
    e.preventDefault();
    if(!tos?.checked){ tos.focus(); return; }
    step3.hidden=true;
    $("checkoutSuccess")?.removeAttribute("hidden");
  });

  updateTotals();
})();

/* ===== CTA OPEN HOTFIX — paste AFTER your checkout JS ===== */
(function () {
  const modal = document.getElementById('checkoutModal');
  if (!modal) return;

  // Use your existing openModal if present; otherwise minimal fallback
  function openModalPatched(e) {
    if (e) { e.preventDefault?.(); e.stopPropagation?.(); }
    if (typeof openModal === 'function') {
      return openModal(e);
    }
    // Fallback open in case openModal isn't in scope
    modal.classList.add('show', 'co-fullscreen');
    document.documentElement.setAttribute('data-checkout-open', '1');
    document.body.style.overflow = 'hidden';
  }

  function closeModalPatched() {
    if (typeof closeModal === 'function') return closeModal();
    modal.classList.remove('show', 'co-fullscreen');
    document.documentElement.removeAttribute('data-checkout-open');
    document.body.style.overflow = '';
  }

  // Expose for quick testing in console
  window.checkoutOpen = openModalPatched;
  window.checkoutClose = closeModalPatched;

  // Very broad selector coverage for CTAs
  const SEL = [
    '#floatingCta',
    '.floating-cta',
    '.open-checkout',
    '[data-open-checkout]',
    '[data-cta]',
    'button[data-cta]',
    'a[href="#offer"]',
    'a[href*="#offer"]',
    'a[href*="#checkout"]',
    '#claimCta',
    '.hero-cta',
    '.cta'
  ].join(',');

  function bind() {
    document.querySelectorAll(SEL).forEach(el => {
      if (el.__checkoutBound) return;
      ['click', 'touchstart'].forEach(ev =>
        el.addEventListener(ev, openModalPatched, { capture: true, passive: false })
      );
      el.__checkoutBound = true;
    });
  }

  // Initial + dynamic binding
  bind();
  new MutationObserver(bind).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['href', 'class', 'data-open-checkout', 'data-cta']
  });

  // Also open on hash changes like #offer / #checkout
  function hashOpen() {
    const h = (location.hash || '').toLowerCase();
    if (h === '#offer' || h === '#checkout' || h === '#claim' || h.includes('offer')) {
      openModalPatched();
    }
  }
  window.addEventListener('hashchange', hashOpen);
  hashOpen();
})();

