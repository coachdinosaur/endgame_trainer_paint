(() => {
  'use strict';
  const SIZE=900, INSET=92, PAINT=6200, HOLD=2300, FADE=600, TAU=Math.PI*2;
  const canvas=document.getElementById('logoCanvas');
  const ctx=canvas.getContext('2d');
  const status=document.getElementById('status');
  const error=document.getElementById('error');
  const mask=document.createElement('canvas');
  const m=mask.getContext('2d');
  const painted=document.createElement('canvas');
  const p=painted.getContext('2d');
  mask.width=painted.width=SIZE; mask.height=painted.height=SIZE;
  const img=new Image();
  const clamp=v=>Math.max(0,Math.min(1,v));
  const smooth=v=>{v=clamp(v);return v*v*(3-2*v)};
  const ease=v=>{v=clamp(v);return v<.5?4*v*v*v:1-Math.pow(-2*v+2,3)/2};
  const phase=(v,a,b)=>smooth((v-a)/(b-a));
  let started=0, announced=false;

  function background(time){
    ctx.clearRect(0,0,SIZE,SIZE);
    const g=ctx.createRadialGradient(SIZE/2,SIZE/2,30,SIZE/2,SIZE/2,SIZE*.45);
    g.addColorStop(0,'rgba(35,255,169,.07)');g.addColorStop(.6,'rgba(15,103,73,.02)');g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;ctx.fillRect(0,0,SIZE,SIZE);
    ctx.save();ctx.translate(SIZE/2,SIZE/2);ctx.rotate(time*.00008);
    ctx.strokeStyle='rgba(110,255,195,.035)';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(0,0,350,0,TAU);ctx.stroke();ctx.restore();
  }

  function buildMask(progress){
    m.clearRect(0,0,SIZE,SIZE);m.save();m.lineCap='round';m.lineJoin='round';
    const ring=phase(progress,0,.32);
    if(ring>0){
      m.strokeStyle='#fff';m.lineWidth=126;m.beginPath();
      m.arc(SIZE/2,SIZE/2,348,-Math.PI/2,-Math.PI/2+TAU*ease(ring));m.stroke();
    }
    const scan=phase(progress,.20,.88);
    if(scan>0){
      const y=INSET+(SIZE-INSET*2)*ease(scan), feather=92;
      m.fillStyle='#fff';m.fillRect(INSET,INSET,SIZE-INSET*2,Math.max(0,y-INSET-feather*.55));
      const g=m.createLinearGradient(0,y-feather,0,y+feather);
      g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.55,'rgba(255,255,255,.94)');g.addColorStop(1,'rgba(255,255,255,0)');
      m.fillStyle=g;m.fillRect(INSET,y-feather,SIZE-INSET*2,feather*2);
    }
    const finish=phase(progress,.84,1);
    if(finish>0){m.fillStyle=`rgba(255,255,255,${finish})`;m.fillRect(INSET,INSET,SIZE-INSET*2,SIZE-INSET*2)}
    m.restore();
  }

  function logo(progress,time,opacity){
    p.clearRect(0,0,SIZE,SIZE);p.globalCompositeOperation='source-over';p.globalAlpha=1;
    p.drawImage(img,INSET,INSET,SIZE-INSET*2,SIZE-INSET*2);
    p.globalCompositeOperation='destination-in';p.drawImage(mask,0,0);p.globalCompositeOperation='source-over';
    const settled=phase(progress,.85,1), pulse=.5+.5*Math.sin(time*.0036);
    ctx.save();ctx.globalAlpha=opacity*(.42+settled*.19);ctx.shadowColor='#5effb8';ctx.shadowBlur=22+settled*15+pulse*3;ctx.drawImage(painted,0,0);ctx.restore();
    ctx.save();ctx.globalAlpha=opacity;ctx.drawImage(painted,0,0);ctx.restore();
  }

  function brushes(progress,time,opacity){
    const ring=phase(progress,0,.32);
    if(ring>0&&ring<1){
      const a=-Math.PI/2+TAU*ease(ring),x=SIZE/2+Math.cos(a)*348,y=SIZE/2+Math.sin(a)*348;
      const g=ctx.createRadialGradient(x,y,0,x,y,38);g.addColorStop(0,'rgba(235,255,245,.96)');g.addColorStop(.22,'rgba(105,255,192,.64)');g.addColorStop(1,'rgba(70,255,178,0)');
      ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=opacity;ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,38,0,TAU);ctx.fill();ctx.restore();
    }
    const scan=phase(progress,.20,.88);
    if(scan>0&&scan<1){
      const y=INSET+(SIZE-INSET*2)*ease(scan),left=INSET+20,right=SIZE-INSET-20;
      const g=ctx.createLinearGradient(left,y,right,y);g.addColorStop(0,'rgba(105,255,193,0)');g.addColorStop(.18,'rgba(105,255,193,.2)');g.addColorStop(.5,'rgba(230,255,242,.78)');g.addColorStop(.82,'rgba(105,255,193,.2)');g.addColorStop(1,'rgba(105,255,193,0)');
      ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=opacity;ctx.strokeStyle=g;ctx.lineWidth=3;ctx.shadowColor='#65ffbc';ctx.shadowBlur=15;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();ctx.restore();
    }
  }

  function frame(now){
    const total=PAINT+HOLD+FADE, elapsed=(now-started)%total;
    let progress=1,opacity=1;
    if(elapsed<PAINT) progress=clamp(elapsed/PAINT);
    else if(elapsed>PAINT+HOLD) opacity=1-smooth((elapsed-PAINT-HOLD)/FADE);
    buildMask(progress);background(now);logo(progress,now,opacity);brushes(progress,now,opacity);
    if(progress===1&&!announced){status.textContent='Endgame Trainer logo painting complete.';announced=true}
    if(progress<.03&&announced){status.textContent='Painting the Endgame Trainer logo.';announced=false}
    requestAnimationFrame(frame);
  }

  img.onload=()=>{started=performance.now();requestAnimationFrame(frame)};
  img.onerror=()=>{error.style.display='block';status.textContent='The Endgame Trainer logo could not be loaded.'};
  if(!window.LOGO_B64){error.style.display='block';status.textContent='The Endgame Trainer logo could not be loaded.';return;}
  img.src='data:image/webp;base64,'+window.LOGO_B64;
})();