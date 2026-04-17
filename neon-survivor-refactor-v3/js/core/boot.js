window.Boot = (() => {
  const S = GameState;

  function addShake(v){ S.shake = Math.min(24, S.shake + v); }

  function resetAll(testMode=false){
    for (const d of S.decoys) S.uiLayer.removeChild(d.spr);
    for (const b of S.bullets) S.fx.removeChild(b.spr);
    for (const b of S.enemyBullets) S.fx.removeChild(b.spr);
    for (const beam of S.beams) S.fx.removeChild(beam.spr);
    for (const m of S.missiles) S.fx.removeChild(m.spr);
    for (const e of S.enemies) S.uiLayer.removeChild(e.spr);
    for (const p of S.particles) S.fx.removeChild(p.spr);

    S.decoys.length = 0;
    S.bullets.length = 0;
    S.enemyBullets.length = 0;
    S.beams.length = 0;
    S.missiles.length = 0;
    S.enemies.length = 0;
    S.particles.length = 0;

    S.stats.maxHp = 100;
    S.stats.hp = 100;
    S.stats.speed = GAME_BALANCE.PLAYER.MOVE_SPEED;
    S.stats.dashSpeed = GAME_BALANCE.PLAYER.DASH_SPEED;
    S.stats.dashCd = 0;
    S.stats.dashCdMax = GAME_BALANCE.PLAYER.DASH_CD_MAX;
    S.stats.fireRate = GAME_BALANCE.PLAYER.FIRE_RATE_BASE;
    S.stats.bulletSpeed = GAME_BALANCE.PLAYER.BULLET_SPEED;
    S.stats.bulletDamage = GAME_BALANCE.PLAYER.BULLET_DAMAGE;
    S.stats.bulletCount = GAME_BALANCE.PLAYER.BULLET_COUNT;
    S.stats.bulletPierce = 0;
    S.stats.defense = GAME_BALANCE.PLAYER.DEFENSE;
    S.stats.mp = GAME_BALANCE.PLAYER.MP_MAX;
    S.stats.mpMax = GAME_BALANCE.PLAYER.MP_MAX;
    S.stats.mpRegen = GAME_BALANCE.PLAYER.MP_REGEN;
    S.stats.regen = 0;
    S.stats.shield = 0;
    S.stats.shieldMax = 0;
    S.stats.shieldRegen = 0;
    S.stats.shieldRegenDelay = 0;
    S.stats.shieldRegenDelayMax = GAME_BALANCE.PLAYER.SHIELD_REGEN_DELAY_MAX;
    S.stats.homingMissileLevel = 0;
    S.stats.homingMissileDamage = GAME_BALANCE.PLAYER.HOMING_MISSILE_DAMAGE;
    S.stats.homingMissileCd = 0;
    S.stats.homingMissileCdMax = GAME_BALANCE.PLAYER.HOMING_MISSILE_CD_MAX;
    S.stats.practice = !!testMode;

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
    S.progression.xpToNext = GAME_BALANCE.XP.BASE_TO_NEXT;
    S.progression.pendingLevelUps = 0;
    S.progression.deathTimer = 0;

    S.shake = 0;
    S.activeSkillState.boostDir = 0;
    S.activeSkillState.boostDrag = 0.9;
    S.activeSkillState.boostMitigationT = 0;
    S.activeSkillState.boostMitigationMul = 1;
    S.activeSkillState.boostT = 0;
    S.activeSkillState.afterburnerT = 0;
    S.weaponState.laserChannel = null;

    if (S.player) S.uiLayer.removeChild(S.player.spr);
    S.player = PlayerFactory.makePlayer();
    CombatSystem.applyStartingWeaponLoadout(testMode);
    SkillSystem.applyStartingLoadout(testMode);
    ActiveSkillSystem.assignStartingLoadout(testMode);

    WaveSystem.startNextWave();
    UI.hudUpdate();
    UI.showCard(null);
  }

  function gameOver(){
    if (S.progression.waveState === "dying" || S.progression.waveState === "idle") return;

    S.progression.waveState = "dying";
    S.progression.deathTimer = 28;
    S.mouse.down = false;
    S.keys.delete("Space");

    if (S.weaponState.laserChannel){
      S.fx.removeChild(S.weaponState.laserChannel.beam.spr);
      S.weaponState.laserChannel = null;
    }

    if (S.player && S.player.spr){
      Effects.emitPlayerExplosion(S.player.spr.x, S.player.spr.y);
      S.player.spr.visible = false;
    }

    addShake(16);
  }

  function bindInput(){
    window.addEventListener("keydown", (e)=>{
      S.keys.add(e.code);
      if (["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)) e.preventDefault();
      if (e.code === "Digit1") ActiveSkillSystem.tryUseBoostDirection("forward");
      if (e.code === "Digit2") ActiveSkillSystem.tryUseBoostDirection("left");
      if (e.code === "Digit3") ActiveSkillSystem.tryUseBoostDirection("back");
      if (e.code === "Digit4") ActiveSkillSystem.tryUseBoostDirection("right");
      ActiveSkillSystem.tryUseSlotByKey(e.code);
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
    BackgroundRenderer.drawBackground();
  }

  function doDash(){
    const p = S.player;
    if (p.dashT > 0) return;
    if (S.stats.dashCd > 0) return;
    if (!(S.keys.has("ShiftLeft") || S.keys.has("ShiftRight"))) return;

    let dx = 0;
    let dy = 0;
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
      dx /= m;
      dy /= m;
    }

    p.vx += dx * S.stats.dashSpeed;
    p.vy += dy * S.stats.dashSpeed;
    p.inv = 18;
    p.dashT = 10;
    S.stats.dashCd = S.stats.dashCdMax;
    addShake(8);
    Effects.emitParticle(p.spr.x, p.spr.y, 0x8a5cff, 18, 1.3);
  }

  function updatePlayer(dt){
    const p = S.player;

    if (p.fireCd > 0) p.fireCd -= dt;
    if (p.inv > 0) p.inv -= dt;
    if (p.dashT > 0) p.dashT -= dt;
    if (S.stats.dashCd > 0) S.stats.dashCd -= dt;

    if (p.shieldSpr){
      const ratio = S.stats.shieldMax > 0 ? Helpers.clamp(S.stats.shield / S.stats.shieldMax, 0, 1) : 0;
      p.shieldSpr.alpha = ratio > 0.01 ? (0.15 + ratio * 0.45) : 0;
      const pulse = 1 + Math.sin(performance.now() / 160) * 0.04;
      p.shieldSpr.scale.set(pulse + ratio * 0.06);
      p.shieldSpr.rotation += 0.01 * dt;
    }

    let ax = 0;
    let ay = 0;
    if (S.keys.has("KeyA") || S.keys.has("ArrowLeft")) ax -= 1;
    if (S.keys.has("KeyD") || S.keys.has("ArrowRight")) ax += 1;
    if (S.keys.has("KeyW") || S.keys.has("ArrowUp")) ay -= 1;
    if (S.keys.has("KeyS") || S.keys.has("ArrowDown")) ay += 1;

    if (ax !== 0 || ay !== 0){
      const m = Math.hypot(ax, ay) || 1;
      ax /= m;
      ay /= m;
    }

    doDash();

    const afterburnerSkill = ActiveSkillSystem.getDefinition("afterburner");
    const afterburnerBoost = S.activeSkillState.afterburnerT > 0 && afterburnerSkill
      ? afterburnerSkill.effectData.speedMultiplier
      : 1;
    const accel = S.stats.speed * afterburnerBoost * 0.9;
    p.vx = Helpers.lerp(p.vx, ax * accel, 0.18);
    p.vy = Helpers.lerp(p.vy, ay * accel, 0.18);
    if (S.activeSkillState.boostT > 0){
      p.vx *= S.activeSkillState.boostDrag;
      p.vy *= S.activeSkillState.boostDrag;
    }

    p.spr.x += p.vx * dt;
    p.spr.y += p.vy * dt;

    const w = S.app.renderer.width;
    const h = S.app.renderer.height;
    p.spr.x = Helpers.clamp(p.spr.x, 20, w - 20);
    p.spr.y = Helpers.clamp(p.spr.y, 20, h - 20);

    const ang = Math.atan2(S.mouse.y - p.spr.y, S.mouse.x - p.spr.x);
    p.spr.rotation = ang + Math.PI / 2;
  }

  function updateParticles(dt){
    for (let i=S.particles.length-1; i>=0; i--){
      const p = S.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= p.drag || 0.92;
      p.vy *= p.drag || 0.92;
      p.life -= dt;
      p.spr.x = p.x;
      p.spr.y = p.y;
      if (p.pulse){
        const progress = 1 - (p.life / (p.maxLife || 1));
        const scale = 1 + progress * p.pulseRadius;
        p.spr.scale.set(scale);
        p.spr.alpha = Math.max(0, 1 - progress);
      } else {
        p.spr.alpha = Math.max(0, p.life / 36);
      }
      if (p.life <= 0){
        S.fx.removeChild(p.spr);
        S.particles.splice(i, 1);
      }
    }
  }

  function updateProgress(dt){
    const P = S.progression;

    if (S.stats.regen > 0 && S.stats.hp < S.stats.maxHp){
      S.stats.hp = Math.min(S.stats.maxHp, S.stats.hp + S.stats.regen * (dt / 60));
    }
    if (S.stats.mp < S.stats.mpMax){
      S.stats.mp = Math.min(S.stats.mpMax, S.stats.mp + S.stats.mpRegen * (dt / 60));
    }
    if (S.stats.shieldMax > 0){
      if (S.stats.shieldRegenDelay > 0){
        S.stats.shieldRegenDelay -= dt;
      } else if (S.stats.shield < S.stats.shieldMax && S.stats.shieldRegen > 0){
        S.stats.shield = Math.min(S.stats.shieldMax, S.stats.shield + S.stats.shieldRegen * (dt / 60));
      }
    }

    if (P.comboT > 0){
      P.comboT -= dt;
    } else {
      P.combo = Helpers.lerp(P.combo, 1, 0.06);
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
      S.world.x = Helpers.rand(-S.shake, S.shake);
      S.world.y = Helpers.rand(-S.shake, S.shake);
    } else {
      S.world.x = 0;
      S.world.y = 0;
      S.shake = 0;
    }

    if (S.progression.waveState === "dying"){
      updateParticles(dt);
      if (S.progression.deathTimer > 0){
        S.progression.deathTimer -= dt;
      } else {
        S.progression.waveState = "idle";
        UI.showGameOver();
      }
      return;
    }

    if (S.progression.waveState !== "running") return;

    updateProgress(dt);
    updatePlayer(dt);
    CombatSystem.tryShoot();
    CombatSystem.tryShootMissiles();
    ActiveSkillSystem.update(dt);
    EnemySystem.updateEnemies(dt);
    EnemySystem.updateEnemyBullets(dt);
    CombatSystem.updateBullets(dt);
    CombatSystem.updateBeams(dt);
    CombatSystem.updateMissiles(dt);
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
    S.bgLayer = new PIXI.Container();
    S.world = new PIXI.Container();
    S.stage.addChild(S.bgLayer, S.world);

    S.bg = new PIXI.Container();
    S.fx = new PIXI.Container();
    S.uiLayer = new PIXI.Container();
    S.bgLayer.addChild(S.bg);
    S.world.addChild(S.fx, S.uiLayer);

    S.bgGfx = new PIXI.Graphics();
    S.bgDecor = new PIXI.Container();
    S.bg.addChild(S.bgGfx, S.bgDecor);

    resize();
    bindInput();

    UI.bindButtons({
      onStart: ()=>resetAll(false),
      onPractice: ()=>resetAll(true),
      onRetry: ()=>resetAll(S.stats.practice),
      onBack: ()=>UI.showCard("start")
    });

    UI.showCard("start");
    ActiveSkillSystem.assignStartingLoadout(false);
    UI.hudUpdate();

    S.app.ticker.add(tick);
    window.addEventListener("resize", resize);
  }

  init();

  return { resetAll, gameOver };
})();
