// Year auto update
document.addEventListener("DOMContentLoaded", () => {
  const y = document.getElementById("year");
  if (y) y.innerText = new Date().getFullYear();
});

/* ---------- Scroll Reveal ---------- */
const revealEls = document.querySelectorAll(".reveal");
const io = new IntersectionObserver((entries)=>{
  entries.forEach((e)=>{
    if(e.isIntersecting){
      e.target.classList.add("in");
      io.unobserve(e.target);
    }
  });
},{threshold:0.15});
revealEls.forEach(el=>io.observe(el));

/* ---------- Premium Tilt Hover ---------- */
function tilt(el, strength=10){
  el.addEventListener("mousemove",(e)=>{
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const rx = ((y / r.height) - 0.5) * -strength;
    const ry = ((x / r.width) - 0.5) * strength;
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
  });
  el.addEventListener("mouseleave",()=>{
    el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px)";
  });
}
document.querySelectorAll(".tilt").forEach(el=>tilt(el, 10));
document.querySelectorAll(".tilt-mini").forEach(el=>tilt(el, 7));

/* ---------- Particles Canvas ---------- */
const canvas = document.getElementById("particles");
const ctx = canvas.getContext("2d");
let W, H;

function resize(){
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

const dots = Array.from({length: 85}, ()=>({
  x: Math.random()*W,
  y: Math.random()*H,
  r: Math.random()*1.6+0.2,
  vx: (Math.random()-0.5)*0.35,
  vy: (Math.random()-0.5)*0.35,
  a: Math.random()*0.7+0.2
}));

function draw(){
  ctx.clearRect(0,0,W,H);

  for(const d of dots){
    d.x += d.vx; d.y += d.vy;
    if(d.x<0 || d.x>W) d.vx *= -1;
    if(d.y<0 || d.y>H) d.vy *= -1;

    ctx.beginPath();
    ctx.arc(d.x,d.y,d.r,0,Math.PI*2);
    ctx.fillStyle = `rgba(34,211,238,${d.a})`;
    ctx.fill();
  }

  for(let i=0;i<dots.length;i++){
    for(let j=i+1;j<dots.length;j++){
      const a=dots[i], b=dots[j];
      const dx=a.x-b.x, dy=a.y-b.y;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<130){
        ctx.beginPath();
        ctx.moveTo(a.x,a.y);
        ctx.lineTo(b.x,b.y);
        ctx.strokeStyle=`rgba(59,130,246,${(1-dist/130)*0.12})`;
        ctx.lineWidth=1;
        ctx.stroke();
      }
    }
  }

  requestAnimationFrame(draw);
}
draw();
