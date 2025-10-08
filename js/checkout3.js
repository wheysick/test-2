/* ===== checkout3.js v1.4 — Step isolation + mobile CTA reliability ===== */
(function(){
  const modal = document.getElementById('checkoutModal');
  if(!modal) return;

  const step1=document.getElementById('coStep1');
  const step2=document.getElementById('coStep2');
  const step3=document.getElementById('coStep3');
  const steps=document.querySelectorAll('.co-step');
  const toStep3Btn=document.getElementById('coToStep3');
  const back1=document.getElementById('coBackTo1');
  const back2=document.getElementById('coBackTo2');
  const payWrap=document.getElementById('coPayWrap');
  const tos=document.getElementById('coTos');
  const submitBtn=document.getElementById('coSubmit');
  const closeBtn=document.getElementById('checkoutClose');
  let chosenMethod=null;

  const show=(el,yes=true)=>{ if(!el)return; el.hidden=!yes; el.setAttribute('aria-hidden',String(!yes)); };
  const setActive=(n)=>steps.forEach(s=>s.classList.toggle('is-active',s.dataset.step==n));

  function openModal(e){
    if(e){e.preventDefault();e.stopPropagation();}
    modal.classList.add('show');
    document.body.classList.add('modal-open');
    document.body.style.overflow='hidden';
    setActive(1); show(step1,true); show(step2,false); show(step3,false);
  }
  function closeModal(){
    modal.classList.remove('show');
    document.body.classList.remove('modal-open');
    document.body.style.overflow='';
  }

  // open from any CTA (desktop + mobile)
  const openTriggers=['click','touchstart','pointerup'];
  openTriggers.forEach(evt=>{
    document.addEventListener(evt,e=>{
      const t=e.target.closest('#floatingCta,.floating-cta,[data-cta],a[href="#offer"]');
      if(t){ openModal(e); }
    },{capture:true,passive:false});
  });

  // ensure late CTAs bind too
  new MutationObserver(()=>bindAll()).observe(document.documentElement,{subtree:true,childList:true});
  function bindAll(){
    document.querySelectorAll('#floatingCta,.floating-cta,[data-cta],a[href="#offer"]').forEach(el=>{
      if(el.__bound)return;
      openTriggers.forEach(v=>el.addEventListener(v,openModal,{passive:false}));
      el.__bound=true;
    });
  } bindAll();

  closeBtn?.addEventListener('click',closeModal);
  modal.addEventListener('click',e=>{ if(e.target===modal)closeModal(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&modal.classList.contains('show'))closeModal(); });

  // --- Step 1 submit ---
  step1?.addEventListener('submit',e=>{
    e.preventDefault();
    const name=step1.querySelector('[name="name"]');
    const email=step1.querySelector('[name="email"]');
    const addr=step1.querySelector('[name="address"]');
    let ok=[name,email,addr].every(i=>!!i.value.trim());
    [name,email,addr].forEach(i=>i.style.borderColor=i.value.trim()?'':'#ff2a6d');
    if(!ok)return;
    setActive(2); show(step1,false); show(step2,true); show(step3,false);
    step2.querySelector('.co-method[data-method="card"]')?.click();
  });

  // --- Step 2 choose method ---
  step2?.addEventListener('click',e=>{
    const btn=e.target.closest('.co-method'); if(!btn)return;
    step2.querySelectorAll('.co-method').forEach(b=>b.removeAttribute('aria-selected'));
    btn.setAttribute('aria-selected','true'); chosenMethod=btn.dataset.method;
    toStep3Btn.disabled=false;
  });

  // --- Step 2 → Step 3 ---
  toStep3Btn?.addEventListener('click',e=>{
    e.preventDefault(); if(!chosenMethod)return;
    renderPay(chosenMethod);
    setActive(3); show(step2,false); show(step3,true);
  });

  // --- Back buttons ---
  back1?.addEventListener('click',()=>{setActive(1);show(step1,true);show(step2,false);show(step3,false);});
  back2?.addEventListener('click',()=>{setActive(2);show(step1,false);show(step2,true);show(step3,false);});

  // --- Step 3 content render ---
  const renderPay=(m)=>{
    const txt=(h)=>`<div class="altpay"><h4>${h[0]}</h4><p>${h[1]}</p></div>`;
    const map={
      card:`<fieldset class="cardset"><legend>Card details</legend>
      <label>Card number<input type="text" placeholder="4242 4242 4242 4242" required></label>
      <div class="co-row"><label>Expiry<input type="text" placeholder="MM/YY" required></label>
      <label>CVC<input type="text" maxlength="4" required></label><label>ZIP<input type="text" maxlength="5" required></label></div></fieldset>`,
      venmo:txt(['Venmo checkout','Send to @YourHandle — 10% off applied at confirmation.']),
      cashapp:txt(['Cash App checkout','Send to $YourCashtag — 10% off applied.']),
      paypal:txt(['PayPal checkout','Redirect to PayPal — 10% off applied.']),
      crypto:txt(['Crypto checkout','BTC/ETH/USDC — 15% off applied; address shown next.'])
    };
    payWrap.innerHTML=map[m]||map.card;
  };

  // --- Submit (demo) ---
  submitBtn?.addEventListener('click',e=>{
    e.preventDefault();
    if(!tos.checked){tos.focus();return;}
    step3.hidden=true;
    document.getElementById('checkoutSuccess').hidden=false;
  });
})();
