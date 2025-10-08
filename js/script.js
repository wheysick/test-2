/* ===== script.js v5.3 — date, countdown, scroll progress + COA flip ===== */
(function(){
  const today = new Date();
  const opts = {year:'numeric', month:'long', day:'numeric'};
  const todayEl = document.getElementById('todayDate');
  if (todayEl) todayEl.textContent = today.toLocaleDateString(undefined, opts);

  const yEl = document.getElementById('year');
  if (yEl) yEl.textContent = today.getFullYear();

  // Countdown to midnight
  const cdEl = document.getElementById('countdown');
  if (cdEl){
    function tick(){
      const now = new Date();
      const end = new Date(); end.setHours(23,59,59,999);
      const ms = Math.max(0, end - now);
      const h = String(Math.floor(ms/3.6e6)).padStart(2,'0');
      const m = String(Math.floor(ms%3.6e6/6e4)).padStart(2,'0');
      const s = String(Math.floor(ms%6e4/1e3)).padStart(2,'0');
      cdEl.textContent = `${h}:${m}:${s}`;
      requestAnimationFrame(tick);
    }
    tick();
  }

  // Scroll progress
  const bar = document.getElementById('scrollProgress');
  if (bar){
    const onScroll = () => {
      const el = document.documentElement;
      const scrolled = (el.scrollTop)/(el.scrollHeight - el.clientHeight);
      bar.style.transform = `scaleX(${Math.max(0,Math.min(1,scrolled))})`;
    };
    document.addEventListener('scroll', onScroll, {passive:true});
    onScroll();
  }

  // COA flip logic (under product image)
  const productImg = document.getElementById('productImg');
  const coaLink = document.getElementById('coaLink');
  const imgs = {
    product: productImg ? productImg.getAttribute('data-src') || productImg.src : '',
    coa: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22900%22%20height%3D%22600%22%3E%0A%20%20%3Crect%20fill%3D%22%2311161c%22%20width%3D%22100%25%22%20height%3D%22100%25%22/%3E%0A%20%20%3Ctext%20x%3D%2250%25%22%20y%3D%2245%25%22%20fill%3D%22%23E9ECF2%22%20font-family%3D%22Inter%2CArial%22%20font-size%3D%2228%22%20text-anchor%3D%22middle%22%3ECertificate%20of%20Analysis%3C/text%3E%0A%20%20%3Ctext%20x%3D%2250%25%22%20y%3D%2255%25%22%20fill%3D%22%239aa3af%22%20font-family%3D%22Inter%2CArial%22%20font-size%3D%2216%22%20text-anchor%3D%22middle%22%3EPlaceholder%3C/text%3E%0A%3C/svg%3E'
  };
  let showCoa = false;
  if (coaLink && productImg){
    productImg.style.transition = 'transform 260ms ease';
    productImg.style.transformOrigin = '50% 50%';
    coaLink.addEventListener('click', (e)=>{
      e.preventDefault();
      productImg.style.transform = 'rotateY(90deg)';
      setTimeout(()=>{
        showCoa = !showCoa;
        productImg.src = showCoa ? imgs.coa : imgs.product;
        productImg.style.transform = 'rotateY(0deg)';
      }, 260);
    });
  }
})();
