/* ===== script.js v5.1 — date, countdown, scroll progress ===== */
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
})();
