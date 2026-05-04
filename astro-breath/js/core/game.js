'use strict';
const GAME_SETTINGS = {
  PLANET_GRAVITY_ENABLED: false,
  PLANET_COLLISION_ENABLED: true,
  PLANET_SUPPLY_ENABLED: false,
  STATION_SUPPLY_ENABLED: true,
  ...(window.GAME_SETTINGS || {}),
};
const PLANET_SETTINGS = {
  gravityEnabled: GAME_SETTINGS.PLANET_GRAVITY_ENABLED,
  collisionEnabled: GAME_SETTINGS.PLANET_COLLISION_ENABLED,
  radiusScale: 1,
  distanceScale: 8,
  enabledBodyIds: ['sun'],
  ...(window.PLANET_SETTINGS || {}),
};
GAME_SETTINGS.PLANET_GRAVITY_ENABLED = PLANET_SETTINGS.gravityEnabled;
GAME_SETTINGS.PLANET_COLLISION_ENABLED = PLANET_SETTINGS.collisionEnabled;
const SOLAR_SYSTEM_CENTER = { x: 6000, y: 6000 };

const { Engine, Bodies, Body, Composite } = Matter;

// ════════════════════════════════════════════════════
//  행성 데이터
// ════════════════════════════════════════════════════
const SOLAR_BODIES = [
  {
    id:'sun', name:'태양', nameEn:'SUN',
    x:6000,y:6000, radius:520,
    gravityStrength:0, gravityRange:0, surfaceMargin:80,
    color:'#fff7a0', dot:'#ffdd00', draw:drawSun,
    supply:null, supplyRadius:0,
    dangerHeat: true,  // 가까이 가면 열 데미지
    heatRadius: 900,   // 이 거리 이내면 가열 시작
    scoreVisit: 0,
  },
  {
    id:'mercury', name:'수성', nameEn:'MERCURY',
    x:6000+1400,y:6000, radius:38,
    gravityStrength:0.0012, gravityRange:500, surfaceMargin:12,
    color:'#a0907a', dot:'#b0a090', draw:drawMercury,
    supply:'fuel', supplyRadius:200,   // 착륙 안해도 근접하면 보급
    dangerHeat:false, heatRadius:0,
    scoreVisit:300,
  },
  {
    id:'venus', name:'금성', nameEn:'VENUS',
    x:6000+2200,y:6000, radius:75,
    gravityStrength:0.0032, gravityRange:700, surfaceMargin:14,
    color:'#e8c060', dot:'#f0d070', draw:drawVenus,
    supply:'fuel', supplyRadius:250,
    dangerHeat:false, heatRadius:0,
    scoreVisit:400,
  },
  {
    id:'earth', name:'지구', nameEn:'EARTH',
    x:6000+3200,y:6000, radius:82,
    gravityStrength:0.0038, gravityRange:750, surfaceMargin:14,
    color:'#2a7ab0', dot:'#3a9ad0', draw:drawEarth,
    supply:'both', supplyRadius:280,   // 산소+연료 모두
    dangerHeat:false, heatRadius:0,
    scoreVisit:500,
  },
  {
    id:'mars', name:'화성', nameEn:'MARS',
    x:6000+4400,y:6000, radius:55,
    gravityStrength:0.0018, gravityRange:580, surfaceMargin:12,
    color:'#c04828', dot:'#d06040', draw:drawMars,
    supply:'both', supplyRadius:220,
    dangerHeat:false, heatRadius:0,
    scoreVisit:600,
  },
  {
    id:'jupiter', name:'목성', nameEn:'JUPITER',
    x:6000-2200,y:6000+1800, radius:280,
    gravityStrength:0.018, gravityRange:2200, surfaceMargin:20,
    color:'#c8a060', dot:'#d8b070', draw:drawJupiter,
    supply:'fuel', supplyRadius:600,   // 착륙 힘드니까 사정거리 넓게
    dangerHeat:false, heatRadius:0,
    scoreVisit:1200,  // 위험 행성 = 고점수
  },
  {
    id:'saturn', name:'토성', nameEn:'SATURN',
    x:6000-4200,y:6000-1200, radius:230,
    gravityStrength:0.012, gravityRange:1800, surfaceMargin:20,
    color:'#d4b878', dot:'#e0c888', draw:drawSaturn,
    supply:'o2', supplyRadius:500,
    dangerHeat:false, heatRadius:0,
    scoreVisit:1000,
  },
  {
    id:'uranus', name:'천왕성', nameEn:'URANUS',
    x:6000+1800,y:6000-4000, radius:150,
    gravityStrength:0.006, gravityRange:1200, surfaceMargin:16,
    color:'#60c8d8', dot:'#70d8e8', draw:drawUranus,
    supply:'o2', supplyRadius:380,
    dangerHeat:false, heatRadius:0,
    scoreVisit:800,
  },
  {
    id:'neptune', name:'해왕성', nameEn:'NEPTUNE',
    x:6000-1000,y:6000-5500, radius:140,
    gravityStrength:0.007, gravityRange:1200, surfaceMargin:16,
    color:'#3050c8', dot:'#4060d8', draw:drawNeptune,
    supply:'both', supplyRadius:360,
    dangerHeat:false, heatRadius:0,
    scoreVisit:900,
  },
  {
    id:'pluto', name:'명왕성', nameEn:'PLUTO',
    x:6000+3000,y:6000-5800, radius:28,
    gravityStrength:0.0004, gravityRange:320, surfaceMargin:10,
    color:'#9080a0', dot:'#b090b0', draw:drawPluto,
    supply:'o2', supplyRadius:150,
    dangerHeat:false, heatRadius:0,
    scoreVisit:2000,  // 가장 멀고 작음 = 최고점
  },
];


// ── 독립 정거장 데이터 주입 ──
// 행성은 배경/탐험 오브젝트로 유지하고, 보급은 정거장이 담당한다.
const enabledPlanetIds = new Set(PLANET_SETTINGS.enabledBodyIds || []);
if (enabledPlanetIds.size > 0) {
  for (let i = SOLAR_BODIES.length - 1; i >= 0; i--) {
    if (!enabledPlanetIds.has(SOLAR_BODIES[i].id)) SOLAR_BODIES.splice(i, 1);
  }
}

SOLAR_BODIES.forEach(body => {
  body.x = SOLAR_SYSTEM_CENTER.x + (body.x - SOLAR_SYSTEM_CENTER.x) * PLANET_SETTINGS.distanceScale;
  body.y = SOLAR_SYSTEM_CENTER.y + (body.y - SOLAR_SYSTEM_CENTER.y) * PLANET_SETTINGS.distanceScale;
  body.radius *= PLANET_SETTINGS.radiusScale;
  body.surfaceMargin *= PLANET_SETTINGS.radiusScale;
  body.gravityRange *= PLANET_SETTINGS.distanceScale;
  body.supplyRadius *= PLANET_SETTINGS.radiusScale;
  if (body.heatRadius) body.heatRadius *= PLANET_SETTINGS.radiusScale;
});

const STATION_BODIES = (window.STATION_DATA || []).map(station => ({
  ...station,
  type: 'station',
  nameEn: station.nameEn || station.id.toUpperCase(),
  gravityStrength: 0,
  gravityRange: 0,
  surfaceMargin: station.surfaceMargin || 10,
  draw: drawStation,
  dangerHeat: false,
  heatRadius: 0,
  scoreVisit: station.scoreVisit || 0,
}));

SOLAR_BODIES.push(...STATION_BODIES);

if (!GAME_SETTINGS.PLANET_SUPPLY_ENABLED) {
  SOLAR_BODIES.forEach(body => {
    if (body.type !== 'station' && body.id !== 'sun') {
      body.supply = null;
      body.supplyRadius = 0;
    }
  });
}

// ════════════════════════════════════════════════════
//  게임 상태
// ════════════════════════════════════════════════════
const MAX_O2   = 100, MAX_FUEL = 100;
const O2_DRAIN   = 0.008;   // 초당 소모
const FUEL_DRAIN = 0.06;    // 추진 시 소모
const SUPPLY_RATE_O2   = 0.8;   // 보급 속도
const SUPPLY_RATE_FUEL = 1.2;
const HEAT_RATE  = 0.15;    // 태양 가열 속도
const COOL_RATE  = 0.04;    // 냉각 속도
const HEAT_O2_DAMAGE = 0.04; // 열 -> 산소 데미지

const STABILIZE_DURATION = 90;
const STABILIZE_COOLDOWN = 300;
const STABILIZE_FUEL_COST = 7;
const DECEL_DURATION = 120;
const DECEL_COOLDOWN = 240;
const DECEL_FUEL_COST = 6;
const DECEL_FORCE = 0.00085;

const gs = {
  o2:   MAX_O2,
  fuel: MAX_FUEL,
  heat: 0,
  score: 0,
  time:  0,
  visited: new Set(),
  supplying: null,
  supplyTimer: 0,
  stabilizeTimer: 0,
  stabilizeCooldown: 0,
  decelTimer: 0,
  decelCooldown: 0,
  alive: true,
  deathReason: '',
  started: false,
};

// ════════════════════════════════════════════════════
//  Canvas & Engine
// ════════════════════════════════════════════════════
const engine  = Engine.create({ gravity:{x:0,y:0} });
const world   = engine.world;
const canvas  = document.getElementById('gameCanvas');
const ctx     = canvas.getContext('2d');
const mmCanvas = document.getElementById('minimapCanvas');
const mmCtx   = mmCanvas.getContext('2d');

let viewWidth = window.innerWidth, viewHeight = window.innerHeight;
let dpr = window.devicePixelRatio || 1;

function resizeCanvas(){
  viewWidth = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
  viewHeight = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
  dpr = window.devicePixelRatio || 1;
  canvas.width  = Math.max(1, Math.floor(viewWidth*dpr));
  canvas.height = Math.max(1, Math.floor(viewHeight*dpr));
  canvas.style.width  = viewWidth+'px';
  canvas.style.height = viewHeight+'px';
  ctx.setTransform(1,0,0,1,0,0); ctx.scale(dpr,dpr);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// 우주인 — 지구 근처 시작
const startP = SOLAR_BODIES.find(p=>p.id==='earth') || SOLAR_BODIES.find(p=>p.id==='sun');
const astronaut = Bodies.rectangle(
  startP.x + startP.radius + 350, startP.y,
  30,46, {frictionAir:0.00022,friction:0,frictionStatic:0,restitution:0}
);
Body.setMass(astronaut, 9);
Body.setAngle(astronaut, -Math.PI/8);
Body.setInertia(astronaut, astronaut.inertia*3.2);
Composite.add(world, astronaut);

const keys = new Set();
window.addEventListener('keydown', e=>{
  if(e.code==='Space'){
    if(!e.repeat) activateStabilizer();
    e.preventDefault();
    return;
  }
  if(e.code==='KeyC'){
    if(!e.repeat) activateDecelerator();
    e.preventDefault();
    return;
  }
  keys.add(e.key.toLowerCase());
  if(['arrowup','arrowdown','arrowleft','arrowright','q','e','shift'].includes(e.key.toLowerCase()))
    e.preventDefault();
});
window.addEventListener('keyup', e=>keys.delete(e.key.toLowerCase()));

const particles = [];

// ════════════════════════════════════════════════════
//  시작
// ════════════════════════════════════════════════════
function startGame(){
  document.getElementById('titlescreen').style.display='none';
  document.getElementById('hud').style.display='block';
  document.getElementById('planet-nav').style.display='block';
  document.getElementById('minimap-container').style.display='block';
  buildNavButtons();
  gs.started = true;
}

// ════════════════════════════════════════════════════
//  빠른이동 버튼
// ════════════════════════════════════════════════════
function buildNavButtons(){
  const c = document.getElementById('planet-buttons');
  SOLAR_BODIES.forEach(p=>{
    const badge = p.supply==='both' ? '보급' : p.supply==='o2' ? 'O₂' : p.supply==='fuel' ? '⛽' : '탐험';
    const badgeClass = p.supply ? 'supply' : (p.dangerHeat?'danger':'');
    const btn = document.createElement('button');
    btn.className='planet-btn';
    btn.innerHTML=`<span class="dot" style="background:${p.dot}"></span>
      <span class="pname">${p.name}</span>
      <span class="pbadge ${badgeClass}">${badge}</span>`;
    btn.onclick=()=>teleportTo(p);
    c.appendChild(btn);
  });
}

function teleportTo(p){
  const a = Math.random()*Math.PI*2;
  const d = p.radius + Math.max(p.gravityRange*0.5, p.supplyRadius*1.1 + 60);
  Body.setPosition(astronaut,{x:p.x+Math.cos(a)*d, y:p.y+Math.sin(a)*d});
  Body.setVelocity(astronaut,{x:0,y:0});
  Body.setAngularVelocity(astronaut,0);
  showToast(`→ ${p.name} 인근으로 이동`);
}

// ════════════════════════════════════════════════════
//  토스트
// ════════════════════════════════════════════════════
let toastTimer = null;
function showToast(msg, color='#a0d8f0'){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.color = color;
  el.style.borderColor = color+'55';
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>el.classList.remove('show'), 2600);
}

// ════════════════════════════════════════════════════
//  벡터 헬퍼
// ════════════════════════════════════════════════════
function activateStabilizer(){
  if(!gs.started||!gs.alive) return;
  if(gs.stabilizeTimer>0) return;
  if(gs.stabilizeCooldown>0){
    showToast(`자세 고정 충전 중 ${Math.ceil(gs.stabilizeCooldown/60)}초`, '#7ab8ff');
    return;
  }
  if(gs.fuel<STABILIZE_FUEL_COST){
    showToast('자세 고정 연료 부족', '#ff8844');
    return;
  }
  gs.fuel=Math.max(0,gs.fuel-STABILIZE_FUEL_COST);
  gs.stabilizeTimer=STABILIZE_DURATION;
  gs.stabilizeCooldown=STABILIZE_COOLDOWN;
  showToast('자세 고정 작동', '#44ffcc');
}

function updateStabilizer(){
  if(gs.stabilizeCooldown>0) gs.stabilizeCooldown-=1;
  if(gs.stabilizeTimer<=0) return;
  gs.stabilizeTimer-=1;
  const av=astronaut.angularVelocity*.78;
  Body.setAngularVelocity(astronaut, Math.abs(av)<0.001 ? 0 : av);
}

function activateDecelerator(){
  if(!gs.started||!gs.alive) return;
  if(gs.decelTimer>0) return;
  if(gs.decelCooldown>0){
    showToast(`관성 감속 충전 중 ${Math.ceil(gs.decelCooldown/60)}초`, '#7ab8ff');
    return;
  }
  if(gs.fuel<DECEL_FUEL_COST){
    showToast('관성 감속 연료 부족', '#ff8844');
    return;
  }
  const spd=Math.hypot(astronaut.velocity.x,astronaut.velocity.y);
  if(spd<0.05){
    showToast('이미 충분히 느립니다', '#7ab8ff');
    return;
  }
  gs.fuel=Math.max(0,gs.fuel-DECEL_FUEL_COST);
  gs.decelTimer=DECEL_DURATION;
  gs.decelCooldown=DECEL_COOLDOWN;
  showToast('관성 감속 작동', '#44ffcc');
}

function updateDecelerator(){
  if(gs.decelCooldown>0) gs.decelCooldown-=1;
  if(gs.decelTimer<=0) return;
  gs.decelTimer-=1;
  const vx=astronaut.velocity.x, vy=astronaut.velocity.y;
  const spd=Math.hypot(vx,vy);
  if(spd<0.03){
    gs.decelTimer=0;
    return;
  }
  const force=Math.min(DECEL_FORCE, spd*.00022);
  const nx=vx/spd, ny=vy/spd;
  Body.applyForce(astronaut, astronaut.position, {x:-nx*force, y:-ny*force});
  emitBrakeExhaust(astronaut,nx,ny,force);
  thrusting=true;
  gs.fuel=Math.max(0,gs.fuel-FUEL_DRAIN/60*.22);
  if(gs.fuel<=0) gs.decelTimer=0;
}

const fwd = b=>({x:Math.cos(b.angle-Math.PI/2), y:Math.sin(b.angle-Math.PI/2)});
const rt  = b=>({x:Math.cos(b.angle),            y:Math.sin(b.angle)});
const w2s = (x,y,cx,cy)=>({x:x-cx+viewWidth/2, y:y-cy+viewHeight/2});

// ════════════════════════════════════════════════════
//  노이즈
// ════════════════════════════════════════════════════
function hash2(x,y){const s=Math.sin(x*127.1+y*311.7)*43758.5453123;return s-Math.floor(s);}
function sn2(x,y){
  const x0=Math.floor(x),y0=Math.floor(y),xf=x-x0,yf=y-y0;
  const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  return(hash2(x0,y0)*(1-u)+hash2(x0+1,y0)*u)*(1-v)+(hash2(x0,y0+1)*(1-u)+hash2(x0+1,y0+1)*u)*v;
}
function fNoise(x,y){let v=0,a=0.55,f=1,t=0;for(let i=0;i<4;i++){v+=sn2(x*f,y*f)*a;t+=a;a*=.5;f*=2;}return v/t;}

// ════════════════════════════════════════════════════
//  파티클
// ════════════════════════════════════════════════════
function emitExhaust(body,type,intensity){
  const f=fwd(body),r=rt(body);
  let bx=body.position.x,by=body.position.y,dx=0,dy=0;
  if(type==='main')         {bx-=f.x*28;by-=f.y*28;dx=-f.x;dy=-f.y;}
  else if(type==='retro')   {bx+=f.x*28;by+=f.y*28;dx=f.x;dy=f.y;}
  else if(type==='lstrafe') {bx+=r.x*18;by+=r.y*18;dx=r.x;dy=r.y;}
  else if(type==='rstrafe') {bx-=r.x*18;by-=r.y*18;dx=-r.x;dy=-r.y;}
  else if(type==='rl')      {bx+=r.x*14;by+=r.y*14;dx=r.x;dy=r.y;}
  else if(type==='rr')      {bx-=r.x*14;by-=r.y*14;dx=-r.x;dy=-r.y;}
  const cnt=Math.min(Math.max(1,Math.floor(intensity*2200)),5);
  for(let i=0;i<cnt;i++)
    particles.push({x:bx+(Math.random()-.5)*5,y:by+(Math.random()-.5)*5,
      vx:dx*(Math.random()*2+1.2)+(Math.random()-.5)*.8,
      vy:dy*(Math.random()*2+1.2)+(Math.random()-.5)*.8,
      life:16+Math.random()*18, size:1.6+Math.random()*3});
}
function emitBrakeExhaust(body,nx,ny,intensity){
  const cnt=Math.min(Math.max(1,Math.floor(intensity*2600)),5);
  for(let i=0;i<cnt;i++)
    particles.push({x:body.position.x+nx*18+(Math.random()-.5)*7,y:body.position.y+ny*18+(Math.random()-.5)*7,
      vx:nx*(Math.random()*2+1.1)+(Math.random()-.5)*.7,
      vy:ny*(Math.random()*2+1.1)+(Math.random()-.5)*.7,
      life:14+Math.random()*16, size:1.4+Math.random()*2.8});
}
function applyOffset(body,off,force,type,intens){
  Body.applyForce(body,{x:body.position.x+off.x,y:body.position.y+off.y},force);
  emitExhaust(body,type,intens);
}
function applyRot(body,sign,pw){
  const f=fwd(body),r=rt(body);
  Body.applyForce(body,{x:body.position.x+r.x*18*sign,y:body.position.y+r.y*18*sign},
    {x:f.x*pw,y:f.y*pw});
  emitExhaust(body,sign>0?'rl':'rr',pw*.82);
}

// ════════════════════════════════════════════════════
//  조종
// ════════════════════════════════════════════════════
let thrusting = false;
function updateControls(){
  if(!gs.alive) return;
  const prec  = keys.has('shift')?.42:1;
  const mainP = 0.0013*prec, retroP=0.00095*prec;
  const strP  = 0.00062*prec, rotP=0.00072*prec;
  const f=fwd(astronaut), r=rt(astronaut);
  const stroke=.82+Math.max(0,Math.sin(performance.now()*.018))*.55;
  thrusting=false;
  if(keys.has('arrowup')){
    if(gs.fuel>0){
      applyOffset(astronaut,{x:-f.x*22,y:-f.y*22},{x:f.x*mainP,y:f.y*mainP},'main',mainP);
      gs.fuel=Math.max(0,gs.fuel-FUEL_DRAIN/60);
      thrusting=true;
    }
  }
  if(keys.has('arrowdown')){
    if(gs.fuel>0){
      applyOffset(astronaut,{x:f.x*18,y:f.y*18},{x:-f.x*retroP,y:-f.y*retroP},'retro',retroP);
      gs.fuel=Math.max(0,gs.fuel-FUEL_DRAIN/60*.7);
      thrusting=true;
    }
  }
  if(keys.has('arrowleft')){
    if(gs.fuel>0){
      applyOffset(astronaut,{x:r.x*20-f.x*6,y:r.y*20-f.y*6},{x:-r.x*strP*stroke,y:-r.y*strP*stroke},'lstrafe',strP*stroke);
      gs.fuel=Math.max(0,gs.fuel-FUEL_DRAIN/60*.5);
      thrusting=true;
    }
  }
  if(keys.has('arrowright')){
    if(gs.fuel>0){
      applyOffset(astronaut,{x:-r.x*20-f.x*6,y:-r.y*20-f.y*6},{x:r.x*strP*stroke,y:r.y*strP*stroke},'rstrafe',strP*stroke);
      gs.fuel=Math.max(0,gs.fuel-FUEL_DRAIN/60*.5);
      thrusting=true;
    }
  }
  if(keys.has('q')){
    applyRot(astronaut,1,rotP);
    if(gs.fuel>0) gs.fuel=Math.max(0,gs.fuel-FUEL_DRAIN/60*.3);
  }
  if(keys.has('e')){
    applyRot(astronaut,-1,rotP);
    if(gs.fuel>0) gs.fuel=Math.max(0,gs.fuel-FUEL_DRAIN/60*.3);
  }
  updateStabilizer();
  updateDecelerator();
}

// ════════════════════════════════════════════════════
//  중력
// ════════════════════════════════════════════════════
let landedPlanetId=null;
function applyGravity(){
  let strongest=null;
  landedPlanetId=null;
  if (!PLANET_SETTINGS.gravityEnabled && !PLANET_SETTINGS.collisionEnabled) return null;
  for(const p of SOLAR_BODIES){
    if(p.type==='station') continue;
    const dx=p.x-astronaut.position.x, dy=p.y-astronaut.position.y;
    const dist=Math.hypot(dx,dy);
    const safe=Math.max(dist,0.0001);
    const nx=dist>0.0001 ? dx/safe : Math.cos(astronaut.angle);
    const ny=dist>0.0001 ? dy/safe : Math.sin(astronaut.angle);

    if(PLANET_SETTINGS.gravityEnabled && p.gravityStrength!==0 && p.gravityRange>0 && dist<=p.radius+p.gravityRange){
      const gravityDist=Math.max(dist,p.radius+4);
      const falloff=Math.max(0,1-(gravityDist-p.radius)/p.gravityRange);
      const strength=p.gravityStrength*falloff*falloff;
      Body.applyForce(astronaut,astronaut.position,{x:nx*strength,y:ny*strength});
      if(!strongest||strength>strongest.strength) strongest={planet:p,dist,strength};
    }

    if(!PLANET_SETTINGS.collisionEnabled || p.id==='sun') continue;
    const sl=p.radius+p.surfaceMargin;
    if(dist<sl){
      const push=sl-dist;
      Body.setPosition(astronaut,{x:astronaut.position.x-nx*push,y:astronaut.position.y-ny*push});
      const radSpd=astronaut.velocity.x*nx+astronaut.velocity.y*ny;
      const tx=-ny,ty=nx;
      const tanSpd=astronaut.velocity.x*tx+astronaut.velocity.y*ty;
      if(Math.abs(radSpd)<1.35&&Math.abs(astronaut.angularVelocity)<.045){
        landedPlanetId=p.id;
        Body.setVelocity(astronaut,{x:tx*tanSpd*.92,y:ty*tanSpd*.92});
        Body.setAngularVelocity(astronaut,astronaut.angularVelocity*.75);
      } else if(radSpd>0){
        const outX=astronaut.velocity.x-nx*radSpd*1.35;
        const outY=astronaut.velocity.y-ny*radSpd*1.35;
        Body.setVelocity(astronaut,{x:outX*.82,y:outY*.82});
        Body.setAngularVelocity(astronaut,astronaut.angularVelocity*.65);
      } else {
        Body.setVelocity(astronaut,{x:astronaut.velocity.x*.88,y:astronaut.velocity.y*.88});
        Body.setAngularVelocity(astronaut,astronaut.angularVelocity*.8);
      }
    }
  }
  return strongest;
}

// ════════════════════════════════════════════════════
//  서바이벌 업데이트
// ════════════════════════════════════════════════════
let prevSupply=null, prevVisited=new Set();
let frameCount=0;

function updateSurvival(){
  if(!gs.alive||!gs.started) return;
  frameCount++;
  const dt=1/60;
  gs.time+=dt;
  gs.score+=dt*10; // 생존 점수

  // 산소 소모
  gs.o2=Math.max(0,gs.o2-O2_DRAIN*dt*60);

  // 태양 열 처리
  const sun=SOLAR_BODIES[0];
  const sunDist=Math.hypot(sun.x-astronaut.position.x,sun.y-astronaut.position.y);
  if(sunDist<sun.heatRadius){
    const heatFactor=1-(sunDist-sun.radius)/(sun.heatRadius-sun.radius);
    gs.heat=Math.min(100,gs.heat+HEAT_RATE*heatFactor*dt*60);
  } else {
    gs.heat=Math.max(0,gs.heat-COOL_RATE*dt*60);
  }
  // 열 -> 산소 데미지
  if(gs.heat>60){
    gs.o2=Math.max(0,gs.o2-HEAT_O2_DAMAGE*(gs.heat/100)*dt*60);
  }
  // 태양 표면 충돌 (즉사)
  if(sunDist<sun.radius+sun.surfaceMargin){
    die('☀ 태양에 소각됨');return;
  }

  // 보급 체크
  gs.supplying=null;
  for(const p of SOLAR_BODIES){
    if(!p.supply) continue;
    const dist=Math.hypot(p.x-astronaut.position.x,p.y-astronaut.position.y);
    if(dist>p.radius+p.supplyRadius) continue;
    gs.supplying=p;
    const proximity=1-(dist-p.radius)/p.supplyRadius;
    if(p.supply==='o2'||p.supply==='both')
      gs.o2=Math.min(MAX_O2,gs.o2+SUPPLY_RATE_O2*proximity*dt*60);
    if(p.supply==='fuel'||p.supply==='both')
      gs.fuel=Math.min(MAX_FUEL,gs.fuel+SUPPLY_RATE_FUEL*proximity*dt*60);
    // 방문 체크
    if(!gs.visited.has(p.id)){
      gs.visited.add(p.id);
      gs.score+=p.scoreVisit;
      showToast(`✦ ${p.name} 탐험! +${p.scoreVisit}점`, '#ffe066');
    }
    break;
  }

  // 보급 알림
  if(gs.supplying && gs.supplying!==prevSupply){
    const s=gs.supplying;
    const what=s.supply==='both'?'산소+연료':s.supply==='o2'?'산소':'연료';
    showToast(`⛽ ${s.name} 보급 중 — ${what}`, '#44ffcc');
  }
  prevSupply=gs.supplying;

  // 사망 체크
  if(gs.o2<=0)   { die('🫁 산소 고갈'); return; }
  if(gs.fuel<=0&&!thrusting){
    // 연료 없어도 바로 죽진 않음 — 관성으로 이동 가능
  }
  if(gs.heat>=100){ die('🌡 과열로 사망'); return; }
}

function die(reason){
  gs.alive=false;
  gs.deathReason=reason;
  setTimeout(()=>{
    const go=document.getElementById('gameover');
    document.getElementById('go-title').textContent='GAME OVER';
    document.getElementById('go-reason').textContent=reason;
    document.getElementById('go-score').textContent=Math.floor(gs.score).toLocaleString();
    document.getElementById('go-visited').textContent=
      `방문 행성: ${gs.visited.size} / ${SOLAR_BODIES.filter(p=>p.id!=='sun').length}`;
    go.style.display='flex';
  },800);
}

// ════════════════════════════════════════════════════
//  HUD 업데이트
// ════════════════════════════════════════════════════
function updateHUD(gravInfo){
  if(!gs.started) return;
  // 점수
  document.getElementById('v-score').textContent=Math.floor(gs.score).toLocaleString();
  // 시간
  const m=Math.floor(gs.time/60), s=Math.floor(gs.time%60);
  document.getElementById('v-time').textContent=`${m}:${s.toString().padStart(2,'0')}`;
  // 방문
  document.getElementById('v-visited').textContent=
    `${gs.visited.size} / ${SOLAR_BODIES.filter(p=>p.id!=='sun').length}`;
  // 속도
  document.getElementById('v-speed').textContent=
    Math.hypot(astronaut.velocity.x,astronaut.velocity.y).toFixed(2);
  // 중력권
  document.getElementById('v-planet').textContent=
    GAME_SETTINGS.PLANET_GRAVITY_ENABLED && gravInfo ? `${gravInfo.planet.name}` : 'OFF';

  // 게이지
  const o2pct=gs.o2/MAX_O2*100;
  const fuelpct=gs.fuel/MAX_FUEL*100;
  document.getElementById('v-o2').textContent=`${Math.floor(gs.o2)}%`;
  document.getElementById('v-fuel').textContent=`${Math.floor(gs.fuel)}%`;
  document.getElementById('v-heat').textContent=`${Math.floor(gs.heat)}%`;
  document.getElementById('o2-fill').style.width=o2pct+'%';
  document.getElementById('fuel-fill').style.width=fuelpct+'%';
  document.getElementById('heat-fill').style.width=gs.heat+'%';
  document.getElementById('v-o2').className='lval '+(gs.o2<25?'warn':'ok');
  document.getElementById('v-fuel').className='lval '+(gs.fuel<20?'warn':'ok');
  document.getElementById('v-heat').className='lval '+(gs.heat>60?'warn':'ok');

  const stabBtn=document.getElementById('stabilize-btn');
  if(stabBtn){
    const active=gs.stabilizeTimer>0;
    const cooling=gs.stabilizeCooldown>0&&!active;
    stabBtn.className='skill-btn'+(active?' active':'');
    stabBtn.disabled=cooling||gs.fuel<STABILIZE_FUEL_COST;
    stabBtn.textContent=active?'고정 중':(cooling?`충전 ${Math.ceil(gs.stabilizeCooldown/60)}초`:'자세 고정');
  }

  // 위험 테두리
  const vig=document.getElementById('danger-vignette');
  const decelBtn=document.getElementById('decel-btn');
  if(decelBtn){
    const active=gs.decelTimer>0;
    const cooling=gs.decelCooldown>0&&!active;
    const tooSlow=Math.hypot(astronaut.velocity.x,astronaut.velocity.y)<0.05;
    decelBtn.className='skill-btn'+(active?' active':'');
    decelBtn.disabled=cooling||gs.fuel<DECEL_FUEL_COST||tooSlow;
    decelBtn.textContent=active?'감속 중':(cooling?`충전 ${Math.ceil(gs.decelCooldown/60)}초`:'관성 감속');
  }

  const danger=Math.max(gs.heat/100,(100-gs.o2)/200);
  if(danger>0.3){
    const r=gs.heat>60?'255,60,0':'0,160,255';
    vig.style.opacity='1';
    vig.style.boxShadow=`inset 0 0 ${80+danger*120}px rgba(${r},${(danger-.3)*.6})`;
    vig.style.background=`radial-gradient(ellipse at center,transparent 60%,rgba(${r},${(danger-.3)*.25}))`;
  } else {
    vig.style.opacity='0';
  }

  // 보급 중 표시
  if(gs.supplying){
    const sf=gs.supplying;
    if(sf.supply==='both'||sf.supply==='o2')
      document.getElementById('o2-fill').style.boxShadow='0 0 8px #44ffcc';
    else document.getElementById('o2-fill').style.boxShadow='';
    if(sf.supply==='both'||sf.supply==='fuel')
      document.getElementById('fuel-fill').style.boxShadow='0 0 8px #ffe066';
    else document.getElementById('fuel-fill').style.boxShadow='';
  } else {
    document.getElementById('o2-fill').style.boxShadow='';
    document.getElementById('fuel-fill').style.boxShadow='';
  }
}

// ════════════════════════════════════════════════════
//  행성 그리기 함수들
// ════════════════════════════════════════════════════
const Tnow=()=>performance.now()*.001;

let sunCache=null;
function getSunCache(r){
  const cacheR=Math.min(r,260);
  const extent=cacheR*2.25;
  const size=Math.ceil(extent*2);
  if(sunCache&&sunCache.size===size) return sunCache;
  const c=document.createElement('canvas');
  c.width=size; c.height=size;
  const cctx=c.getContext('2d');
  const cx=size/2,cy=size/2;
  for(let i=3;i>=0;i--){
    const cR=cacheR*(1.45+i*.45);
    const a=0.04-i*.007;
    const g=cctx.createRadialGradient(cx,cy,cacheR*.8,cx,cy,cR);
    g.addColorStop(0,`rgba(255,220,80,${a+.015})`);
    g.addColorStop(.5,`rgba(255,140,20,${a})`);
    g.addColorStop(1,'rgba(255,80,0,0)');
    cctx.fillStyle=g; cctx.beginPath(); cctx.arc(cx,cy,cR,0,Math.PI*2); cctx.fill();
  }
  const sg=cctx.createRadialGradient(cx-cacheR*.3,cy-cacheR*.3,cacheR*.08,cx,cy,cacheR);
  sg.addColorStop(0,'#fff8c0'); sg.addColorStop(.3,'#ffe060');
  sg.addColorStop(.65,'#ff9910'); sg.addColorStop(1,'#ff4400');
  cctx.save(); cctx.beginPath(); cctx.arc(cx,cy,cacheR,0,Math.PI*2);
  cctx.shadowColor='rgba(255,180,0,0.85)'; cctx.shadowBlur=42;
  cctx.fillStyle=sg; cctx.fill(); cctx.clip();
  [[-.3,.2,.06],[.2,-.35,.04],[.5,.1,.05]].forEach(([ox,oy,s])=>{
    const sx=cx+ox*cacheR, sy=cy+oy*cacheR;
    cctx.fillStyle='rgba(120,40,0,.5)';
    cctx.beginPath(); cctx.ellipse(sx,sy,s*cacheR*1.8,s*cacheR,0,0,Math.PI*2); cctx.fill();
  });
  cctx.restore();
  sunCache={canvas:c,size,extent,scale:r/cacheR};
  return sunCache;
}

function drawSun(cx,cy,r){
  const t=Tnow();
  const cache=getSunCache(r);
  const drawSize=cache.size*cache.scale;
  ctx.save();
  ctx.globalAlpha=.95+.05*Math.sin(t*.8);
  ctx.drawImage(cache.canvas,cx-drawSize/2,cy-drawSize/2,drawSize,drawSize);
  ctx.restore();
  for(let i=0;i<6;i++){
    const a=i/6*Math.PI*2+t*.12;
    const fl=r*(.12+.08*Math.sin(t*1.5+i*1.3));
    ctx.beginPath();
    ctx.moveTo(cx+Math.cos(a)*(r+fl*.3),cy+Math.sin(a)*(r+fl*.3));
    ctx.quadraticCurveTo(
      cx+Math.cos(a+.3)*(r+fl*.7),cy+Math.sin(a+.3)*(r+fl*.7),
      cx+Math.cos(a)*(r+fl),cy+Math.sin(a)*(r+fl));
    ctx.strokeStyle=`rgba(255,${100+i*20},0,.55)`;
    ctx.lineWidth=2.5; ctx.shadowBlur=8; ctx.shadowColor='#ff8800';
    ctx.stroke(); ctx.shadowBlur=0;
  }
  labelPlanet(cx,cy,r,'태양','SUN','#ffcc44');
  // 위험 구역 표시
  const sun=SOLAR_BODIES[0];
  ctx.save();
  ctx.strokeStyle='rgba(255,80,0,0.12)'; ctx.lineWidth=2; ctx.setLineDash([8,12]);
  ctx.beginPath(); ctx.arc(cx,cy,sun.heatRadius,0,Math.PI*2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawMercury(cx,cy,r){
  const g=ctx.createRadialGradient(cx-r*.3,cy-r*.3,r*.05,cx,cy,r);
  g.addColorStop(0,'#d4c4a8');g.addColorStop(.5,'#a08870');g.addColorStop(1,'#605040');
  ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.shadowColor='rgba(180,150,100,.4)'; ctx.shadowBlur=r*.5;
  ctx.fillStyle=g; ctx.fill(); ctx.clip();
  [[-.3,.2,.25],[.3,-.3,.18],[-.1,.4,.12],[.5,.1,.08],[.2,.35,.15]].forEach(([ox,oy,s])=>{
    const kx=cx+ox*r,ky=cy+oy*r,kr=s*r;
    const kg=ctx.createRadialGradient(kx-kr*.3,ky-kr*.3,0,kx,ky,kr);
    kg.addColorStop(0,'rgba(40,28,18,.7)'); kg.addColorStop(1,'rgba(100,80,60,.2)');
    ctx.fillStyle=kg; ctx.beginPath(); ctx.arc(kx,ky,kr,0,Math.PI*2); ctx.fill();
  });
  ctx.restore();
  drawSupplyRadius(cx,cy,SOLAR_BODIES.find(p=>p.id==='mercury'));
  labelPlanet(cx,cy,r,'수성','MERCURY','#c8b090');
}
function drawVenus(cx,cy,r){
  const t=Tnow();
  const g=ctx.createRadialGradient(cx-r*.25,cy-r*.3,r*.1,cx,cy,r);
  g.addColorStop(0,'#fff0a0');g.addColorStop(.4,'#e8b040');g.addColorStop(.8,'#c07020');g.addColorStop(1,'#804010');
  ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.shadowColor='rgba(230,160,40,.5)'; ctx.shadowBlur=r*.7;
  ctx.fillStyle=g; ctx.fill(); ctx.clip();
  for(let i=0;i<5;i++){
    const ba=i/5*Math.PI*2+t*.04*(i%2?.8:-.6);
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(ba);
    ctx.beginPath(); ctx.ellipse(r*.2,0,r*.55,r*.14,0,0,Math.PI*2);
    ctx.fillStyle=`rgba(255,220,100,${.12+i*.02})`; ctx.fill(); ctx.restore();
  }
  ctx.restore();
  drawSupplyRadius(cx,cy,SOLAR_BODIES.find(p=>p.id==='venus'));
  labelPlanet(cx,cy,r,'금성','VENUS','#f0c050');
}
function drawEarth(cx,cy,r){
  const t=Tnow();
  const g=ctx.createRadialGradient(cx-r*.3,cy-r*.3,r*.05,cx,cy,r);
  g.addColorStop(0,'#60b0e8');g.addColorStop(.45,'#2060a0');g.addColorStop(1,'#0a2040');
  ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.shadowColor='rgba(40,120,220,.5)'; ctx.shadowBlur=r*.6;
  ctx.fillStyle=g; ctx.fill(); ctx.clip();
  [[-.1,-.2,.45,.3,.4],[.25,.1,.3,.4,-.2],[-.35,.2,.2,.3,.1]].forEach(([ox,oy,w,h,rot])=>{
    ctx.save(); ctx.translate(cx+ox*r,cy+oy*r); ctx.rotate(rot+t*.015);
    ctx.beginPath(); ctx.ellipse(0,0,w*r,h*r,0,0,Math.PI*2);
    ctx.fillStyle='rgba(60,140,50,.75)'; ctx.fill(); ctx.restore();
  });
  for(let i=0;i<4;i++){
    const ca=i/4*Math.PI*2+t*.025;
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(ca);
    ctx.beginPath(); ctx.ellipse(r*.1,0,r*.5,r*.09,0,0,Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,.18)'; ctx.fill(); ctx.restore();
  }
  ctx.beginPath(); ctx.ellipse(cx,cy-r*.78,r*.3,r*.15,0,0,Math.PI*2);
  ctx.fillStyle='rgba(230,245,255,.7)'; ctx.fill();
  ctx.restore();
  const atm=ctx.createRadialGradient(cx,cy,r*.92,cx,cy,r*1.18);
  atm.addColorStop(0,'rgba(80,160,255,.18)'); atm.addColorStop(1,'rgba(60,120,220,0)');
  ctx.fillStyle=atm; ctx.beginPath(); ctx.arc(cx,cy,r*1.18,0,Math.PI*2); ctx.fill();
  drawSupplyRadius(cx,cy,SOLAR_BODIES.find(p=>p.id==='earth'));
  labelPlanet(cx,cy,r,'지구','EARTH','#60c0ff');
}
function drawMars(cx,cy,r){
  const t=Tnow();
  const g=ctx.createRadialGradient(cx-r*.3,cy-r*.3,r*.05,cx,cy,r);
  g.addColorStop(0,'#e06040');g.addColorStop(.5,'#b83820');g.addColorStop(1,'#601808');
  ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.shadowColor='rgba(200,60,20,.45)'; ctx.shadowBlur=r*.55;
  ctx.fillStyle=g; ctx.fill(); ctx.clip();
  const mx=cx+r*.3,my=cy-r*.1;
  const vg=ctx.createRadialGradient(mx,my,0,mx,my,r*.35);
  vg.addColorStop(0,'rgba(80,30,10,.8)'); vg.addColorStop(1,'rgba(180,60,30,0)');
  ctx.fillStyle=vg; ctx.beginPath(); ctx.arc(mx,my,r*.35,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx,cy-r*.8,r*.22,r*.1,0,0,Math.PI*2);
  ctx.fillStyle='rgba(240,220,200,.75)'; ctx.fill();
  ctx.restore();
  drawSupplyRadius(cx,cy,SOLAR_BODIES.find(p=>p.id==='mars'));
  labelPlanet(cx,cy,r,'화성','MARS','#e08060');
}
function drawJupiter(cx,cy,r){
  const t=Tnow();
  ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.shadowColor='rgba(210,160,80,.5)'; ctx.shadowBlur=r*.4;
  const bg=ctx.createRadialGradient(cx-r*.2,cy-r*.2,r*.1,cx,cy,r);
  bg.addColorStop(0,'#f0d090'); bg.addColorStop(1,'#806020');
  ctx.fillStyle=bg; ctx.fill(); ctx.clip();
  [-.65,-.5,-.38,-.22,-.1,.02,.16,.28,.44,.58].forEach((y,i)=>{
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(t*.008*(i%2?.9:-.9));
    ctx.beginPath(); ctx.ellipse(0,y*r,r,.1*r,0,0,Math.PI*2);
    ctx.fillStyle=`rgba(${160+i*5},${110+i*4},${50+i*3},.5)`; ctx.fill(); ctx.restore();
  });
  const gx=cx-r*.2+Math.sin(t*.04)*r*.12,gy=cy+r*.18;
  const gg=ctx.createRadialGradient(gx,gy,0,gx,gy,r*.22);
  gg.addColorStop(0,'rgba(180,40,20,.9)'); gg.addColorStop(1,'rgba(120,80,40,0)');
  ctx.fillStyle=gg; ctx.beginPath(); ctx.ellipse(gx,gy,r*.22,r*.14,t*.1,0,Math.PI*2); ctx.fill();
  ctx.restore();
  drawSupplyRadius(cx,cy,SOLAR_BODIES.find(p=>p.id==='jupiter'));
  labelPlanet(cx,cy,r,'목성','JUPITER','#d4a860');
}
function drawSaturn(cx,cy,r){
  const t=Tnow();
  const rt2=0.28+Math.sin(t*.02)*.02;
  ctx.save(); ctx.scale(1,Math.sin(rt2));
  const rg=ctx.createRadialGradient(cx,cy/Math.sin(rt2),r*.95,cx,cy/Math.sin(rt2),r*2.5);
  rg.addColorStop(0,'rgba(200,170,100,0)'); rg.addColorStop(.05,'rgba(200,170,100,.55)');
  rg.addColorStop(.6,'rgba(180,148,75,.35)'); rg.addColorStop(1,'rgba(140,110,60,0)');
  ctx.fillStyle=rg;
  ctx.beginPath(); ctx.arc(cx,cy/Math.sin(rt2),r*2.5,0,Math.PI*2); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.shadowColor='rgba(220,185,90,.45)'; ctx.shadowBlur=r*.5;
  const bg=ctx.createRadialGradient(cx-r*.25,cy-r*.25,r*.08,cx,cy,r);
  bg.addColorStop(0,'#f5e5a0'); bg.addColorStop(.4,'#d4b050'); bg.addColorStop(1,'#604810');
  ctx.fillStyle=bg; ctx.fill(); ctx.clip();
  [-.5,-.3,-.1,.15,.35,.55].forEach((y,i)=>{
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(t*.006);
    ctx.beginPath(); ctx.ellipse(0,y*r,r,r*.07,0,0,Math.PI*2);
    ctx.fillStyle=`rgba(${180-i*10},${140-i*8},${60-i*5},.4)`; ctx.fill(); ctx.restore();
  });
  ctx.restore();
  drawSupplyRadius(cx,cy,SOLAR_BODIES.find(p=>p.id==='saturn'));
  labelPlanet(cx,cy,r,'토성','SATURN','#e0c870');
}
function drawUranus(cx,cy,r){
  const g=ctx.createRadialGradient(cx-r*.25,cy-r*.3,r*.08,cx,cy,r);
  g.addColorStop(0,'#a0f0f8');g.addColorStop(.5,'#40b8d0');g.addColorStop(1,'#104858');
  ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.shadowColor='rgba(80,200,220,.45)'; ctx.shadowBlur=r*.6;
  ctx.fillStyle=g; ctx.fill(); ctx.clip();
  for(let i=0;i<5;i++){
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(.95);
    ctx.beginPath(); ctx.ellipse(0,(i-2)*r*.22,r,r*.07,0,0,Math.PI*2);
    ctx.fillStyle=`rgba(120,230,240,${.08+i*.02})`; ctx.fill(); ctx.restore();
  }
  ctx.restore();
  ctx.save(); ctx.scale(Math.cos(1.7),1);
  ctx.strokeStyle='rgba(100,210,230,.2)'; ctx.lineWidth=r*.05;
  ctx.beginPath(); ctx.ellipse(cx/Math.cos(1.7),cy,r*1.6,r*.18,0,0,Math.PI*2); ctx.stroke();
  ctx.restore();
  drawSupplyRadius(cx,cy,SOLAR_BODIES.find(p=>p.id==='uranus'));
  labelPlanet(cx,cy,r,'천왕성','URANUS','#70d8e8');
}
function drawNeptune(cx,cy,r){
  const t=Tnow();
  const g=ctx.createRadialGradient(cx-r*.3,cy-r*.3,r*.08,cx,cy,r);
  g.addColorStop(0,'#5080ff');g.addColorStop(.45,'#2040c0');g.addColorStop(1,'#080820');
  ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.shadowColor='rgba(40,80,220,.55)'; ctx.shadowBlur=r*.7;
  ctx.fillStyle=g; ctx.fill(); ctx.clip();
  const sx=cx-r*.2+Math.cos(t*.08)*r*.08,sy=cy+r*.1;
  const sg=ctx.createRadialGradient(sx,sy,0,sx,sy,r*.2);
  sg.addColorStop(0,'rgba(10,10,60,.9)'); sg.addColorStop(1,'rgba(20,30,100,0)');
  ctx.fillStyle=sg; ctx.beginPath(); ctx.ellipse(sx,sy,r*.2,r*.12,t*.15,0,Math.PI*2); ctx.fill();
  ctx.restore();
  const atm=ctx.createRadialGradient(cx,cy,r*.9,cx,cy,r*1.15);
  atm.addColorStop(0,'rgba(60,100,255,.12)'); atm.addColorStop(1,'rgba(40,60,200,0)');
  ctx.fillStyle=atm; ctx.beginPath(); ctx.arc(cx,cy,r*1.15,0,Math.PI*2); ctx.fill();
  drawSupplyRadius(cx,cy,SOLAR_BODIES.find(p=>p.id==='neptune'));
  labelPlanet(cx,cy,r,'해왕성','NEPTUNE','#5070e0');
}
function drawPluto(cx,cy,r){
  const g=ctx.createRadialGradient(cx-r*.3,cy-r*.3,r*.05,cx,cy,r);
  g.addColorStop(0,'#c0a8c0');g.addColorStop(.5,'#806880');g.addColorStop(1,'#302030');
  ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.shadowColor='rgba(140,100,140,.35)'; ctx.shadowBlur=r*.4;
  ctx.fillStyle=g; ctx.fill(); ctx.clip();
  ctx.save(); ctx.translate(cx+r*.1,cy+r*.1);
  ctx.beginPath();
  ctx.moveTo(0,-r*.35);
  ctx.bezierCurveTo(r*.25,-r*.5,r*.4,-r*.2,0,r*.1);
  ctx.bezierCurveTo(-r*.4,-r*.2,-r*.25,-r*.5,0,-r*.35);
  ctx.fillStyle='rgba(220,210,240,.65)'; ctx.fill(); ctx.restore();
  ctx.restore();
  drawSupplyRadius(cx,cy,SOLAR_BODIES.find(p=>p.id==='pluto'));
  labelPlanet(cx,cy,r,'명왕성','PLUTO','#b090c0');
}


function drawStation(cx,cy,r){
  const station = SOLAR_BODIES.find(p => p.type==='station' && Math.abs(p.x-cx)<1 && Math.abs(p.y-cy)<1);
  const t=Tnow();
  const supply = station ? station.supply : 'both';
  const baseColor = station ? station.dot : '#44ffcc';
  const pulse = 0.5 + 0.5 * Math.sin(t*2.2);

  ctx.save();
  ctx.translate(cx,cy);
  ctx.rotate(t*0.18);

  ctx.shadowColor = baseColor;
  ctx.shadowBlur = 18 + pulse*10;
  ctx.strokeStyle = baseColor;
  ctx.lineWidth = 2;

  // 외부 링
  ctx.beginPath();
  ctx.arc(0,0,r*1.45,0,Math.PI*2);
  ctx.stroke();

  // 십자 도킹 암
  ctx.globalAlpha = 0.85;
  for(let i=0;i<4;i++){
    ctx.save();
    ctx.rotate(i*Math.PI/2);
    rrect(ctx,-r*0.16,-r*1.75,r*0.32,r*0.9,4);
    ctx.fillStyle='rgba(8,28,48,.85)';
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // 중심 코어
  ctx.globalAlpha = 1;
  const g=ctx.createRadialGradient(-r*.25,-r*.25,0,0,0,r);
  g.addColorStop(0,'rgba(255,255,255,.85)');
  g.addColorStop(.35,baseColor);
  g.addColorStop(1,'rgba(5,20,35,.95)');
  ctx.fillStyle=g;
  ctx.beginPath();
  ctx.arc(0,0,r,0,Math.PI*2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();

  if(station) {
    drawSupplyRadius(cx,cy,station);
    const label = station.stationType || station.name;
    labelPlanet(cx,cy,r,label,station.nameEn || 'STATION',baseColor);
  }
}

// ── 보급 반경 표시 ──
function drawSupplyRadius(cx,cy,p){
  if(!p||!p.supply) return;
  const t=Tnow();
  const pulse=0.4+0.6*(0.5+0.5*Math.sin(t*1.5));
  const color=p.supply==='both'?'0,255,150':p.supply==='o2'?'0,200,255':'255,200,0';
  // 보급 반경 원
  ctx.save();
  ctx.beginPath(); ctx.arc(cx,cy,p.radius+p.supplyRadius,0,Math.PI*2);
  ctx.strokeStyle=`rgba(${color},${0.12+pulse*0.08})`;
  ctx.lineWidth=1.5; ctx.setLineDash([6,8]); ctx.stroke(); ctx.setLineDash([]);
  // 보급 아이콘
  const icon=p.supply==='both'?'⛽🫁':p.supply==='o2'?'🫁':'⛽';
  ctx.font=`${Math.max(10,p.radius*.18)}px Arial`;
  ctx.textAlign='center'; ctx.globalAlpha=0.5+pulse*0.3;
  ctx.fillText(icon,cx,cy-p.radius-p.supplyRadius-8);
  ctx.globalAlpha=1;
  ctx.restore();
}

// ── 레이블 ──
function labelPlanet(cx,cy,r,nameKo,nameEn,color){
  ctx.save(); ctx.textAlign='center';
  ctx.shadowBlur=12; ctx.shadowColor=color;
  ctx.font=`bold ${Math.max(11,r*.22)}px 'Segoe UI',Arial`;
  ctx.fillStyle=color; ctx.fillText(nameKo,cx,cy-r-22);
  ctx.font=`${Math.max(9,r*.14)}px 'Segoe UI',Arial`;
  ctx.fillStyle='rgba(160,200,230,.55)'; ctx.fillText(nameEn,cx,cy-r-10);
  ctx.shadowBlur=0; ctx.restore();
}

// ════════════════════════════════════════════════════
//  배경
// ════════════════════════════════════════════════════
const BG_CELL=280;
function drawBackground(cX,cY){
  const bg=ctx.createRadialGradient(viewWidth/2,viewHeight/2,0,viewWidth/2,viewHeight/2,Math.max(viewWidth,viewHeight));
  bg.addColorStop(0,'#06101e'); bg.addColorStop(.6,'#030810'); bg.addColorStop(1,'#000');
  ctx.fillStyle=bg; ctx.fillRect(0,0,viewWidth,viewHeight);
  // 성운
  for(const l of [{sc:.00018,al:.18,hA:210,hB:270,sp:.04},{sc:.00032,al:.1,hA:160,hB:320,sp:.09}]){
    for(let sx=-96;sx<=viewWidth+96;sx+=96)
      for(let sy=-96;sy<=viewHeight+96;sy+=96){
        const n=fNoise((cX-viewWidth/2+sx)*l.sc+l.sp,(cY-viewHeight/2+sy)*l.sc-l.sp);
        if(n<.6) continue;
        const loc=(n-.6)/.4;
        ctx.fillStyle=`hsla(${l.hA*(1-loc)+l.hB*loc},80%,58%,${l.al*loc})`;
        ctx.beginPath(); ctx.arc(sx,sy,60+loc*80,0,Math.PI*2); ctx.fill();
      }
  }
  // 별
  const mnX=Math.floor((cX-viewWidth/2)/BG_CELL)-1, mxX=Math.floor((cX+viewWidth/2)/BG_CELL)+1;
  const mnY=Math.floor((cY-viewHeight/2)/BG_CELL)-1, mxY=Math.floor((cY+viewHeight/2)/BG_CELL)+1;
  for(let cx2=mnX;cx2<=mxX;cx2++) for(let cy2=mnY;cy2<=mxY;cy2++){
    const seed=hash2(cx2,cy2), cnt=1+Math.floor(seed*4);
    for(let i=0;i<cnt;i++){
      const px=cx2*BG_CELL+hash2(cx2*13+i,cy2*17+i)*BG_CELL;
      const py=cy2*BG_CELL+hash2(cx2*19+i,cy2*23+i)*BG_CELL;
      const sc=w2s(px,py,cX,cY);
      const sz=.5+hash2(cx2*29+i,cy2*31+i)*1.6;
      const al=.3+hash2(cx2*37+i,cy2*41+i)*.6;
      const tw=.8+.2*Math.sin(performance.now()*.0014+seed*20+i);
      ctx.save(); ctx.globalAlpha=al*tw; ctx.fillStyle='#d0e8ff';
      ctx.beginPath(); ctx.arc(sc.x,sc.y,sz,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }
}

// ════════════════════════════════════════════════════
//  파티클 렌더링
// ════════════════════════════════════════════════════
function drawParticles(cX,cY){
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.x+=p.vx;p.y+=p.vy;p.vx*=.985;p.vy*=.985;p.life-=1;p.size*=.985;
    const sc=w2s(p.x,p.y,cX,cY);
    if(sc.x>-20&&sc.x<viewWidth+20&&sc.y>-20&&sc.y<viewHeight+20){
      ctx.save(); ctx.globalAlpha=Math.max(0,p.life/34);
      ctx.fillStyle='rgba(140,220,255,.95)';
      ctx.beginPath(); ctx.arc(sc.x,sc.y,p.size,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
    if(p.life<=0||p.size<=.2) particles.splice(i,1);
  }
}

// ════════════════════════════════════════════════════
//  우주인
// ════════════════════════════════════════════════════
function rrect(c,x,y,w,h,r){
  c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);
  c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);
  c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath();
}
function drawAstronaut(cX,cY){
  const pos=w2s(astronaut.position.x,astronaut.position.y,cX,cY);
  const spd=Math.hypot(astronaut.velocity.x,astronaut.velocity.y);
  const spin=astronaut.angularVelocity, t=performance.now()*.01;
  const strafing=keys.has('arrowleft')||keys.has('arrowright');
  const strafeDir=keys.has('arrowleft') ? -1 : (keys.has('arrowright') ? 1 : 0);
  const turning=keys.has('q')||keys.has('e');
  const active=keys.has('arrowup')||keys.has('arrowdown')||strafing||turning;
  const flailing=strafing||turning;
  const flap=thrusting ? 1 : (active ? .45 : 0);
  const flailAmp=flailing ? .34 : 0;
  const sAmp=Math.min(.78,.08+spd*.08+Math.abs(spin)*.7+flap*.32+flailAmp);
  const sPhase=t*(flailing?1.75:(flap?1.15:.12));
  const lLag=Math.max(-.22,Math.min(.22,spin*6));
  const recoil=(keys.has('arrowup')?-2.5:0)+(keys.has('arrowdown')?1.5:0);
  const panic=Math.sin(t*4.6)*(flailing ? .18 : 0);
  const headNod=keys.has('arrowdown') ? Math.sin(t*3.8)*.16+.08 : 0;
  const swim=Math.sin(sPhase*1.28);
  const swimAmp=strafing ? .55 : 0;
  const sideProfile=strafing ? .72+.1*Math.abs(swim) : 0;
  const wobble=Math.sin(sPhase*1.7)*(flap*.08+flailAmp*.18)+strafeDir*(strafing ? .12 : 0)+swim*strafeDir*.04;
  ctx.save(); ctx.translate(pos.x+strafeDir*Math.abs(swim)*1.2,pos.y); ctx.rotate(astronaut.angle+wobble);
  // 보급 중이면 녹색 글로우
  if(gs.supplying){ctx.shadowColor='rgba(0,255,150,.7)';ctx.shadowBlur=28;}
  else{ctx.shadowColor='rgba(0,255,200,.6)';ctx.shadowBlur=22;}
  ctx.fillStyle='#0b1c2e'; ctx.strokeStyle=gs.supplying?'#00ffaa':'#00ffd0'; ctx.lineWidth=2;
  if(strafing){
    ctx.fillStyle='#071725';
    rrect(ctx,-strafeDir*14,-14,8,24,4); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#0b1c2e';
    rrect(ctx,-9,-18,20,30,8); ctx.fill(); ctx.stroke();
  } else {
    rrect(ctx,-12,-18,24,30,8); ctx.fill(); ctx.stroke();
  }
  if(strafing){
    const sideX=strafeDir*11;
    ctx.fillStyle='rgba(12,42,62,.95)';
    ctx.strokeStyle='rgba(0,255,208,.85)';
    rrect(ctx,sideX-4,-13,8,22,4); ctx.fill(); ctx.stroke();
    ctx.fillStyle='rgba(255,51,102,.9)';
    ctx.fillRect(sideX-2,-2,4,8);
  }
  ctx.save();ctx.translate(0,-22+recoil*.18);ctx.rotate(headNod);
  ctx.fillStyle='#072a40';
  ctx.beginPath(); ctx.arc(0,0,11,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle=gs.supplying?'#00ffaa':'#00ffd0'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(0,0,11,0,Math.PI*2); ctx.stroke();
  const visorX=strafeDir*sideProfile*3.2;
  const visorW=6.5-sideProfile*2.2;
  const vg=ctx.createLinearGradient(visorX-6,-6,visorX+6,6);
  vg.addColorStop(0,gs.heat>50?'#ff8844':'#00ffd0'); vg.addColorStop(1,'#004d66');
  ctx.fillStyle=vg; ctx.beginPath(); ctx.ellipse(visorX,0,visorW,6.5,0,0,Math.PI*2); ctx.fill();
  ctx.restore();
  const lA=-.14+Math.sin(sPhase)*sAmp-lLag-panic*.55+strafeDir*swimAmp*(.28+swim*.42);
  const rA=.14-Math.sin(sPhase+Math.PI)*sAmp-lLag+panic*.55+strafeDir*swimAmp*(.28-swim*.42);
  const farAlpha=strafing ? .42 : 1;
  const leftFar=strafing&&strafeDir>0, rightFar=strafing&&strafeDir<0;
  ctx.save();ctx.translate(-14,-6+recoil*.35);ctx.rotate(lA);
  ctx.globalAlpha=leftFar?farAlpha:1;
  ctx.fillStyle='#0f2a40';ctx.fillRect(-10,-4,10,8);ctx.strokeStyle='#00ffd0';ctx.strokeRect(-10,-4,10,8);
  ctx.save();ctx.translate(-11,3);ctx.rotate(-panic*.9);ctx.fillRect(-4,-2,6,4);ctx.strokeRect(-4,-2,6,4);ctx.restore();ctx.restore();
  ctx.save();ctx.translate(14,-6+recoil*.35);ctx.rotate(rA);
  ctx.globalAlpha=rightFar?farAlpha:1;
  ctx.fillStyle='#0f2a40';ctx.fillRect(0,-4,10,8);ctx.strokeStyle='#00ffd0';ctx.strokeRect(0,-4,10,8);
  ctx.save();ctx.translate(11,3);ctx.rotate(panic*.9);ctx.fillRect(-2,-2,6,4);ctx.strokeRect(-2,-2,6,4);ctx.restore();ctx.restore();
  const kick=flap*Math.sin(sPhase*1.35);
  const llA=-Math.sin(sPhase+.8)*sAmp*.75+lLag*.5-kick*.18-strafeDir*swimAmp*(.16-swim*.24);
  const rlA=Math.sin(sPhase+.8)*sAmp*.75+lLag*.5+kick*.18-strafeDir*swimAmp*(.16+swim*.24);
  ctx.save();ctx.translate(-4,12+recoil);ctx.rotate(llA);
  ctx.globalAlpha=leftFar?farAlpha:1;
  ctx.fillStyle='#0f2a40';ctx.fillRect(-4,0,6,14);ctx.strokeStyle='#00ffd0';ctx.strokeRect(-4,0,6,14);ctx.restore();
  ctx.save();ctx.translate(4,12+recoil);ctx.rotate(rlA);
  ctx.globalAlpha=rightFar?farAlpha:1;
  ctx.fillStyle='#0f2a40';ctx.fillRect(-2,0,6,14);ctx.strokeStyle='#00ffd0';ctx.strokeRect(-2,0,6,14);ctx.restore();
  ctx.fillStyle='#ff3366'; ctx.fillRect(8,-4,6,10);
  ctx.restore();
}

// ════════════════════════════════════════════════════
//  미니맵
// ════════════════════════════════════════════════════
function drawMinimap(){
  const mW=180,mH=180;
  const mapRadius = SOLAR_BODIES.reduce((maxDist,p)=>{
    const dx=p.x-SOLAR_SYSTEM_CENTER.x, dy=p.y-SOLAR_SYSTEM_CENTER.y;
    return Math.max(maxDist,Math.hypot(dx,dy)+p.radius+(p.supplyRadius||0));
  },0);
  const range=Math.max(22000,mapRadius*2.4),scale=mW/range;
  const cX=mW/2, cY=mH/2;
  mmCtx.clearRect(0,0,mW,mH);
  // 배경
  mmCtx.fillStyle='rgba(4,10,20,0.95)';
  mmCtx.fillRect(0,0,mW,mH);
  // 그리드
  mmCtx.strokeStyle='rgba(60,100,140,.15)'; mmCtx.lineWidth=.5;
  mmCtx.beginPath();mmCtx.moveTo(cX,0);mmCtx.lineTo(cX,mH);
  mmCtx.moveTo(0,cY);mmCtx.lineTo(mW,cY);mmCtx.stroke();

  const ax=astronaut.position.x, ay=astronaut.position.y;
  SOLAR_BODIES.forEach(p=>{
    const dx=(p.x-ax)*scale, dy=(p.y-ay)*scale;
    const px=cX+dx, py=cY+dy;
    if(px<-10||px>mW+10||py<-10||py>mH+10) return;
    const pr=p.type==='station' ? Math.max(3.5,p.radius*scale*1.2) : Math.max(2,p.radius*scale*.9);
    // 중력권
    if(p.gravityRange>0){
      mmCtx.strokeStyle=`${p.dot}18`; mmCtx.lineWidth=.5;
      mmCtx.beginPath(); mmCtx.arc(px,py,(p.radius+p.gravityRange)*scale,0,Math.PI*2); mmCtx.stroke();
    }
    // 보급권
    if(p.supply&&p.supplyRadius>0){
      const sc=p.supply==='both'?'rgba(0,255,150,':(p.supply==='o2'?'rgba(0,200,255,':'rgba(255,200,0,');
      mmCtx.strokeStyle=sc+'0.3)'; mmCtx.lineWidth=.8;
      mmCtx.setLineDash([2,3]);
      mmCtx.beginPath(); mmCtx.arc(px,py,(p.radius+p.supplyRadius)*scale,0,Math.PI*2); mmCtx.stroke();
      mmCtx.setLineDash([]);
    }
    // 행성 글로우
    mmCtx.shadowColor=p.dot; mmCtx.shadowBlur=pr>4?8:4;
    mmCtx.fillStyle=gs.visited.has(p.id)?p.dot:p.dot+'88';
    mmCtx.beginPath();
    if(p.type==='station'){
      mmCtx.moveTo(px,py-pr);
      mmCtx.lineTo(px+pr,py);
      mmCtx.lineTo(px,py+pr);
      mmCtx.lineTo(px-pr,py);
      mmCtx.closePath();
    } else {
      mmCtx.arc(px,py,pr,0,Math.PI*2);
    }
    mmCtx.fill();
    mmCtx.shadowBlur=0;
    // 이름
    if(pr>2){
      mmCtx.fillStyle=gs.visited.has(p.id)?'rgba(220,240,255,.9)':'rgba(140,170,200,.5)';
      mmCtx.font=`${Math.max(7,pr+3)}px Arial`;
      mmCtx.textAlign='center';
      mmCtx.fillText(p.type==='station'?p.nameEn:p.name,px,py-pr-2);
    }
  });
  // 우주인
  mmCtx.save(); mmCtx.translate(cX,cY); mmCtx.rotate(astronaut.angle);
  mmCtx.fillStyle='#7fd8ff'; mmCtx.shadowColor='#7fd8ff'; mmCtx.shadowBlur=5;
  mmCtx.beginPath();mmCtx.moveTo(0,-6);mmCtx.lineTo(-3,4);mmCtx.lineTo(0,2);mmCtx.lineTo(3,4);mmCtx.closePath();mmCtx.fill();
  mmCtx.shadowBlur=0; mmCtx.restore();
  // 테두리
  mmCtx.strokeStyle='rgba(100,180,255,.3)'; mmCtx.lineWidth=1;
  mmCtx.strokeRect(.5,.5,mW-1,mH-1);
}

// ════════════════════════════════════════════════════
//  속도 벡터
// ════════════════════════════════════════════════════
function drawVelocityVec(cX,cY){
  const mag=Math.hypot(astronaut.velocity.x,astronaut.velocity.y);
  if(mag<.08) return;
  const s=w2s(astronaut.position.x,astronaut.position.y,cX,cY);
  ctx.save();
  ctx.strokeStyle='rgba(100,255,180,.55)'; ctx.lineWidth=1.5;
  ctx.setLineDash([4,5]);
  ctx.beginPath();
  ctx.moveTo(s.x,s.y);
  ctx.lineTo(s.x+astronaut.velocity.x*22,s.y+astronaut.velocity.y*22);
  ctx.stroke(); ctx.setLineDash([]); ctx.restore();
}

// ════════════════════════════════════════════════════
//  메인 루프
// ════════════════════════════════════════════════════
function loop(){
  if(gs.started) updateControls();
  const gravInfo = gs.started ? applyGravity() : null;
  Engine.update(engine,1000/60);
  if(gs.started) updateSurvival();

  const cX=astronaut.position.x, cY=astronaut.position.y;
  drawBackground(cX,cY);

  // 행성 렌더
  for(const p of SOLAR_BODIES){
    const sc=w2s(p.x,p.y,cX,cY);
    if(sc.x<-p.radius*4||sc.x>viewWidth+p.radius*4||
       sc.y<-p.radius*4||sc.y>viewHeight+p.radius*4) continue;
    p.draw(sc.x,sc.y,p.radius);
  }

  drawParticles(cX,cY);
  drawVelocityVec(cX,cY);
  drawAstronaut(cX,cY);
  if(gs.started){
    drawMinimap();
    updateHUD(gravInfo);
  }

  requestAnimationFrame(loop);
}
loop();
