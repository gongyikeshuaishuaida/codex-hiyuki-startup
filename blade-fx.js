/* Live footage refracts through fine ice fractures, then dissolves into cold mist. */
(function(scope){
  'use strict';
  scope.createHiyukiBladeFX=function({canvas,root,timing,reduced}){
    const doc=canvas.ownerDocument,ctx=canvas.getContext('2d');
    const W=canvas.width,H=canvas.height;
    const texture=doc.createElement('canvas');texture.width=W;texture.height=H;
    const textureCtx=texture.getContext('2d');
    const clamp=x=>Math.max(0,Math.min(1,x));
    const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
    const noise=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
    const cloud=doc.createElement('canvas');cloud.width=256;cloud.height=128;
    const cloudCtx=cloud.getContext('2d');cloudCtx.scale(2,1);
    const vapor=cloudCtx.createRadialGradient(64,64,0,64,64,64);
    vapor.addColorStop(0,'rgba(190,231,255,.38)');vapor.addColorStop(.3,'rgba(124,195,234,.18)');vapor.addColorStop(1,'rgba(112,186,235,0)');
    cloudCtx.fillStyle=vapor;cloudCtx.fillRect(0,0,128,128);
    const cx=W*.5,cy=H*.5125,slope=.115*H/W;
    const normal=Math.hypot(slope,1),nx=slope/normal,ny=1/normal,R=H*.7;
    const seam=Array.from({length:33},(_,i)=>[W*i/32,H*(.57-.115*i/32+(noise(i+17)-.5)*.012)]);
    const plates=[];
    for(const side of [-1,1]){
      const divisions=side<0?[0,9,23,32]:[0,12,26,32],outer=side<0?[0,.11,.71,1]:[0,.48,.63,1];
      for(let j=0;j<3;j++){
        const edge=seam.slice(divisions[j],divisions[j+1]+1),origin=[outer[j]*W,side<0?0:H],far=[outer[j+1]*W,side<0?0:H];
        for(const points of [[origin,far,edge.at(-1)],[origin,...edge.slice().reverse()]]){
          const path=new Path2D();points.forEach(([x,y],i)=>i?path.lineTo(x,y):path.moveTo(x,y));path.closePath();
          plates.push({path,side,id:plates.length});
        }
      }
    }
    let capturedSource=null,capturedFrame=-1;
    function reset(){capturedSource=null;capturedFrame=-1;}
    function render(seconds,source,sourceFrame){
      const age=seconds-timing.splitStart,end=timing.splitEnd-timing.splitStart;
      const active=!reduced&&age>=0&&age<end;
      if(!active){if(!canvas.hidden)ctx.clearRect(0,0,W,H);canvas.hidden=true;}
      root.dataset.transitionMode='live-crack-dissolve';
      root.dataset.transitionPhase=reduced?'reduced':age<0?'waiting':age<.28?'afterglow':age<end?'dissolve':'complete';
      root.dataset.transitionSourceFrame=String(sourceFrame);
      root.dataset.crackPlanes=String(plates.length);
      if(!active)return;
      canvas.hidden=false;ctx.clearRect(0,0,W,H);
      if(capturedSource!==source||capturedFrame!==sourceFrame){
        textureCtx.clearRect(0,0,W,H);textureCtx.drawImage(source,0,0,W,H);
        capturedSource=source;capturedFrame=sourceFrame;
      }
      // Refresh from the current movie frame, including throughout the dissolve.
      const progress=clamp(age/end),radius=H*.84*smooth((age-.08)/(end-.12));
      const feather=H*(.2+.14*progress),amount=smooth(age/.32);
      ctx.drawImage(texture,0,0);
      // A continuous live base fills the gaps: cracks refract, rather than cut to black.
      const crack=smooth(age/.11)*(1-smooth((age-.24)/.66));
      const separation=smooth(age/.75);
      if(crack>0)for(const plate of plates){
        const dx=(noise(plate.id+3)-.5)*W*.014*separation;
        const dy=plate.side*H*.045*separation;
        ctx.save();ctx.translate(dx,dy);ctx.globalAlpha=crack*.42;
        ctx.save();ctx.clip(plate.path);ctx.drawImage(texture,0,0);ctx.restore();
        ctx.globalAlpha=crack*.7;ctx.lineWidth=W/2100;ctx.strokeStyle='#d3f5ff';
        ctx.shadowColor='#72bded';ctx.shadowBlur=W*.002;ctx.stroke(plate.path);ctx.restore();
      }
      const alphaMask=ctx.createLinearGradient(cx-nx*R,cy-ny*R,cx+nx*R,cy+ny*R);
      const stop=d=>clamp(.5+d/(2*R));
      alphaMask.addColorStop(0,'rgba(0,0,0,0)');
      alphaMask.addColorStop(stop(-radius-feather),'rgba(0,0,0,0)');
      alphaMask.addColorStop(stop(-radius),`rgba(0,0,0,${amount})`);
      alphaMask.addColorStop(stop(radius),`rgba(0,0,0,${amount})`);
      alphaMask.addColorStop(stop(radius+feather),'rgba(0,0,0,0)');
      alphaMask.addColorStop(1,'rgba(0,0,0,0)');
      ctx.globalCompositeOperation='destination-out';ctx.fillStyle=alphaMask;ctx.fillRect(0,0,W,H);
      // The remaining corners fade as the opening reaches the window edges.
      const residual=1-smooth((age-.57)/(end-.59));
      ctx.globalCompositeOperation='destination-in';ctx.fillStyle=`rgba(0,0,0,${residual})`;ctx.fillRect(0,0,W,H);
      ctx.globalCompositeOperation='source-over';
      const haze=smooth(age/.15)*(1-smooth((age-.4)/(end-.4)));
      // Low-opacity volumes follow the blade direction and disperse into the host.
      for(let i=0;i<9;i++){
        const side=i%2?1:-1;
        const x=W*(.08+noise(i+21)*.84)+age*W*(noise(i+18)-.6)*.12;
        const y=H*(.57-.115*x/W)+side*radius*.65+Math.sin(i*2+age)*H*.025;
        const width=W*(.22+.12*noise(i+32)),height=H*(.12+.1*noise(i+33));
        ctx.globalAlpha=haze*(.18+.2*noise(i+13));ctx.drawImage(cloud,x-width/2,y-height/2,width,height);
      }
      const glint=(1-smooth(age/.32))*smooth(age/.05);
      if(glint>0){
        ctx.save();ctx.translate(cx,cy);ctx.rotate(-Math.atan(slope));ctx.scale(1,.085);
        const light=ctx.createRadialGradient(0,0,0,0,0,W*.55);
        light.addColorStop(0,'rgba(218,248,255,.14)');light.addColorStop(.3,'rgba(139,213,255,.07)');light.addColorStop(1,'rgba(100,190,250,0)');
        ctx.globalAlpha=glint;ctx.fillStyle=light;ctx.fillRect(-W*.6,-W*.6,W*1.2,W*1.2);ctx.restore();
      }
      for(let i=0;i<54;i++){
        const side=i%2?1:-1,x0=noise(i+82)*W;
        const x=x0+age*W*(noise(i+14)-.5)*.14;
        const y=H*(.57-.115*x0/W)+side*age*H*(.07+.18*noise(i+55));
        const r=(.6+1.4*noise(i+64))*W/2560;
        ctx.globalAlpha=haze*(.12+.38*noise(i+31));ctx.fillStyle='#d8f4ff';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
      }
      // Small splinters echo the opening crystals and fade with the same ice mist.
      for(let i=0;i<18;i++){
        const side=i%2?1:-1,x0=W*(.05+.9*noise(i+61));
        const x=x0+(noise(i+11)-.5)*W*.14*age;
        const y=H*(.57-.115*x0/W)+side*H*.25*age;
        const size=W*(.002+.0035*noise(i+17));
        ctx.save();ctx.translate(x,y);ctx.rotate(age*(noise(i+19)-.5)*4);
        ctx.globalAlpha=crack*.55;ctx.strokeStyle='#cff6ff';ctx.fillStyle='#a4dafa33';ctx.lineWidth=W/2500;
        ctx.beginPath();ctx.moveTo(-size,0);ctx.lineTo(size*.25,-size*.45);ctx.lineTo(size,size*.2);ctx.lineTo(-size*.3,size*.65);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
      }
      ctx.globalAlpha=1;
    }
    return {render,reset};
  };
})(window);
