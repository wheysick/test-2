/* ===== checkout3.css v5.0 — Premium dark, mobile-first, consistent scale ===== */
:root{
  --bg:#0B0E12;            /* page backdrop */
  --panel:#0F1319;         /* modal panel bg */
  --fg:#E9ECF2;            /* body text */
  --muted:rgba(255,255,255,.06);
  --border:rgba(255,255,255,.12);
  --border-strong:rgba(255,255,255,.18);
  --accent:#C471F5;        /* violet */
  --accent2:#FA71CD;       /* pink */
  --success:#47d674;
  --radius:16px;
  --shadow:0 28px 64px rgba(0,0,0,.55);
  --pad:clamp(18px,3.2vw,28px);
  --font:Inter, ui-sans-serif, system-ui, Segoe UI, Arial, sans-serif;
  --h1:clamp(20px,2.2vw,26px);
  --h2:clamp(18px,2vw,22px);
  --body:15px;
  --small:13px;
}

/* Make sure whole site uses a clean base and tap feels native on iOS */
html,body{font-family:var(--font);-webkit-tap-highlight-color:transparent;background:#0A0C10;color:var(--fg);}

/* ---------- Modal Backdrop / Container ---------- */
#checkoutModal{display:none;}
#checkoutModal.show{display:flex!important;}
#checkoutModal.co-fullscreen{
  position:fixed; inset:0; z-index:999999; align-items:center; justify-content:center;
  background:rgba(5,7,10,.78);
}

/* ---------- Card Panel ---------- */
#checkoutModal .modal-content.checkout-card{
  width:min(92vw,680px);
  max-height:calc(100dvh - 4rem);
  background:linear-gradient(180deg,rgba(255,255,255,.02),rgba(255,255,255,0)), var(--panel);
  color:var(--fg);
  border:1px solid rgba(255,255,255,.08);
  border-radius:var(--radius);
  box-shadow:var(--shadow);
  overflow:auto; overscroll-behavior:contain;
  padding:28px var(--pad) 96px;
}

/* ---------- Close Button ---------- */
#checkoutClose{
  position:fixed; top:14px; right:14px; z-index:1000000;
  width:44px; height:44px; border-radius:999px; border:1px solid rgba(255,255,255,.14);
  background:rgba(18,19,23,.92); color:#fff; display:flex; align-items:center; justify-content:center;
  backdrop-filter:blur(6px) saturate(120%);
  cursor:pointer; box-shadow:0 6px 18px rgba(0,0,0,.45);
}

/* ---------- Generic Step Pane ---------- */
.co-pane[hidden], .co-pane[aria-hidden="true"]{display:none!important;}
.co-h3{font-size:var(--h1); font-weight:900; letter-spacing:.2px; text-align:center; margin:4px 0 18px;}
p,li{font-size:var(--body);}

/* ---------- STEP 1 — Address Form ---------- */
#coStep1 .co-grid{display:grid; grid-template-columns:1fr 1fr; gap:14px 16px; margin-top:6px;}
#coStep1 .co-row{display:grid; grid-template-columns:1fr 120px 1fr; gap:14px 16px;}
@media (max-width:640px){
  #coStep1 .co-grid{grid-template-columns:1fr;}
  #coStep1 .co-row{grid-template-columns:1fr 1fr;}
}
#coStep1 label{font-size:var(--small); opacity:.85; display:flex; flex-direction:column; gap:6px;}
#coStep1 input{
  width:100%; padding:12px 14px; border-radius:14px; font-size:var(--body);
  border:1px solid var(--border); background:var(--muted); color:var(--fg); outline:none;
}
#coStep1 input:focus{border-color:var(--accent); box-shadow:0 0 0 3px rgba(196,113,245,.2);}

/* STEP 1 Primary CTA */
.co-next, .co-submit, .btn-main{
  border:none; border-radius:14px; cursor:pointer; font-weight:800; color:#fff;
  background:linear-gradient(90deg,var(--accent),var(--accent2));
  box-shadow:0 10px 24px rgba(250,113,205,.25), 0 2px 0 rgba(0,0,0,.35) inset;
}
.btn-lg{padding:13px 22px; font-size:15px;}
.btn-sm{padding:10px 16px; font-size:14px;}
.btn-main:hover{filter:brightness(1.06);}

/* ---------- STEP 2 — Qty + Methods + Totals ---------- */
#coStep2{text-align:center;}
.co-qty{display:flex; justify-content:center; align-items:center; gap:12px; margin:10px 0 8px;}
.qty-btn{
  width:44px; height:44px; border-radius:12px; font-size:18px; line-height:1;
  border:1px solid var(--border); background:var(--muted); color:var(--fg);
}
#coQty{
  width:82px; text-align:center; padding:12px; border-radius:12px; font-size:16px;
  border:1px solid var(--border); background:var(--muted); color:var(--fg);
}
.co-free{margin:4px 0 12px; opacity:.95;}

.co-price{margin:10px 0 16px; font-size:18px;}
.co-price .was{margin-right:8px; text-decoration:line-through; opacity:.55;}
.co-price .now{font-weight:800;}

/* Methods */
.co-methods{display:grid; gap:14px; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); margin:18px 0 10px;}
.co-method{
  border:1px solid var(--border);
  background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,0));
  border-radius:14px; padding:16px 14px; text-align:left; color:var(--fg);
  transition:border .15s ease, box-shadow .15s ease, transform .06s ease;
}
.co-method .co-title{font-weight:800;}
.co-method .co-badge,.co-method .co-discount{opacity:.85; font-size:.92rem; margin-top:4px; display:block;}
.co-method:hover{border-color:var(--border-strong);}
.co-method:active{transform:translateY(1px);}
.co-method[aria-selected="true"]{border-color:var(--accent); box-shadow:0 0 0 2px rgba(196,113,245,.35) inset;}

/* Totals box */
.co-sticky{position:relative; margin-top:8px;}
.co-totals{
  border:1px solid var(--border); border-radius:14px;
  background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,0));
  padding:14px 16px; text-align:left;
}
.co-totals > div{display:flex; align-items:center; justify-content:space-between; gap:12px; padding:6px 0;}
.co-total-row{border-top:1px dashed var(--border); margin-top:8px; padding-top:10px; font-weight:800;}

.co-actions{
  position:sticky; bottom:0; z-index:3;
  display:flex; justify-content:flex-end; gap:10px;
  padding:14px var(--pad);
  background:linear-gradient(180deg,rgba(11,13,17,0),rgba(11,13,17,.88));
  backdrop-filter:blur(8px);
  box-shadow:0 -10px 28px rgba(0,0,0,.35);
}
.co-secure{margin:10px 0 0; text-align:center; opacity:.9; font-size:var(--small);}

/* ---------- STEP 3 ---------- */
.cardset{margin:16px 0; padding:14px; border:1px solid var(--border); border-radius:14px;}
.cardset legend{padding:0 6px; font-size:var(--small); opacity:.9;}
.co-row{display:grid; grid-template-columns:repeat(3,1fr); gap:12px;}
@media (max-width:640px){.co-row{grid-template-columns:1fr;}}

/* Terms / trust */
.co-terms{margin:12px 0; font-size:var(--small); opacity:.95;}
.co-trust{margin-top:8px; text-align:center; opacity:.8; font-size:var(--small);}

/* Success state */
.co-success[hidden]{display:none!important;}
.co-success h4{font-size:var(--h2); font-weight:900; margin:8px 0 6px;}
.co-success p{opacity:.95;}

/* Kill any theme sticky price bars inside modal */
#checkoutModal [data-sticky="price"], #checkoutModal #coStickyPrice{display:none!important;}
