// Verge‑style v3 behaviors (keeps CRO logic from v2)

const $=(s,c=document)=>c.querySelector(s);
const $$=(s,c=document)=>[...c.querySelectorAll(s)];

// Dates
(()=>{const now=new Date();const opts={year:'numeric',month:'short'};$('#todayDate').textContent=now.toLocaleDateString(undefined,opts);$('#year')&&($('#year').textContent=now.getFullYear());})();

// Countdown to midnight
(()=>{const el=$('#countdown');function midnight(){const t=new Date();t.setHours(24,0,0,0);return t}function tick(){const ms=midnight()-new Date();const h=Math.floor((ms/36e5)%24),m=Math.floor((ms/6e4)%60),s=Math.floor((ms/1e3)%60);el.textContent=[h,m,s].map(n=>String(n).padStart(2,'0')).join(':');requestAnimationFrame(tick)}tick()})();

// Inventory scarcity
(()=>{const KEY='invV3';let c=parseInt(localStorage.getItem(KEY),10);if(!c||isNaN(c)){c=Math.floor(Math.random()*9)+22;localStorage.setItem(KEY,c)}const outs=['#stockCount','#stockSmall'].map(s=>$(s));const bar=$('#stockBar');function render(){outs.forEach(el=>el&&(el.textContent=c));bar&&(bar.style.width=Math.max(12,Math.round((c/30)*100))+'%')}render();const i=setInterval(()=>{if(c>4){if(Math.random()<.35){c--;localStorage.setItem(KEY,c);render()}}else clearInterval(i)},60_000);$$('[data-cta]').forEach(b=>b.addEventListener('click',()=>{c=Math.max(3,c-1);localStorage.setItem(KEY,c);render()}));})();

// FAQ smooth toggle
(()=>{$$('.faq-item').forEach(it=>{const q=$('.faq-question',it),a=$('.faq-answer',it);if(!q||!a)return;a.style.maxHeight='0px';q.addEventListener('click',()=>{const open=it.classList.toggle('active');a.style.maxHeight=open?a.scrollHeight+'px':'0px'})})})();

// Reveal
(()=>{const els=$$('.reveal');const io=new IntersectionObserver(es=>{es.forEach(({isIntersecting,target})=>{if(isIntersecting){target.classList.add('visible');io.unobserve(target)}})},{threshold:.12});els.forEach(el=>io.observe(el));})();

// =============================
// Theme locked to dark mode
// =============================
(() => {
  // Force dark mode styling and prevent errors if toggle is missing
  document.body.classList.add('dark-mode');
})();

// View popup
(()=>{const p=$('#viewPopup'),x=$('#closePopup'),n=$('#popupCount'),src=$('#viewCount');const target=parseInt(src?.textContent.replace(/,/g,''))||120000;let cur=0,step=target/60;function up(){cur+=step;if(cur>target)cur=target;n.textContent=Math.floor(cur).toLocaleString();if(cur<target)requestAnimationFrame(up)}function show(){p.classList.add('show');up();setTimeout(()=>p.classList.remove('show'),8000)}setTimeout(show,1200);x?.addEventListener('click',()=>p.classList.remove('show'))})();

// Progress & floating CTA
(()=>{const bar=$('#scrollProgress');const f=$('#floatingCta');function on(){const top=scrollY;const doc=document.body.scrollHeight-innerHeight;bar.style.width=(Math.max(0,Math.min(1,top/doc))*100)+'%';f.classList.toggle('show',top>420)}addEventListener('scroll',on,{passive:true});on()})();

// Toasts
(()=>{const names=['Alex','Jamie','Priya','Chris','Taylor','Jordan','Sam','Riley','Morgan','Devan','Jules','Casey'];const cities=['Austin, TX','Seattle, WA','Miami, FL','Brooklyn, NY','Nashville, TN','San Diego, CA','Chicago, IL','Tampa, FL','Phoenix, AZ'];const el=$('#toasts');function show(){const t=document.createElement('div');const name=names[Math.floor(Math.random()*names.length)];const city=cities[Math.floor(Math.random()*cities.length)];t.className='toast';t.innerHTML=`✅ <strong>${name}</strong> from ${city} just reserved a free sample.`;el.appendChild(t);setTimeout(()=>t.classList.add('show'),30);setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),350)},6500)}setInterval(()=>{if(Math.random()<.22)show()},12000)})();
