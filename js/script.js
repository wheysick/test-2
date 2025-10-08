/* ===== script.js v5.7 — date, countdown (multi-target), COA flip ===== */
(function(){
  const today = new Date();
  const fmtDate = {year:'numeric', month:'long', day:'numeric'};
  const dateEl = document.getElementById('todayDate');
  if (dateEl) dateEl.textContent = today.toLocaleDateString(undefined, fmtDate);

  const yEl = document.getElementById('year'); if (yEl) yEl.textContent = today.getFullYear();

  // Countdown to midnight — update all [data-countdown] nodes and #countdown
  const cdNodes = Array.from(document.querySelectorAll('[data-countdown]'));
  const cdId = document.getElementById('countdown');
  function tick(){
    const now = new Date();
    const end = new Date(); end.setHours(23,59,59,999);
    const ms = Math.max(0, end - now);
    const h = String(Math.floor(ms/3.6e6)).padStart(2,'0');
    const m = String(Math.floor(ms%3.6e6/6e4)).padStart(2,'0');
    const s = String(Math.floor(ms%6e4/1e3)).padStart(2,'0');
    const t = `${h}:${m}:${s}`;
    if (cdId) cdId.textContent = t;
    cdNodes.forEach(n=>n.textContent=t);
    requestAnimationFrame(tick);
  }
  tick();

  // COA flip logic (under product image)
  const productImg = document.getElementById('productImg');
  const coaLink = document.getElementById('coaLink');
  const productSrc = productImg?.getAttribute('data-src') || productImg?.src || '';
  const coaSvg = `data:image/svg+xml;utf8,`+encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='900' height='600'><rect fill='#11161c' width='100%' height='100%'/><text x='50%' y='45%' fill='#E9ECF2' font-family='Inter,Arial' font-size='28' text-anchor='middle'>Certificate of Analysis</text><text x='50%' y='55%' fill='#9aa3af' font-family='Inter,Arial' font-size='16' text-anchor='middle'>Placeholder</text></svg>`);
  let showCoa = false;
  if (coaLink && productImg){
    productImg.style.transition = 'transform 260ms ease';
    productImg.style.transformOrigin = '50% 50%';
    coaLink.addEventListener('click', (e)=>{
      e.preventDefault();
      productImg.style.transform = 'rotateY(90deg)';
      setTimeout(()=>{
        showCoa = !showCoa;
        productImg.src = showCoa ? coaSvg : productSrc;
        productImg.style.transform = 'rotateY(0deg)';
      }, 260);
    });
  }
})();
