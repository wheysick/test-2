/* ===== checkout3.js v2.4 — Fullscreen modal + qty/free/discount/totals + CTA hide + resilient nav/buttons ===== */
(function () {
  const modal      = document.getElementById('checkoutModal');
  if (!modal) return;

  // Steps / controls
  const step1      = document.getElementById('coStep1');
  const step2      = document.getElementById('coStep2');
  const step3      = document.getElementById('coStep3');
  const steps      = document.querySelectorAll('.co-step');
  const toStep3Btn = document.getElementById('coToStep3');
  const back1      = document.getElementById('coBackTo1');
  const back2      = document.getElementById('coBackTo2');
  const payWrap    = document.getElementById('coPayWrap');
  const tos        = document.getElementById('coTos');
  const submitBtn  = document.getElementById('coSubmit');
  const closeBtn   = document.getElementById('checkoutClose');

  // Pricing constants
  const MSRP      = 90;       // compare-at (optional, for strikethrough)
  const SALE      = 90;       // actual price per paid bottle
  const TAX_RATE  = 0.0875;   // 8.75%
  const SHIPPING  = 0;

  // State
  let chosenMethod = null;
  let qty          = 1;       // paid bottles
  let discountPct  = 0;       // 0, 10, 15 based on method

  // Helpers
  const $         = (id) => document.getElementById(id);
  const show      = (el, yes = true) => { if(!el) return; el.hidden = !yes; el.setAttribute('aria-hidden', String(!yes)); };
  const setActive = (n) => steps.forEach(s => s.classList.toggle('is-active', s.dataset.step == n));
  const fmt       = (n) => `$${n.toFixed(2)}`;

  // Ensure the step-nav buttons are visible/consistent
  function ensureNav(stepNum){
    const s1 = stepNum === 1, s2 = stepNum === 2, s3 = stepNum === 3;
    const vis = (el, on=true) => { if(!el) return; el.hidden = !on; el.style.display = on ? '' : 'none'; };

    vis($('coBackTo1'), !s1);     // show on steps 2/3
    vis($('coBackTo2'), s3);      // show only on step 3
    if (s2) {
      vis($('coToStep3'), true);
      // keep disabled until a method is selected
      const hasSelected = !!step2.querySelector('.co-method[aria-selected="true"]');
      if ($('coToStep3')) $('coToStep3').disabled = !hasSelected;
    } else {
      vis($('coToStep3'), false);
    }
  }

  // Fullscreen: hide global floating CTAs while modal is open
  const CTA_SEL = '#floatingCta,.floating-cta,[data-cta],a[href="#offer"]';
  function toggleGlobalCtas(hide) {
    document.querySelectorAll(CTA_SEL).forEach(el => {
      if (hide) {
        el.__prevDisplay = el.style.display;
        el.style.display = 'none';
      } else {
        el.style.display = el.__prevDisplay || '';
        delete el.__prevDisplay;
      }
    });
  }

  // Only remove true sticky price bars, not the normal price line
  function killStickyPrice() {
    document.querySelectorAll('#coStickyPrice,[data-sticky="price"]').forEach(n => n.remove());
  }

  // If page lacks a visible price line, create one under qty controls
  function ensurePriceBox() {
    let wrap = $('coPriceBox');
    if (!wrap) {
      const anchor = $('coQtyRow') || step2 || modal;
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

  function computeTotals(){
    const free       = qty;                     // free bottles mirror qty
    const merch      = qty * SALE;              // paid units at SALE
    const disc       = merch * (discountPct / 100);
    const taxable    = Math.max(0, merch - disc);
    const tax        = taxable * TAX_RATE;
    const total      = taxable + tax + SHIPPING;

    // Per-bottle UI
    $('coPerWas')    && ($('coPerWas').innerText = fmt(MSRP));
    $('coPerNow')    && ($('coPerNow').innerText = fmt(SALE));

    // Qty / free mirror
    $('coQty')       && ($('coQty').value = String(qty));
    $('coFreeQty')   && ($('coFreeQty').innerText = String(free));
    $('coItemsLine') && ($('coItemsLine').innerText = `${qty + free} bottles (${qty} paid + ${free} free)`);

    // Money lines
    $('coMerch')     && ($('coMerch').innerText = fmt(merch));
    $('coDisc')      && ($('coDisc').innerText  = disc > 0 ? `-${fmt(disc)}` : '$0.00');
    $('coTax')       && ($('coTax').innerText   = fmt(tax));
    $('coShip')      && ($('coShip').innerText  = SHIPPING === 0 ? 'FREE' : fmt(SHIPPING));
    $('coTotal')     && ($('coTotal').innerText = fmt(total));
  }

  // Open/close modal (fullscreen)
  function openModal(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    modal.classList.add('show','co-fullscreen');
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';

    // make close button visible in top-right
    if (closeBtn) { closeBtn.removeAttribute('hidden'); closeBtn.style.display = 'flex'; }

    // step 1
    setActive(1); show(step1,true); show(step2,false); show(step3,false);
    ensureNav(1);
    toggleGlobalCtas(true);
    killStickyPrice();
  }
  function closeModal() {
    modal.classList.remove('show','co-fullscreen');
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    toggleGlobalCtas(false);
  }

  // Open from any CTA (desktop + mobile)
  const openTriggers = ['click','touchstart','pointerup'];
  const OPEN_SEL = CTA_SEL;
  openTriggers.forEach(evt => {
    document.addEventListener(evt, (e) => {
      const t = e.target.closest(OPEN_SEL);
      if (t) openModal(e);
    }, { capture: true, passive: false });
  });

  // Bind late-added CTAs
  new MutationObserver(() => bindAll()).observe(document.documentElement, { subtree: true, childList: true });
  function bindAll(){
    document.querySelectorAll(OPEN_SEL).forEach(el => {
      if (el.__bound) return;
      openTriggers.forEach(v => el.addEventListener(v, openModal, { passive: false }));
      el.__bound = true;
    });
  } bindAll();

  // Close interactions
  closeBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('show')) closeModal(); });

  /* ---------- STEP 1 ---------- */
  step1?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name  = step1.querySelector('[name="name"]');
    const email = step1.querySelector('[name="email"]');
    const addr  = step1.querySelector('[name="address"]');

    const ok = [name, email, addr].every(i => !!i?.value?.trim());
    [name, email, addr].forEach(i => i && (i.style.borderColor = i.value.trim() ? '' : '#ff2a6d'));
    if (!ok) return;

    // Step 2
    setActive(2); show(step1,false); show(step2,true); show(step3,false);
    ensureNav(2);
    if ($('coQtyTitle')) $('coQtyTitle').textContent = 'How Many Bottles Do You Want?';
    if ($('coShipHeader')) $('coShipHeader').hidden = true;

    // default state
    if ($('coQty')) { qty = 1; $('coQty').value = '1'; }
    discountPct = 0;
    ensurePriceBox();
    step2.querySelector('.co-method[data-method="card"]')?.click(); // preselect Card
    killStickyPrice();
    computeTotals();
  });

  /* ---------- STEP 2 (qty & method) ---------- */
  step2?.addEventListener('click', (e) => {
    // Qty +
    if (e.target.closest('.qty-inc')) {
      const input = $('coQty');
      qty = Math.min(99, (parseInt(input.value, 10) || 1) + 1);
      input.value = qty;
      computeTotals();
      return;
    }
    // Qty -
    if (e.target.closest('.qty-dec')) {
      const input = $('coQty');
      qty = Math.max(1, (parseInt(input.value, 10) || 1) - 1);
      input.value = qty;
      computeTotals();
      return;
    }

    // Payment method
    const btn = e.target.closest('.co-method');
    if (!btn) return;

    step2.querySelectorAll('.co-method').forEach(b => b.removeAttribute('aria-selected'));
    btn.setAttribute('aria-selected', 'true');
    chosenMethod = btn.dataset.method || 'card';
    discountPct  = parseFloat(btn.dataset.discount || '0') || 0;
    if ($('coToStep3')) $('coToStep3').disabled = false;

    computeTotals();
  });

  // Manual qty input
  step2?.addEventListener('input', (e) => {
    if (e.target.id === 'coQty') {
      const v = e.target.value.replace(/[^0-9]/g, '');
      qty = Math.max(1, Math.min(99, parseInt(v || '1', 10)));
      e.target.value = qty;
      computeTotals();
    }
  });

  /* ---------- STEP 2 → STEP 3 ---------- */
  toStep3Btn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!chosenMethod) return;
    renderPay(chosenMethod);
    setActive(3); show(step2,false); show(step3,true);
    ensureNav(3);
    computeTotals();
  });

  /* ---------- Back buttons ---------- */
  back1?.addEventListener('click', () => {
    setActive(1); show(step1,true); show(step2,false); show(step3,false);
    if ($('coShipHeader')) $('coShipHeader').hidden = false;
    ensureNav(1);
  });
  back2?.addEventListener('click', () => {
    setActive(2); show(step1,false); show(step2,true); show(step3,false);
    if ($('coShipHeader')) $('coShipHeader').hidden = true;
    ensureNav(2);
    killStickyPrice();
  });

  /* ---------- STEP 3 renderer ---------- */
  const renderPay = (m) => {
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
  };

  /* ---------- STEP 3 submit (demo) ---------- */
  submitBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!tos?.checked) { tos?.focus(); return; }
    step3.hidden = true;
    $('checkoutSuccess') && ($('checkoutSuccess').hidden = false);
  });

  // Initial totals (if the modal is opened pre-bound)
  computeTotals();
})();
