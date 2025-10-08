
/* ===== Checkout Modal — v1.1 Fixes ===== */
(function(){
  const modal = document.getElementById('checkoutModal');
  const closeBtn = document.getElementById('checkoutClose');
  const form = document.getElementById('checkoutForm');
  const success = document.getElementById('checkoutSuccess');
  const successClose = document.getElementById('successClose');

  function openModal(ev){
    if (ev) ev.preventDefault();
    if (!modal) return;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    const first = form?.querySelector('input, select, button');
    if (first) first.focus();
  }
  function closeModal(){
    modal?.classList.remove('show');
    modal?.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }

  /* Robust binding: delegation covers dynamically shown buttons (e.g., floating CTA) */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-cta], a[href="#offer"], #floatingCta');
    if (t) openModal(e);
  }, true); // capture to beat other handlers

  // Direct binds for redundancy
  document.querySelectorAll('[data-cta], a[href="#offer"], #floatingCta').forEach(el => {
    el.addEventListener('click', openModal);
  });

  // Close behaviors
  closeBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e)=>{ if(e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape' && modal.classList.contains('show')) closeModal(); });

  // Client-side validation demo
  form?.addEventListener('submit', (e)=>{
    e.preventDefault();
    const required = [...form.querySelectorAll('[required]')];
    let ok = true;
    required.forEach(inp => {
      const name = inp.name;
      const val = (inp.value || '').trim();
      const invalidZip = (name === 'zip' || name === 'cczip') && !/^\d{5}$/.test(val);
      if (!val || invalidZip) {
        ok = false;
        inp.setAttribute('aria-invalid','true');
        inp.style.borderColor = '#ff2a6d';
      } else {
        inp.removeAttribute('aria-invalid');
        inp.style.borderColor = '';
      }
    });
    if (!ok) return;
    if (form) form.hidden = true;
    if (success) success.hidden = false;
    success?.querySelector('h4')?.focus?.();
  });

  successClose?.addEventListener('click', (e)=>{ e.preventDefault(); closeModal(); });
})();
