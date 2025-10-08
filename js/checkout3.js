/* ===== checkout3.js v3.1 — Clean fullscreen checkout, fixed spacing & CTA handling ===== */
(function(){
  const modal = document.getElementById("checkoutModal");
  if(!modal) return;

  // Elements
  const step1=document.getElementById("coStep1"),
        step2=document.getElementById("coStep2"),
        step3=document.getElementById("coStep3"),
        steps=document.querySelectorAll(".co-step"),
        toStep3=document.getElementById("coToStep3"),
        back1=document.getElementById("coBackTo1"),
        back2=document.getElementById("coBackTo2"),
        payWrap=document.getElementById("coPayWrap"),
        submit=document.getElementById("coSubmit"),
        tos=document.getElementById("coTos"),
        closeBtn=document.getElementById("checkoutClose");

  // Constants
  const MSRP=90, SALE=90, TAX=0.0875, SHIPPING=0;
  let qty=1, discount=0, method=null;

  // Utilities
  const $ = id => document.getElementById(id);
  const fmt = n => `$${n.toFixed(2)}`;
  const show = (el,on=true)=>{ if(el){ el.hidden=!on; el.setAttribute("aria-hidden",String(!on)); } };
  const active = n => steps.forEach(s=>s.classList.toggle("is-active",s.dataset.step==n));

  // CTA hide/show
  const CTA_SEL="#floatingCta,.floating-cta,[data-cta],a[href='#offer'],.cta,[data-hide-on-checkout]";
  const toggleCTAs=(hide)=>{
    document.querySelectorAll(CTA_SEL).forEach(el=>{
      if(hide){
        el.__prevDisplay=el.style.display;
        el.style.display="none";
      }else{
        el.style.display=el.__prevDisplay||"";
      }
    });
  };

  // Totals calc
  function totals(){
    const free=qty, merch=qty*SALE, disc=merch*(discount/100), taxable=merch-disc;
    const tax=taxable*TAX, total=taxable+tax+SHIPPING;
    $("coPerWas")?.textContent=fmt(MSRP);
    $("coPerNow")?.textContent=fmt(SALE);
    $("coQty")?.setAttribute("value",qty);
    $("coItemsLine")?.textContent=`${qty+free} bottles (${qty} paid + ${free} free)`;
    $("coMerch")?.textContent=fmt(merch);
    $("coDisc")?.textContent=disc>0?`-${fmt(disc)}`:"$0.00";
    $("coTax")?.textContent=fmt(tax);
    $("coShip")?.textContent=SHIPPING===0?"FREE":fmt(SHIPPING);
    $("coTotal")?.textContent=fmt(total);
  }

  // Step logic
  function openModal(e){
    e?.preventDefault();
    modal.classList.add("show","co-fullscreen");
    document.body.style.overflow="hidden";
    document.documentElement.setAttribute("data-checkout-open","1");
    toggleCTAs(true);
    active(1); show(step1,true); show(step2,false); show(step3,false);
  }
  function closeModal(){
    modal.classList.remove("show","co-fullscreen");
    document.body.style.overflow="";
    document.documentElement.removeAttribute("data-checkout-open");
    toggleCTAs(false);
  }

  closeBtn?.addEventListener("click",closeModal);
  modal.addEventListener("click",e=>{ if(e.target===modal) closeModal(); });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&modal.classList.contains("show")) closeModal(); });

  // Triggers
  ["click","touchstart"].forEach(evt=>{
    document.addEventListener(evt,e=>{
      const t=e.target.closest(CTA_SEL);
      if(t) openModal(e);
    },{capture:true,passive:false});
  });

  // Step 1 → Step 2
  step1?.addEventListener("submit",e=>{
    e.preventDefault();
    const required=["name","email","address"].map(f=>step1.querySelector(`[name='${f}']`));
    if(required.some(i=>!i?.value.trim())){ required.forEach(i=>i&&(i.style.borderColor="#ff3e58")); return;}
    active(2); show(step1,false); show(step2,true); show(step3,false);
    qty=1; discount=0; totals();
  });

  // Step 2 logic
  step2?.addEventListener("click",e=>{
    if(e.target.closest(".qty-inc")){ qty=Math.min(99,qty+1); $("coQty").value=qty; totals(); return;}
    if(e.target.closest(".qty-dec")){ qty=Math.max(1,qty-1); $("coQty").value=qty; totals(); return;}
    const btn=e.target.closest(".co-method"); if(!btn)return;
    step2.querySelectorAll(".co-method").forEach(b=>b.removeAttribute("aria-selected"));
    btn.setAttribute("aria-selected","true");
    method=btn.dataset.method; discount=parseFloat(btn.dataset.discount||0); totals();
  });

  toStep3?.addEventListener("click",e=>{
    e.preventDefault();
    if(!method)return;
    renderPay(method);
    active(3); show(step2,false); show(step3,true);
  });

  back1?.addEventListener("click",()=>{ active(1); show(step1,true); show(step2,false); show(step3,false); });
  back2?.addEventListener("click",()=>{ active(2); show(step1,false); show(step2,true); show(step3,false); });

  function renderPay(m){
    const txt=(t)=>`<div class="altpay"><h4>${t[0]}</h4><p>${t[1]}</p></div>`;
    const map={
      card:`<fieldset class="cardset"><legend>Card details</legend>
             <label>Card number<input type="text" placeholder="4242 4242 4242 4242"></label>
             <div class="co-row"><label>Expiry<input placeholder="MM/YY"></label>
             <label>CVC<input maxlength="4"></label><label>ZIP<input maxlength="5"></label></div></fieldset>`,
      venmo:txt(["Venmo checkout","Send to @YourHandle — 10% off applied"]),
      cashapp:txt(["Cash App","Send to $YourCashtag — 10% off applied"]),
      paypal:txt(["PayPal","Redirect to PayPal — 10% off applied"]),
      crypto:txt(["Crypto","BTC/ETH/USDC — 15% off applied; address shown next"])
    };
    payWrap.innerHTML=map[m]||map.card;
  }

  submit?.addEventListener("click",e=>{
    e.preventDefault();
    if(!tos?.checked){ tos.focus(); return;}
    step3.hidden=true;
    $("checkoutSuccess")?.removeAttribute("hidden");
  });

  totals();
})();
