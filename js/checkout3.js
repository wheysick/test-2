/* ===== checkout3.js v3.0 — Fullscreen checkout • qty/free/discount/totals • robust CTA hide/restore ===== */
(function () {
  // ===== DOM hooks
  const modal      = document.getElementById('checkoutModal');
  if (!modal) return;

  const step1      = document.getElementById('coStep1');
  const step2      = document.getElementById('coStep2');
  const step3      = document.getElementById('coStep3');
  const steps      = document.querySelectorAll('.co-step');

  const toStep3Btn = document.getElementById('coToStep3');
  const back1      = document.getElementById('coBackTo1');
  const back2      = document.getElementById('coBackTo2');
  const submitBtn  = document.getElementById('coSubmit');
  const closeBtn   = document.getElementById('checkoutClose');
  const payWrap    = document.getElementById('coPayWrap');
  const tos        = document.getElementById('coTos');

  // ===== Pricing
  const MSRP     = 90;         // compare-at (display)
  const SALE     = 90;         // actual per-paid-bottle price
  const TAX_RATE = 0.0875;
  const SHIPPING = 0;

  // ===== State
  let chosenMethod = null;     // "card" | "venmo" | "cashapp" | "paypal" | "crypto"
  let qty          = 1;        // paid bottles
  let discountPct  = 0;        // 0, 10, 15

  // ===== Utilities
  const $ = (id) => document.getElementById(id);
  const show = (el, on = true) => { if(!el) return; el.hidden = !on; el.setAttribute('aria-hidden', String(!on)); };
  const setActive = (n) => steps.forEach(s => s.classList.toggle('is-active', s.dataset.step == n));
  const fmt = (n) => `$${n.toFixed(2)}`;

  // ===== CTA hide/show (robust + reversible)
  const CTA_SEL = [
    '#floatingCta', '.floating-cta', '[data-cta]', 'a[href="#offer"]',
    '.adv-cta', '.hero-cta', '.cta', '#advCta', '#claimCta', '[data-hide-on-checkout]'
  ].join(',');
  function toggleGlobalCtas(hide) {
    document.querySelectorAll(CTA_SEL).forEach(el => {
      if (hide) {
        if (el.__prevDisplay === undefined) el.__prevDisplay = getComputedStyle(el).display || '';
        el.style.display = 'none';
        el.setAttribute('aria-hidden', 'true');
      } else {
        el.style.display = el.__prevDisplay ?? '';
        el.removeAttribute('aria-hidden');
        delete el.__prevDisplay;
      }
    });
  }
  function watchdog() {
    if (!modal.classList.contains('show')) {
      document.documentElement.removeAttribute('data-checkout-open');
      toggleGlobalCtas(false);
    }
  }
  document.addEventListener('visibilitychange', watchdog);
  window.addEventListener('pageshow', watchdog);
  const wdInt = setInterval(watchdog, 1500);

  // ===== Sticky price killers (scoped & safe)
  function killStickyPrice() {
    modal.querySelectorAll('#coStickyPrice,[data-sticky="price"]').forEach(n => n.remove());
  }

  // ===== Step 2 price line (created once, shown/hidden per step)
  function ensurePriceBox() {
    let wrap = $('coPriceBox');
    if (!wrap) {
      const anchor = $('coQtyRow') || step2;
      if (!anchor) return;
      wrap = document.createElement('div');
      wrap.id = 'coPriceBox';
      wrap.className = 'co-price-line';
      wrap.innerHTML = `
        <div class="co-price">
          <span id="coPerWas" class="co-was" aria-label="Compare at"></span>
          <span id="coPerNow" class="co-now" aria-label="Current price"></span>
          <span class="co-suffix"> / bottle</span>
        </div>`;
      anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
    }
    wrap.style.display = '';
  }
  function hidePriceBox() {
    const wrap = $('coPriceBox'); if (wrap) wrap.style.display = 'none';
  }

  // ===== Totals
  function computeTotals() {
    const free     = qty;                         // mirror qty
    const merch    = qty * SALE;
    const disc     = merch * (discountPct / 100);
    const taxable  = Math.max(0, merch - disc);
    const tax      = taxable * TAX_RATE;
    const total    = taxable + tax + SHIPPING;

    $('coPerWas')    && ($('coPerWas').textContent = fmt(MSRP));
    $('coPerNow')    && ($('coPerNow').textContent = fmt(SALE));

    $('coQty')       && ($('coQty').value = String(qty));
    $('coFreeQty')   && ($('coFreeQty').textContent = String(free));
    $('coItemsLine') && ($('coItemsLine').textContent = `${qty + free} bottles (${qty} paid + ${free} free)`);

    $('coMerch')     && ($('coMerch').textContent = fmt(merch));
    $('coDisc')      && ($('coDisc').textContent  = disc > 0 ? `-${fmt(disc)}` : '$0.00');
    $('coTax')       && ($('coTax').textContent   = fmt(tax));
    $('coShip')      && ($('coShip').textContent  = SHIPPING === 0 ? 'FREE' : fmt(SHIPPING));
    $('coTotal')     && ($('coTotal').textContent = fmt(total));
  }

  // ===== Step nav visibility
  function ensureNav(stepNum) {
    const s1 = stepNum === 1, s2 = stepNum === 2, s3 = stepNum === 3;
    const vis = (el, on=true) => { if(!el) return; el.hidden = !on; el.style.display = on ? '' : 'none'; };
    vis(back1, !s1);
    vis(back2, s3);
    if (s2) {
      const selected = !!step2.querySelector('.co-method[aria-selected="true"]');
      if (toStep3Btn) { toStep3Btn.disabled = !selected; toStep3Btn.style.display = ''; }
    } else if (toStep3Btn) {
      toStep3Btn.style.display = 'none';
    }
  }

  // ===== Open / Close
  function openModal(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    modal.classList.add('show', 'co-fullscreen');
    document.documentElement.setAttribute('data-checkout-open', '1');
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    closeBtn && (closeBtn.style.display = 'flex');

    // Step 1
    setActive(1); show(step1, true); show(step2, false); show(step3, false);
    ensureNav(1);
    toggleGlobalCtas(true);
    killStickyPrice();
    hidePriceBox();              // no price line on Step 1
  }
  function closeModal() {
    modal.classList.remove('show', 'co-fullscreen');
    document.documentElement.removeAttribute('data-checkout-open');
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    toggleGlobalCtas(false);
  }

  // Global triggers (also binds late CTAs)
  const OPEN_SEL = CTA_SEL;
  const OPEN_EVTS = ['click', 'touchstart', 'pointerup'];
  OPEN_EVTS.forEach(evt => {
    document.addEventListener(evt, (e) => {
      const t = e.target.closest(OPEN_SEL);
      if (t) openModal(e);
    }, { capture: true, passive: false });
  });
  new MutationObserver(() => {
    document.querySelectorAll(OPEN_SEL).forEach(el => {
      if (el.__bound) return;
      OPEN_EVTS.forEach(v => el.addEventListener(v, openModal, { passive: false }));
      el.__bound = true;
    });
  }).observe(document.documentElement, { subtree: true, childList: true });

  closeBtn  && closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('show')) closeModal(); });

  // ===== Step 1 → Step 2
  step1 && step1.addEventListener('submit', (e) => {
    e.preventDefault();
    const name  = step1.querySelector('[name="name"]');
    const email = step1.querySelector('[name="email"]');
    const addr  = step1.querySelector('[name="address"]');
    const ok = [name, email, addr].every(i => !!i?.value?.trim());
    [name, email, addr].forEach(i => i && (i.style.borderColor = i.value.trim() ? '' : '#ff2a6d'));
    if (!ok) return;

    setActive(2); show(step1, false); show(step2, true); show(step3, false);
    ensureNav(2);

    // Step-2 text / visibility
    const t = $('coQtyTitle');     if (t) t.textContent = 'How Many Bottles Do You Want?';
    const sh = $('coShipHeader');  if (sh) sh.hidden = true;

    qty = 1; const q = $('coQty'); if (q) q.value = '1';
    discountPct = 0;

    ensurePriceBox();
    step2.querySelector('.co-method[data-method="card"]')?.click(); // default method
    killStickyPrice();
    computeTotals();
  });

  // ===== Step 2 (qty & methods)
  step2 && step2.addEventListener('click', (e) => {
    if (e.target.closest('.qty-inc')) {
      const input = $('coQty'); qty = Math.min(99, (parseInt(input?.value || '1', 10) || 1) + 1);
      if (input) input.value = qty; computeTotals(); return;
    }
    if (e.target.closest('.qty-dec')) {
      const input = $('coQty'); qty = Math.max(1, (parseInt(input?.value || '1', 10) || 1) - 1);
      if (input) input.value = qty; computeTotals(); return;
    }

    const btn = e.target.closest('.co-method');
    if (!btn) return;
    step2.querySelectorAll('.co-method').forEach(b => b.removeAttribute('aria-selected'));
    btn.setAttribute('aria-selected', 'true');
    chosenMethod = btn.dataset.method || 'card';
    discountPct  = parseFloat(btn.dataset.discount || '0') || 0;
    toStep3Btn && (toStep3Btn.disabled = false);
    computeTotals();
  });

  step2 && step2.addEventListener('input', (e) => {
    if (e.target.id === 'coQty') {
      const v = e.target.value.replace(/[^0-9]/g, '');
      qty = Math.max(1, Math.min(99, parseInt(v || '1', 10)));
      e.target.value = qty;
      computeTotals();
    }
  });

  // ===== Step 2 → Step 3
  toStep3Btn && toStep3Btn.addEventListener('click', (e) => {
    e.preventDefault();
    if (!chosenMethod) return;
    renderPay(chosenMethod);
    setActive(3); show(step2, false); show(step3, true);
    ensureNav(3);
    computeTotals();
  });

  // ===== Back buttons
  back1 && back1.addEventListener('click', () => {
    setActive(1); show(step1, true); show(step2, false); show(step3, false);
    const sh = $('coShipHeader'); if (sh) sh.hidden = false;
    ensureNav(1);
    hidePriceBox();
  });
  back2 && back2.addEventListener('click', () => {
    setActive(2); show(step1, false); show(step2, true); show(step3, false);
    const sh = $('coShipHeader'); if (sh) sh.hidden = true;
    ensureNav(2);
    ensurePriceBox();
    killStickyPrice();
  });

  // ===== Step 3 renderer
  function renderPay(m) {
    const txt = (h) => `<div class="altpay"><h4>${h[0]}</h4><p>${h[1]}</p></div>`;
    const map = {
      card: `<fieldset class="cardset"><legend>Card details</legend>
               <label>Card number
                 <input type="text" name="card" inputmode="numeric" placeholder="4242 4242 4242 4242" required>
               </label>
               <div class="co-row">
                 <label>Expiry
                   <input type="text" name="exp" inputmode="numeric" placeholder="MM/YY" required>
                 </label>
                 <label>CVC
                   <input type="text" name="cvc" inputmode="numeric" maxlength="4" required>
                 </label>
                 <label>ZIP
                   <input type="text" name="cczip" inputmode="numeric" maxlength="5" required>
                 </label>
               </div>
             </fieldset>`,
      venmo:   txt(['Venmo checkout',   'Send to @YourHandle — 10% off applied at confirmation.']),
      cashapp: txt(['Cash App checkout','Send to $YourCashtag — 10% off applied.']),
      paypal:  txt(['PayPal checkout',  'Redirect to PayPal — 10% off applied.']),
      crypto:  txt(['Crypto checkout',  'BTC/ETH/USDC — 15% off applied; address shown next.'])
    };
    payWrap.innerHTML = map[m] || map.card;
  }

  // ===== Submit (demo)
  submitBtn && submitBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (!tos?.checked) { tos?.focus(); return; }
    step3.hidden = true;
    $('checkoutSuccess') && ($('checkoutSuccess').hidden = false);
  });

  // Precompute so numbers paint if modal pre-opened by code
  computeTotals();
})();
