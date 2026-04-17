(() => {
  const S = GameState;
  const { clamp, lerp, dist2 } = Helpers;

  function makePlayer(){
    const c = new PIXI.Container();
    const body = new PIXI.Graphics();
    body.beginFill(0x0b0b18, 1);
    body.lineStyle(2, 0x32f6ff, 0.9);
    body.drawPolygon([ 0,-16, 12,14, 0,8, -12,14 ]);
    body.endFill();

    const core = new PIXI.Graphics();
    core.beginFill(0xff3edb, 0.95);
    core.drawCircle(0,2,3.5);
    core.endFill();

    c.addChild(body, core);
    c.x = S.app.renderer.width / 2;
    c.y = S.app.renderer.height / 2;
    S.uiLayer.addChild(c);

    return {
      type:"player",
      spr:c,
      r:14,
      vx:0, vy:0,
      inv:0,
      fireCd:0,
      dashT:0
    };
  }

  function showBackground(){
    const w = S.app.renderer.width;
    const h = S.app.renderer.height;
    S.bgGfx.clear();
    S.bgGfx.beginFill(0x05060c, 1);
    S.bgGfx.drawRect(0,0,w,h);
    S.bgGfx.endFill();
  }

  function resetAll(practice=false){
    for (const b of S.bullets) S.fx.removeChild(b.spr);
    for (const e of S.enemies) S.uiLayer.removeChild(e.spr);

    S.bullets.length = 0;
    S.enemies.length = 0;
    S.particles.length = 0;

    S.stats.maxHp = 100;
    S.stats.hp = 100;
    S.stats.speed = 4.6;
    S.stats.dashSpeed = 14;
    S.stats.dashCd = 0;
    S.stats.dashCdMax = 70;
    S.stats.fireRate = CONFIG.PLAYER.FIRE_RATE_BASE;
    S.stats.bulletSpeed = 12;
    S.stats.bulletDamage = 1;
    S.stats.bulletPierce = 0;
    S.stats.regen = 0;
    S.stats.practice = !!practice;

    S.score = 0;
    S.combo = 1;
    S.comboT = 0;
    S.wave = 1;
    S.waveTarget = 8;
    S.waveAlive = 0;
    S.spawnT = 0;
    S.spawnedCount = 0;
    S.waveState = "running";

    if (S.player) S.uiLayer.removeChild(S.player.spr);
    S.player = makePlayer();

    startNextWave();
    UI.hudUpdate();
    UI.showCard(null);
  }

  function startNextWave(){
    S.waveTarget = 6 + Math.floor(S.wave * 2.3);
    S.waveAlive = 0;
    S.spawnT = 0;
    S.spawnedCount = 0;
  }

  function gameOver(){
    S.waveState = "idle";
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
    showBackground();
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
      ax /= m;
      ay /= m;
    }

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

  function updateEnemies(dt){
    const p = S.player;
    for (let i=S.enemies.length-1; i>=0; i--){
      const e = S.enemies[i];
      let dx = p.spr.x - e.x;
      let dy = p.spr.y - e.y;
      const d = Math.hypot(dx,dy) || 1;
      dx /= d;
      dy /= d;

      e.x += dx * e.sp * dt;
      e.y += dy * e.sp * dt;
      e.spr.x = e.x;
      e.spr.y = e.y;
      e.spr.rotation = Math.atan2(dy, dx);
      e.hpText.rotation = -e.spr.rotation;

      if (e.hitT > 0){
        e.hitT -= dt;
        e.spr.alpha = 0.7;
      } else {
        e.spr.alpha = 1;
      }

      const rr = e.r + p.r;
      if (dist2(e.x,e.y,p.spr.x,p.spr.y) < rr*rr){
        if (p.inv <= 0 && !S.stats.practice){
          S.stats.hp -= e.dmg;
          p.inv = 30;
          if (S.stats.hp <= 0){
            S.stats.hp = 0;
            gameOver();
          }
        }
      }
    }
  }

  function loop(dt){
    if (S.waveState !== "running") return;

    if (S.stats.regen > 0 && S.stats.hp < S.stats.maxHp){
      S.stats.hp = Math.min(S.stats.maxHp, S.stats.hp + S.stats.regen * (dt/60));
    }

    if (S.comboT > 0){
      S.comboT -= dt;
    } else {
      S.combo = lerp(S.combo, 1, 0.06);
      if (S.combo < 1.02) S.combo = 1;
    }

    updatePlayer(dt);
    CombatSystem.tryShoot();

    S.spawnT += dt;
    const spawnRate = Math.max(11, 46 - S.wave * 1.15);
    while (S.spawnT >= spawnRate && S.spawnedCount < S.waveTarget){
      S.spawnT -= spawnRate;
      EnemySystem.spawnEnemy();
    }

    updateEnemies(dt);
    CombatSystem.updateBullets(dt);

    if (S.spawnedCount >= S.waveTarget && S.waveAlive <= 0 && S.enemies.length === 0){
      S.wave++;
      startNextWave();
    }

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

    S.app.ticker.add(loop);
    window.addEventListener("resize", resize);
  }

  init();
})();
