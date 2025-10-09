
// Full checkout controller (3 steps) + Recurly Elements wiring
(function(){
  const modal   = document.getElementById('checkoutModal');
  const card    = document.getElementById('checkoutCard');
  const openBtn = document.getElementById('openCheckout');
  const closeBtn= document.getElementById('checkoutClose');
  const back    = document.getElementById('coBack');
  const step1   = document.getElementById('coStep1');
  const step2   = document.getElementById('coStep2');
  const step3   = document.getElementById('coStep3');
  const submit  = document.getElementById('coSubmit');
  const totalEl = document.getElementById('coTotal');
  const qtyEl   = document.getElementById('coQty');

  function show(m){ modal.classList.add('show'); document.documentElement.style.overflow='hidden'; }
  function hide(){ modal.classList.remove('show'); document.documentElement.style.overflow=''; }

  openBtn?.addEventListener('click', e=>{ e.preventDefault(); show(); setStep(1); });
  closeBtn?.addEventListener('click', hide);
  back?.addEventListener('click', ()=>{ if (!step2.hidden) setStep(1); else if (!step3.hidden) setStep(2); });

  document.addEventListener('keydown', e=>{ if (e.key==='Escape' && modal.classList.contains('show')) hide(); });
  modal.addEventListener('click', e=>{ if (e.target===modal) hide(); });

  let qty=1;
  function computeTotal(){
    const SALE=90, TAX=0.0875, SHIP=0;
    const merch = qty*SALE;
    const tax = (merch)*TAX;
    const total = merch+tax+SHIP;
    totalEl.textContent = `$${total.toFixed(2)}`;
    return total;
  }
  document.getElementById('qtyPlus')?.addEventListener('click',()=>{ qty=Math.min(99,qty+1); qtyEl.textContent=qty; computeTotal(); });
  document.getElementById('qtyMinus')?.addEventListener('click',()=>{ qty=Math.max(1,qty-1); qtyEl.textContent=qty; computeTotal(); });

  function setStep(n){
    [step1,step2,step3].forEach((el,i)=>{ el.hidden = (i!==n-1); });
    if (n===3){
      // Remove any legacy inputs (safety)
      const legacy = document.querySelector('#coPayWrap input[name="card"], #coPayWrap input[name="exp"], #coPayWrap input[name="cvc"], #coPayWrap input[name="zip"]');
      if (legacy){ const fs=legacy.closest('fieldset'); fs && fs.remove(); }
      // Ensure Recurly mounts
      if (window.RecurlyUI) window.RecurlyUI.mount();
    } else {
      if (window.RecurlyUI) window.RecurlyUI.unmount();
    }
  }

  document.getElementById('toStep2')?.addEventListener('click',()=>setStep(2));
  document.getElementById('toStep3')?.addEventListener('click',()=>setStep(3));

  submit?.addEventListener('click', async (e)=>{
    e.preventDefault();
    submit.disabled=true; submit.textContent='Processing…';
    try {
      // 1) Tokenize with Recurly
      const token = await window.RecurlyUI.tokenize({});
      // 2) Build order
      const order = {
        total: computeTotal(),
        qty,
        customer: { email: document.querySelector('#coStep1 [name="email"]')?.value || '' }
      };
      // 3) Charge via serverless
      const resp = await fetch('/api/payments/recurly/charge', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ token, order })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error((data && data.error) || 'Payment failed.');
      alert('Payment captured: ' + (data.id || 'OK'));
      hide();
    } catch (err) {
      alert(err.message || 'Payment failed');
    } finally {
      submit.disabled=false; submit.textContent='Complete Order';
    }
  });

  // init
  qtyEl.textContent=qty;
  computeTotal();
})();
