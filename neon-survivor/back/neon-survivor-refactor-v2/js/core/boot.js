window.Boot = (() => {
  const S = GameState;
  const { clamp, lerp, rand } = Helpers;

  function addShake(v){ S.shake = Math.min(24, S.shake + v); }

  function drawBackground(){
    const w = S.app.renderer.width;
    const h = S.app.renderer.height;
    S.bgGfx.clear();

    S.bgGfx.beginFill(0x05060c, 1);
    S.bgGfx.drawRect(0,0,w,h);
    S.bgGfx.endFill();

    const blobs = [
      {x:w*0.25,y:h*0.30,r: Math.min(w,h)*0.45, c:0x8a5cff, a:0.08},
      {x:w*0.78,y:h*0.62,r: Math.min(w,h)*0.52, c:0x32f6ff, a:0.06},
      {x:w*0.55,y:h*0.18,r: Math.min(w,h)*0.40, c:0xff3edb, a:0.05}
    ];
    for (const b of blobs){
      const g = new PIXI.Graphics();
      g.beginFill(b.c, b.a);
      g.drawCircle(0,0,b.r);
      g.endFill();
      g.x = b.x;
      g.y = b.y;
      g.filters = [new PIXI.filters.BlurFilter(60)];
      S.bg.addChild(g);
      setTimeout(()=>S.bg.removeChild(g), 0);
    }

    const grid = new PIXI.Graphics();
    grid.lineStyle(1, 0x32f6ff, 0.06);
    const step = 56;
    for (let x=0; x<=w; x+=step) { grid.moveTo(x,0); grid.lineTo(x,h); }
    for (let y=0; y<=h; y+=step) { grid.moveTo(0,y); grid.lineTo(w,y); }
    grid.filters = [new PIXI.filters.BlurFilter(1.5)];
    S.bg.addChild(grid);
    setTimeout(()=>S.bg.removeChild(grid), 0);
  }

  function resetAll(practice=false){
    for (const b of S.bullets) S.fx.removeChild(b.spr);
    for (const e of S.enemies) S.uiLayer.removeChild(e.spr);
    for (const p of S.particles) S.fx.removeChild(p.spr);

    S.bullets.length = 0;
    S.enemies.length = 0;
    S.particles.length = 0;

    S.stats.maxHp = 100;
    S.stats.hp = 100;
    S.stats.speed = CONFIG.PLAYER.MOVE_SPEED;
    S.stats.dashSpeed = CONFIG.PLAYER.DASH_SPEED;
    S.stats.dashCd = 0;
    S.stats.dashCdMax = CONFIG.PLAYER.DASH_CD_MAX;
    S.stats.fireRate = CONFIG.PLAYER.FIRE_RATE_BASE;
    S.stats.bulletSpeed = CONFIG.PLAYER.BULLET_SPEED;
    S.stats.bulletDamage = CONFIG.PLAYER.BULLET_DAMAGE;
    S.stats.bulletPierce = 0;
    S.stats.regen = 0;
    S.stats.practice = !!practice;

    S.progression.score = 0;
    S.progression.combo = 1;
    S.progression.comboT = 0;
    S.progression.wave = 1;
    S.progression.waveAlive = 0;
    S.progression.waveTarget = 8;
    S.progression.waveState = "running";
    S.progression.spawnT = 0;
    S.progression.spawnedCount = 0;
    S.progression.level = 1;
    S.progression.xp = 0;
    S.progression.xpToNext = CONFIG.XP.BASE_TO_NEXT;
    S.progression.pendingLevelUps = 0;

    S.shake = 0;

    if (S.player) S.uiLayer.removeChild(S.player.spr);
    S.player = PlayerFactory.makePlayer();

    WaveSystem.startNextWave();
    UI.hudUpdate();
    UI.showCard(null);
  }

  function gameOver(){
    S.progression.waveState = "idle";
    UI.showGameOver();
  }

  function bindInput(){
    window.addEventListener("keydown", (e)=>{
      S.keys.add(e.code);
      if (["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)) e.preventDefault();
    }, { passive:false });

    window.addEventListener("keyup", (e)=>S.keys.delete(e.code));

    S.app.view.addEventListener("pointermove", (e)=>{
      const rect = S.app.view.getBoundingClientRect();
      S.mouse.x = (e.clientX - rect.left) * (S.app.renderer.width / rect.width);
      S.mouse.y = (e.clientY - rect.top) * (S.app.renderer.height / rect.height);
    });

    S.app.view.addEventListener("pointerdown", ()=>{ S.mouse.down = true; });
    window.addEventListener("pointerup", ()=>{ S.mouse.down = false; });
  }

  function resize(){
    S.app.renderer.resize(window.innerWidth, window.innerHeight);
    drawBackground();
  }

  function doDash(){
    const p = S.player;
    if (p.dashT > 0) return;
    if (S.stats.dashCd > 0) return;
    if (!(S.keys.has("ShiftLeft") || S.keys.has("ShiftRight"))) return;

    let dx = 0, dy = 0;
    if (S.keys.has("KeyA") || S.keys.has("ArrowLeft")) dx -= 1;
    if (S.keys.has("KeyD") || S.keys.has("ArrowRight")) dx += 1;
    if (S.keys.has("KeyW") || S.keys.has("ArrowUp")) dy -= 1;
    if (S.keys.has("KeyS") || S.keys.has("ArrowDown")) dy += 1;

    if (dx === 0 && dy === 0){
      const ang = Math.atan2(S.mouse.y - p.spr.y, S.mouse.x - p.spr.x);
      dx = Math.cos(ang);
      dy = Math.sin(ang);
    } else {
      const m = Math.hypot(dx, dy) || 1;
      dx /= m; dy /= m;
    }

    p.vx += dx * S.stats.dashSpeed;
    p.vy += dy * S.stats.dashSpeed;
    p.inv = 18;
    p.dashT = 10;
    S.stats.dashCd = S.stats.dashCdMax;
    addShake(8);
    PixiFx.emitParticle(p.spr.x, p.spr.y, 0x8a5cff, 18, 1.3);
  }

  function updatePlayer(dt){
    const p = S.player;

    if (p.fireCd > 0) p.fireCd -= dt;
    if (p.inv > 0) p.inv -= dt;
    if (p.dashT > 0) p.dashT -= dt;
    if (S.stats.dashCd > 0) S.stats.dashCd -= dt;

    let ax = 0, ay = 0;
    if (S.keys.has("KeyA") || S.keys.has("ArrowLeft")) ax -= 1;
    if (S.keys.has("KeyD") || S.keys.has("ArrowRight")) ax += 1;
    if (S.keys.has("KeyW") || S.keys.has("ArrowUp")) ay -= 1;
    if (S.keys.has("KeyS") || S.keys.has("ArrowDown")) ay += 1;

    if (ax !== 0 || ay !== 0){
      const m = Math.hypot(ax, ay) || 1;
      ax /= m; ay /= m;
    }

    doDash();

    const accel = S.stats.speed * 0.9;
    p.vx = lerp(p.vx, ax * accel, 0.18);
    p.vy = lerp(p.vy, ay * accel, 0.18);

    p.spr.x += p.vx * dt;
    p.spr.y += p.vy * dt;

    const w = S.app.renderer.width;
    const h = S.app.renderer.height;
    p.spr.x = clamp(p.spr.x, 20, w-20);
    p.spr.y = clamp(p.spr.y, 20, h-20);

    const ang = Math.atan2(S.mouse.y - p.spr.y, S.mouse.x - p.spr.x);
    p.spr.rotation = ang + Math.PI / 2;
  }

  function updateParticles(dt){
    for (let i=S.particles.length-1; i>=0; i--){
      const p = S.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.life -= dt;
      p.spr.x = p.x;
      p.spr.y = p.y;
      p.spr.alpha = Math.max(0, p.life / 36);
      if (p.life <= 0){
        S.fx.removeChild(p.spr);
        S.particles.splice(i, 1);
      }
    }
  }

  function updateProgress(dt){
    const P = S.progression;

    if (S.stats.regen > 0 && S.stats.hp < S.stats.maxHp){
      S.stats.hp = Math.min(S.stats.maxHp, S.stats.hp + S.stats.regen * (dt/60));
    }

    if (P.comboT > 0){
      P.comboT -= dt;
    } else {
      P.combo = lerp(P.combo, 1, 0.06);
      if (P.combo < 1.02) P.combo = 1;
    }

    P.spawnT += dt;
    const spawnRate = Math.max(11, 46 - P.wave * 1.15);
    while (P.spawnT >= spawnRate && P.spawnedCount < P.waveTarget){
      P.spawnT -= spawnRate;
      EnemySystem.spawnEnemy();
    }

    if (P.spawnedCount >= P.waveTarget && P.waveAlive <= 0 && S.enemies.length === 0){
      WaveSystem.completeCurrentWave();
    }
  }

  function tick(dt){
    if (S.shake > 0.01){
      S.shake *= 0.87;
      S.world.x = rand(-S.shake, S.shake);
      S.world.y = rand(-S.shake, S.shake);
    } else {
      S.world.x = 0;
      S.world.y = 0;
      S.shake = 0;
    }

    if (S.progression.waveState !== "running") return;

    updateProgress(dt);
    updatePlayer(dt);
    CombatSystem.tryShoot();
    EnemySystem.updateEnemies(dt);
    CombatSystem.updateBullets(dt);
    updateParticles(dt);
    UI.hudUpdate();
  }

  function init(){
    S.app = new PIXI.Application({
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(2, window.devicePixelRatio || 1),
      autoDensity: true
    });

    document.getElementById("wrap").appendChild(S.app.view);

    S.stage = S.app.stage;
    S.world = new PIXI.Container();
    S.stage.addChild(S.world);

    S.bg = new PIXI.Container();
    S.fx = new PIXI.Container();
    S.uiLayer = new PIXI.Container();
    S.world.addChild(S.bg, S.fx, S.uiLayer);

    S.bgGfx = new PIXI.Graphics();
    S.bg.addChild(S.bgGfx);

    resize();
    bindInput();

    UI.bindButtons({
      onStart: ()=>resetAll(false),
      onPractice: ()=>resetAll(true),
      onRetry: ()=>resetAll(S.stats.practice),
      onBack: ()=>UI.showCard("start")
    });

    UI.showCard("start");
    UI.hudUpdate();

    S.app.ticker.add(tick);
    window.addEventListener("resize", resize);
  }

  init();

  return { resetAll, gameOver };
})();
