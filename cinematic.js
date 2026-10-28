/* Hiyuki's luminous reconstruction. Each stroke advances along its own arc length. */
(function(scope){
  'use strict';
  scope.createHiyukiCinematic=function({root,canvas,staticCanvas,art,plate,paths,reduced,onReveal}){
    const doc=root.ownerDocument,ctx=canvas.getContext('2d'),ink=staticCanvas.getContext('2d');
    const clamp=x=>Math.max(0,Math.min(1,x));
    const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
    const noise=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
    const scene=doc.querySelector('.scene'),copy=doc.querySelector('.cinematic-copy');
    const caption=doc.querySelector('.subtitle'),vignette=doc.querySelector('.cinematic-vignette');
    const closingLine=doc.querySelector('.shutter-line');
    const slash=doc.querySelector('.slash-motion'),slashCtx=slash.getContext('2d');
    const snow=doc.querySelector('.snow-entry'),snowCtx=snow.getContext('2d');
    const visual=scope.STARTUP_VISUAL||{},continuous=Boolean(visual.continuousFrameHold);
    const motion=visual.motion||{frameWidth:960,frameHeight:540,columns:5,frames:45,fps:30,start:7.9};
    const timing=visual.timeline;
    const focus=visual.focus,refined=doc.querySelector('.refined-artwork');
    const bladeFX=scope.createHiyukiBladeFX({canvas:doc.querySelector('.blade-fx'),root,timing,reduced});
    let crystal=null,crystalSprites=[];
    function setCrystal(image){
      crystal=image;crystalSprites=[];
      if(!image)return;
      for(const blur of [0,2,7]){
        const sprite=doc.createElement('canvas');sprite.width=sprite.height=384;
        const context=sprite.getContext('2d');context.filter=`blur(${blur}px)`;
        context.drawImage(image,0,0,384,384);crystalSprites.push(sprite);
      }
    }
    snow.width=canvas.width;snow.height=canvas.height;
    const cut=doc.querySelector('.blade-cut');
    let slashImage=null,slashTailImage=null,slashEnabled=false,lastSlashFrame=-1;
    let slashVideo=null,motionPlaying=false;
    function setVideo(video,enabled){slashVideo=video;slashEnabled=enabled;lastSlashFrame=-1;slash.hidden=!enabled||reduced;slash.dataset.available=String(enabled);}
    function setPlaying(value){motionPlaying=value;if(!value)slashVideo?.pause();}
    let strokes=[],completion=[],completed=0,lastProgress=-1,previousTime=-1;
    let snowTargets=[];
    function curve(points){
      const path=new Path2D();path.moveTo(...points[0]);
      if(points.length===2){path.lineTo(...points[1]);return path;}
      for(let i=1;i<points.length-1;i++){
        const a=points[i],b=points[i+1];path.quadraticCurveTo(a[0],a[1],(a[0]+b[0])/2,(a[1]+b[1])/2);
      }
      path.lineTo(...points[points.length-1]);return path;
    }
    function reset(){
      ink.clearRect(0,0,staticCanvas.width,staticCanvas.height);
      ctx.clearRect(0,0,canvas.width,canvas.height);completed=0;lastProgress=-1;previousTime=-1;
      lastSlashFrame=-1;
      bladeFX.reset();
    }
    function setSlash(image,enabled,tailImage){
      slashImage=image;slashTailImage=tailImage;slashEnabled=enabled;lastSlashFrame=-1;
      slash.dataset.available=String(enabled);slash.hidden=!enabled||reduced;
      slash.dataset.continuationAvailable=String(Boolean(tailImage));
    }
    function setPaths(next){
      strokes=next.map((path,i)=>{
        const distance=[0];for(let j=1;j<path.points.length;j++)distance.push(distance[j-1]+Math.hypot(path.points[j][0]-path.points[j-1][0],path.points[j][1]-path.points[j-1][1]));
        const short=path.total<30,face=path.group==='face';
        const start=(short?.42:face?.24:.015)+noise(i+13)*(short?.29:face?.36:.48);
        const length=.17+Math.min(.21,path.total/2400);
        return {...path,distance,start,end:Math.min(.99,start+length),full:curve(path.points),strength:path.strength??.7};
      });
      completion=[...strokes].sort((a,b)=>a.end-b.end);reset();
      snowTargets=strokes.filter((_,i)=>i%Math.max(1,Math.floor(strokes.length/130))===0).slice(0,130).map(path=>path.points[0]);
      canvas.dataset.paths=String(strokes.length);
      canvas.dataset.facePaths=String(strokes.filter(path=>path.group==='face').length);
    }
    function pointAt(stroke,distance){
      const d=stroke.distance,p=stroke.points;
      let lo=0,hi=d.length-1;
      while(lo<hi){const mid=(lo+hi)>>1;if(d[mid]<distance)lo=mid+1;else hi=mid;}
      if(!lo)return p[0];const f=(distance-d[lo-1])/Math.max(.0001,d[lo]-d[lo-1]);
      return [p[lo-1][0]+(p[lo][0]-p[lo-1][0])*f,p[lo-1][1]+(p[lo][1]-p[lo-1][1])*f];
    }
    function append(path,stroke,start,end){
      start=Math.max(0,start);end=Math.min(stroke.total,end);if(end<=start)return;
      path.moveTo(...pointAt(stroke,start));
      for(let i=1;i<stroke.points.length;i++)if(stroke.distance[i]>start&&stroke.distance[i]<end)path.lineTo(...stroke.points[i]);
      path.lineTo(...pointAt(stroke,end));
    }
    function draw(progress){
      if(progress<lastProgress)reset();lastProgress=progress;
      ink.lineCap=ink.lineJoin='round';
      while(completed<completion.length&&completion[completed].end<=progress){
        const path=completion[completed++];
        ink.strokeStyle=`rgba(170,213,255,${.27+.62*path.strength})`;
        ink.lineWidth=path.group==='face'?1.05:1.05+.65*path.strength;
        ink.stroke(path.full);
      }
      ctx.clearRect(0,0,canvas.width,canvas.height);
      if(progress>=1||progress<=0)return;
      const bodies=new Path2D(),tails=new Path2D(),hot=new Path2D(),heads=[];
      for(const path of strokes){
        if(progress<=path.start||progress>=path.end)continue;
        const fraction=clamp((progress-path.start)/(path.end-path.start));
        const end=path.total*fraction,trail=Math.min(92,path.total*.45);
        append(bodies,path,0,end);append(tails,path,end-trail,end);append(hot,path,end-trail*.22,end);
        if(path.total>85&&heads.length<44)heads.push(pointAt(path,end));
      }
      ctx.lineCap=ctx.lineJoin='round';
      ctx.strokeStyle='rgba(110,178,236,.45)';ctx.lineWidth=1.2;ctx.stroke(bodies);
      ctx.strokeStyle='rgba(83,164,255,.12)';ctx.lineWidth=7;ctx.stroke(tails);
      ctx.strokeStyle='rgba(142,203,255,.45)';ctx.lineWidth=2.2;ctx.stroke(tails);
      ctx.strokeStyle='#e4f6ff';ctx.lineWidth=1.25;ctx.stroke(hot);
      ctx.fillStyle='#f3fcff';ctx.beginPath();for(const [x,y] of heads){ctx.moveTo(x+1.7,y);ctx.arc(x,y,1.7,0,Math.PI*2);}ctx.fill();
    }
    function renderSnow(seconds){
      const active=!reduced&&seconds<4.1;
      snow.hidden=!active;root.dataset.snowPhase=reduced?'reduced':seconds<1.65?'crystal':seconds<4.1?'gathering':'complete';
      if(!active)return;
      const W=snow.width,H=snow.height,cx=W*.5,cy=H*.5;
      snowCtx.clearRect(0,0,W,H);
      const arrival=ease(seconds/.65),fade=1-ease((seconds-2.65)/1.4);
      // Moving volumes of cold mist; each layer travels at a different depth.
      for(let layer=0;layer<3;layer++){
        const x=W*(.25+.24*layer)+Math.sin(seconds*.6+layer*2)*W*.14;
        const y=H*(.4+.1*Math.sin(seconds*.7+layer));
        const fog=snowCtx.createRadialGradient(x,y,0,x,y,W*(.32+.06*layer));
        fog.addColorStop(0,`rgba(64,124,173,${arrival*fade*(.18-layer*.035)})`);
        fog.addColorStop(.45,`rgba(36,76,119,${arrival*fade*.07})`);fog.addColorStop(1,'rgba(5,10,18,0)');
        snowCtx.fillStyle=fog;snowCtx.fillRect(0,0,W,H);
      }
      // Crystals drift through the camera in several focal planes. No glyphs.
      if(crystal)for(let i=0;i<32;i++){
        const hero=i===0,depth=hero?1:noise(i+73);
        const size=hero?W*(.21+.12*ease(seconds/2.3)):W*(.008+.065*depth*depth);
        const x=hero?W*(.57-.3*ease(seconds/2.35)):((noise(i+14)*1.5-seconds*(.022+.09*depth)+2)%1.5-.25)*W;
        const y=hero?H*(.48+.2*ease(seconds/2.35)):((noise(i+31)+seconds*(.02+.065*depth))%1.25-.125)*H;
        const visibility=hero?1-ease((seconds-1.55)/.85):fade;
        snowCtx.save();snowCtx.globalAlpha=arrival*visibility*(hero?.96:.15+.57*depth);
        snowCtx.translate(x,y);snowCtx.rotate(noise(i+44)*6+seconds*(hero?.15:(depth-.3)*.4));
        snowCtx.scale(.8+.18*Math.cos(seconds*.6+i),1);
        snowCtx.drawImage(crystalSprites[hero?0:depth>.8?2:depth<.3?1:0],-size/2,-size/2,size,size);snowCtx.restore();
      }
      // Fine wind-driven snow spirals settle onto the actual portrait contours.
      const gather=ease((seconds-1.45)/2.25);
      snowCtx.beginPath();
      snowTargets.forEach(([tx,ty],i)=>{
        const angle=noise(i+8)*Math.PI*2+seconds*.65,radius=W*(.2+.5*noise(i+113))*(1-gather);
        const x=tx*gather+(cx+Math.cos(angle)*radius)*(1-gather);
        const y=ty*gather+(cy+Math.sin(angle)*radius*.65)*(1-gather);
        const r=1+noise(i+3)*2;snowCtx.moveTo(x+r,y);snowCtx.arc(x,y,r,0,Math.PI*2);
      });
      snowCtx.fillStyle=`rgba(206,239,255,${arrival*fade*.8})`;snowCtx.fill();
      snowCtx.beginPath();
      for(let i=0;i<210;i++){
        const d=noise(i+81),x=((noise(i+33)*1.5-seconds*(.04+.18*d)+3)%1.5-.25)*W;
        const y=((noise(i+12)+seconds*(.03+.08*d))%1.2-.1)*H,r=.7+2*d*d;
        snowCtx.moveTo(x+r,y);snowCtx.arc(x,y,r,0,Math.PI*2);
      }
      snowCtx.fillStyle=`rgba(185,223,246,${arrival*fade*.38})`;snowCtx.fill();
      snow.dataset.flakes='372';snow.dataset.crystalReady=String(Boolean(crystal));
    }
    function render(seconds){
      if(seconds<previousTime)reset();previousTime=seconds;
      const construction=reduced?1:clamp((seconds-timing.traceStart)/(timing.traceEnd-timing.traceStart));
      const material=reduced?ease((seconds-.2)/.7):ease((seconds-timing.materialStart)/(timing.materialEnd-timing.materialStart));
      const detail=reduced?0:ease((seconds-timing.plateStart)/(timing.plateEnd-timing.plateStart));
      const hasRefined=!refined.hidden;
      const focusIn=hasRefined&&!reduced?ease((seconds-focus.start)/(focus.peak-focus.start)):0;
      const focusOut=hasRefined&&!reduced?1-ease((seconds-focus.recoverStart)/(focus.recoverEnd-focus.recoverStart)):0;
      const mix=hasRefined&&!reduced?ease((seconds-focus.mixStart)/(focus.mixEnd-focus.mixStart)):0;
      const blur=focus.blurPx*focusIn*focusOut;
      refined.style.opacity=String(hasRefined?material*(visual.refinementStrength??1)*(1-mix):0);
      refined.style.filter=`${visual.portraitMode==='original-preserving'?'url("#source-clarity") ':''}blur(${(focus.blurPx*focusIn/canvas.width*100).toFixed(4)}cqi)`;
      refined.dataset.detail=seconds<focus.start?visual.portraitMode:mix<1?'soft-handoff':'native-motion';
      draw(construction);
      renderSnow(seconds);
      const hasPlate=!plate.hidden;
      plate.style.opacity=String(detail*(1-material));
      art.style.opacity=String(continuous&&slashEnabled&&!reduced?0:material);
      staticCanvas.style.opacity=String((1-material)*(hasPlate?1-.78*detail:1));
      canvas.style.opacity=String((1-material)*(1-.65*detail));
      const scale=reduced||continuous?1:1+.012*ease((seconds-5.9)/3.1);
      art.style.transform=plate.style.transform=`scale(${scale})`;
      refined.style.transform=`scale(${scale})`;
      const actionFade=slashEnabled&&!reduced?(hasRefined?1-focusIn:1-ease((seconds-(motion.start-.22))/.22)):1;
      const title=ease((seconds-timing.titleStart)/(timing.titleEnd-timing.titleStart));
      copy.style.opacity=String(title*actionFade);
      copy.style.transform=`translateY(calc(-50% + ${(1-title)*12}px))`;
      vignette.style.opacity=String(ease((seconds-timing.plateStart)/1.7)*actionFade);
      caption.style.opacity=String(ease((seconds-timing.subtitleStart)/.7)*actionFade);
      if(slashEnabled&&!reduced){
        let frame=Math.min(motion.frames-1,Math.max(0,Math.floor((seconds-motion.start)*motion.fps+1e-6)));
        if(slashVideo){
          const target=Math.max(0,Math.min(slashVideo.duration-1/motion.fps,seconds-motion.start));
          if(seconds<motion.start){slashVideo.pause();if(slashVideo.currentTime>.001)slashVideo.currentTime=0;}
          else if(motionPlaying&&target<slashVideo.duration-1/motion.fps){
            if(Math.abs(slashVideo.currentTime-target)>.16&&!slashVideo.seeking)slashVideo.currentTime=target;
            if(slashVideo.paused)slashVideo.play().catch(()=>{slash.dataset.playbackError='true';});
          }else{slashVideo.pause();}
          frame=Math.min(motion.frames-1,Math.floor(slashVideo.currentTime*motion.fps+1e-4));
        }
        if((continuous||seconds>=motion.start)&&lastSlashFrame!==frame){
          const tail=slashTailImage&&frame>=motion.primaryFrames;
          const spec=tail?motion.continuation:motion,localFrame=tail?frame-motion.primaryFrames:Math.min(frame,motion.primaryFrames-1);
          if(slashVideo){if(slashVideo.readyState>=2&&!slashVideo.seeking){slashCtx.drawImage(slashVideo,0,0,slash.width,slash.height);lastSlashFrame=frame;}}
          else{slashCtx.drawImage(tail?slashTailImage:slashImage,(localFrame%spec.columns)*spec.frameWidth,Math.floor(localFrame/spec.columns)*spec.frameHeight,spec.frameWidth,spec.frameHeight,0,0,slash.width,slash.height);lastSlashFrame=frame;}
        }
        // Original frame remains under the registered enhancement, preserving
        // its colors and identity cues. Both layers defocus before the handoff.
        slash.style.opacity=String(continuous?material:ease((seconds-motion.start)/.14));
        slash.style.filter=`blur(${(blur/canvas.width*100).toFixed(4)}cqi)`;
        slash.dataset.frame=String(frame);
        slash.dataset.pose=seconds<motion.start?'hold':'action';
      }else{slash.style.opacity='0';slash.dataset.frame='-1';}
      const splitting=seconds>=timing.splitStart;
      const wipe=reduced?Number(splitting):ease((seconds-timing.splitStart)/(timing.splitEnd-timing.splitStart));
      root.classList.toggle('closing',splitting);doc.body.classList.toggle('closing',splitting);
      scene.style.opacity=splitting?'0':'1';scene.style.transform='none';scene.style.clipPath='none';
      bladeFX.render(seconds,slashEnabled&&!reduced?slash:art,lastSlashFrame);
      closingLine.style.opacity='0';
      cut.style.opacity='0';
      root.dataset.wipe=wipe.toFixed(3);
      root.dataset.splitDirection='crack-and-soft-up-down';
      if(splitting)onReveal();
      doc.querySelectorAll('.particle').forEach((node,i)=>{
        node.style.opacity=String(ease(seconds/.8)*(1-wipe)*actionFade*(.1+.22*(.5+.5*Math.sin(seconds*.7+i))));
        node.style.transform=`translate(${Math.sin(seconds*.3+i)*18+seconds*(i%2?3:-2)}px,${seconds*(4+i%5)}px) rotate(${i*31+seconds*11}deg)`;
      });
      canvas.dataset.progress=construction.toFixed(3);canvas.dataset.completedPaths=String(completed);
      return splitting?'frost-dissolve':slashEnabled&&!reduced&&seconds>=motion.start?'sword-slash':!reduced&&seconds<timing.traceStart?'snow-crystal':seconds<timing.plateStart?'drawing':seconds<timing.materialStart?'filaments':seconds<timing.materialEnd?'colorize':'portrait';
    }
    setPaths(paths);return {render,reset,setPaths,setSlash,setCrystal,setVideo,setPlaying};
  };
})(window);
