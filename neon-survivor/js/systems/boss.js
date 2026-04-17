window.BossSystem = (() => {
  const PRACTICE_DEFAULT = "basic";

  function getDefinitions() {
    return Object.values(window.BOSS_DEFINITIONS || {});
  }

  function getDefinition(id) {
    return (window.BOSS_DEFINITIONS || {})[id] || null;
  }

  function getPracticeBossId() {
    const S = GameState;
    if (!S.practiceBossId || !getDefinition(S.practiceBossId)) {
      S.practiceBossId = PRACTICE_DEFAULT;
    }
    return S.practiceBossId;
  }

  function setPracticeBossId(id) {
    if (!getDefinition(id)) return false;
    GameState.practiceBossId = id;
    return true;
  }

  function hasActiveBoss() {
    return GameState.enemies.some((enemy) => enemy && enemy.isBoss && enemy.hp > 0);
  }

  function getActiveBoss() {
    return GameState.enemies.find((enemy) => enemy && enemy.isBoss && enemy.hp > 0) || null;
  }

  function isBossWave(wave = GameState.progression.wave) {
    return !GameState.stats.practice && wave > 0 && wave % 5 === 0;
  }

  function getWaveBossId(wave = GameState.progression.wave) {
    const order = ["basic", "advanced", "knight", "split", "summoner"];
    const index = Math.max(0, Math.floor(wave / 5) - 1) % order.length;
    return order[index];
  }

  function shouldSuppressPracticeSpawns() {
    return !!GameState.stats.practice;
  }

  function shouldSuppressEnemySpawns() {
    return shouldSuppressPracticeSpawns() || hasActiveBoss() || isBossWave();
  }

  function makeBossBullet(x, y, angle, options = {}) {
    const S = GameState;
    const spr = Effects.makeBulletSprite(x, y, angle, options.color || 0xffd166);
    spr.scale.set(options.scaleX || 1.15, options.scaleY || 1.15);
    S.fx.addChild(spr);
    return {
      spr,
      x,
      y,
      vx: Math.cos(angle) * (options.speed || 5.8),
      vy: Math.sin(angle) * (options.speed || 5.8),
      r: options.radius || 9,
      dmg: options.damage || 8,
      life: options.life || 140,
      color: options.color || 0xffd166
    };
  }

  function clearCurrentArena() {
    const S = GameState;
    for (const enemy of [...S.enemies]) {
      if (enemy.destroyVisuals) enemy.destroyVisuals();
      else if (enemy.spr && enemy.spr.parent) enemy.spr.parent.removeChild(enemy.spr);
    }
    S.enemies.length = 0;
    for (const bullet of S.enemyBullets) {
      if (bullet.spr && bullet.spr.parent) bullet.spr.parent.removeChild(bullet.spr);
    }
    S.enemyBullets.length = 0;
    S.progression.waveAlive = 0;
    S.progression.spawnedCount = 0;
  }

  function buildBossFrame(config) {
    const root = new PIXI.Container();
    const aura = new PIXI.Graphics();
    const shell = new PIXI.Graphics();
    const core = new PIXI.Graphics();
    const code = new PIXI.Text(config.code, {
      fontFamily: "Arial",
      fontSize: 12,
      fontWeight: "900",
      fill: 0xffffff,
      stroke: 0x000000,
      strokeThickness: 3,
      align: "center"
    });
    code.anchor.set(0.5);
    code.y = 4;
    const value = new PIXI.Text("", {
      fontFamily: "Arial",
      fontSize: Math.max(10, Math.round(config.radius * 0.6)),
      fontWeight: "900",
      fill: 0xffffff,
      stroke: 0x000000,
      strokeThickness: 3,
      align: "center"
    });
    value.anchor.set(0.5);
    value.y = -3;
    aura.beginFill(config.glowColor, 0.12);
    aura.drawCircle(0, 0, config.radius + 20);
    aura.endFill();
    shell.beginFill(0x0a0f1d, 0.95);
    shell.lineStyle(4, config.bodyColor, 0.95);
    shell.drawCircle(0, 0, config.radius);
    shell.endFill();
    core.beginFill(config.glowColor, 0.2);
    core.drawCircle(0, 0, config.radius - 7);
    core.endFill();
    core.lineStyle(2, 0xffffff, 0.45);
    core.moveTo(-config.radius * 0.45, 0);
    core.lineTo(config.radius * 0.45, 0);
    core.moveTo(0, -config.radius * 0.45);
    core.lineTo(0, config.radius * 0.45);
    root.addChild(aura, shell, core, value, code);
    const glow = Effects.makeGlowFilter({ color: config.glowColor, distance: 22, outerStrength: 2.1, innerStrength: 0.5 });
    root.filters = Effects.asFilters(glow);
    root.valueText = value;
    root.codeText = code;
    return root;
  }

  function setBossFrameValue(frame, value) {
    if (!frame || !frame.valueText) return;
    frame.valueText.text = String(Math.max(0, Math.ceil(value)));
  }

  function attachHpBar(container, width) {
    const barBg = new PIXI.Graphics();
    const barFill = new PIXI.Graphics();
    barBg.y = -72;
    barFill.y = -72;
    container.addChild(barBg, barFill);
    return { barBg, barFill, width };
  }

  function attachMiniHpBar(container, width, y = -28) {
    const barBg = new PIXI.Graphics();
    const barFill = new PIXI.Graphics();
    barBg.y = y;
    barFill.y = y;
    container.addChild(barBg, barFill);
    return { barBg, barFill, width };
  }

  function redrawHpBar(bar, ratio, color) {
    bar.barBg.clear();
    bar.barBg.beginFill(0x02040a, 0.75);
    bar.barBg.lineStyle(2, 0xffffff, 0.4);
    bar.barBg.drawRoundedRect(-bar.width / 2, 0, bar.width, 10, 5);
    bar.barBg.endFill();
    bar.barFill.clear();
    bar.barFill.beginFill(color, 0.95);
    bar.barFill.drawRoundedRect(-bar.width / 2, 0, Math.max(0, bar.width * ratio), 10, 5);
    bar.barFill.endFill();
  }

  function redrawMiniHpBar(bar, ratio, color) {
    bar.barBg.clear();
    bar.barBg.beginFill(0x05070d, 0.75);
    bar.barBg.lineStyle(1, 0xffffff, 0.28);
    bar.barBg.drawRoundedRect(-bar.width / 2, 0, bar.width, 5, 3);
    bar.barBg.endFill();
    bar.barFill.clear();
    bar.barFill.beginFill(color, 0.95);
    bar.barFill.drawRoundedRect(-bar.width / 2, 0, Math.max(0, bar.width * ratio), 5, 3);
    bar.barFill.endFill();
  }

  function createBaseBoss(def, options = {}) {
    const root = new PIXI.Container();
    root.x = GameState.app.renderer.width * 0.5;
    root.y = 120;
    GameState.uiLayer.addChild(root);

    const boss = {
      type: "enemy",
      tier: "boss",
      isBoss: true,
      bossId: def.id,
      displayName: def.name,
      spr: root,
      x: root.x,
      y: root.y,
      r: def.radius,
      hp: def.maxHp,
      maxHp: def.maxHp,
      scoreBase: def.scoreBase,
      xp: def.xp,
      glowColor: def.glowColor,
      hitT: 0,
      slowT: 0,
      slowMul: 1,
      contactDamage: options.contactDamage || 12,
      collisionPush: options.collisionPush || 6.5,
      destroyVisuals() {
        if (boss.spr && boss.spr.parent) boss.spr.parent.removeChild(boss.spr);
      },
      getHitCircles() {
        return [{ x: boss.x, y: boss.y, radius: boss.r }];
      },
      takeDamage(damage) {
        boss.hp = Math.max(0, boss.hp - damage);
        return true;
      },
      onDefeat() {
        Effects.emitPulse(boss.x, boss.y, boss.glowColor, 110, 20);
        Effects.emitParticle(boss.x, boss.y, boss.glowColor, 32, 1.8);
      },
      onPlayerCollide({ player, hitCircle, dx, dy }) {
        return EnemySystem.hitPlayerWithEnemyDamage(boss.contactDamage, boss.glowColor, dx, dy, {
          invFrames: 32,
          push: boss.collisionPush,
          particleCount: 18,
          particlePower: 1.3,
          pulseRadius: hitCircle.radius + player.r + 10,
          pulseLife: 12
        });
      }
    };

    return boss;
  }

  function createBasicBoss() {
    const def = getDefinition("basic");
    const boss = createBaseBoss(def, { contactDamage: 14, collisionPush: 7.2 });
    boss.core = buildBossFrame({ radius: def.radius, code: def.code, bodyColor: 0x79ffbf, glowColor: 0x48ffc5 });
    boss.hpBar = attachHpBar(boss.spr, 180);
    boss.fireCd = 24;
    boss.patternIndex = 0;
    boss.orbitT = 0;
    boss.spr.addChild(boss.core);
    boss.updateBoss = (dt) => {
      boss.orbitT += dt * 0.012;
      const w = GameState.app.renderer.width;
      boss.x = Helpers.lerp(boss.x, w * 0.5 + Math.cos(boss.orbitT) * 150, 0.05 * dt);
      boss.y = Helpers.lerp(boss.y, 118 + Math.sin(boss.orbitT * 2) * 28, 0.05 * dt);
      boss.spr.x = boss.x;
      boss.spr.y = boss.y;
      boss.fireCd -= dt;
      if (boss.fireCd <= 14 && boss.fireCd + dt > 14) {
        if (boss.patternIndex % 3 === 0) {
          const aim = Math.atan2(GameState.player.spr.y - boss.y, GameState.player.spr.x - boss.x);
          Effects.emitLineTelegraph(boss.x, boss.y, boss.x + Math.cos(aim) * 220, boss.y + Math.sin(aim) * 220, 0x79ffbf, 14, 6);
        } else {
          Effects.emitGroundTelegraph(boss.x, boss.y, boss.hp <= boss.maxHp * 0.5 ? 86 : 70, 0xffd166, 14);
        }
      }
      if (boss.fireCd <= 0) {
        if (boss.patternIndex % 3 === 0) {
          const aim = Math.atan2(GameState.player.spr.y - boss.y, GameState.player.spr.x - boss.x);
          for (let i = -2; i <= 2; i++) {
            GameState.enemyBullets.push(makeBossBullet(boss.x, boss.y + 16, aim + i * 0.16, {
              color: 0x79ffbf,
              speed: 6.6,
              damage: 8,
              radius: 8
            }));
          }
          boss.fireCd = 34;
        } else {
          const count = boss.hp <= boss.maxHp * 0.5 ? 14 : 10;
          const speed = boss.hp <= boss.maxHp * 0.5 ? 5.8 : 5.0;
          const spin = performance.now() * 0.0025;
          for (let i = 0; i < count; i++) {
            const angle = spin + (Math.PI * 2 * i) / count;
            GameState.enemyBullets.push(makeBossBullet(boss.x, boss.y, angle, {
              color: 0xffd166,
              speed,
              damage: 7,
              radius: 7
            }));
          }
          boss.fireCd = boss.hp <= boss.maxHp * 0.5 ? 48 : 58;
        }
        boss.patternIndex += 1;
      }
      redrawHpBar(boss.hpBar, boss.hp / boss.maxHp, boss.hp <= boss.maxHp * 0.4 ? 0xff9b8d : 0x79ffbf);
      setBossFrameValue(boss.core, boss.hp);
      boss.core.scale.set(1 + Math.sin(performance.now() * 0.01) * 0.03);
    };
    return boss;
  }

  function createAdvancedBoss() {
    const def = getDefinition("advanced");
    const boss = createBaseBoss(def, { contactDamage: 15, collisionPush: 7.6 });
    boss.phase = 1;
    boss.phaseShiftPlayed = false;
    boss.core = buildBossFrame({ radius: def.radius, code: def.code, bodyColor: 0x7a5cff, glowColor: 0x9a7dff });
    boss.hpBar = attachHpBar(boss.spr, 200);
    boss.orbitT = Math.random() * Math.PI * 2;
    boss.aiCd = 28;
    boss.attackIndex = 0;
    boss.pendingActions = [];
    boss.currentAction = "IDLE";
    boss.spr.addChild(boss.core);

    function schedule(delay, run) {
      boss.pendingActions.push({ delay, run });
    }

    function updatePending(dt) {
      for (let i = boss.pendingActions.length - 1; i >= 0; i--) {
        const item = boss.pendingActions[i];
        item.delay -= dt;
        if (item.delay <= 0) {
          item.run();
          boss.pendingActions.splice(i, 1);
        }
      }
    }

    function radialBurst(x, y, count, speed, color, damage, angleOffset = 0, radius = 7) {
      for (let i = 0; i < count; i++) {
        const angle = angleOffset + (Math.PI * 2 * i) / count;
        GameState.enemyBullets.push(makeBossBullet(x, y, angle, {
          color,
          speed,
          damage,
          radius
        }));
      }
    }

    function safeLaneBurst(randomize) {
      const player = GameState.player;
      const laneAngle = Math.atan2(player.spr.y - boss.y, player.spr.x - boss.x) + (randomize ? Helpers.rand(-0.45, 0.45) : 0);
      const laneWidth = randomize ? 0.4 : 0.62;
      const count = randomize ? 40 : 34;
      const speed = randomize ? 6.2 : 5.4;
      Effects.emitLineTelegraph(boss.x, boss.y, boss.x + Math.cos(laneAngle) * 220, boss.y + Math.sin(laneAngle) * 220, randomize ? 0xff6bb5 : 0x7df9ff, 12, 7);
      schedule(12, () => {
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count;
          let delta = angle - laneAngle;
          while (delta > Math.PI) delta -= Math.PI * 2;
          while (delta < -Math.PI) delta += Math.PI * 2;
          if (Math.abs(delta) < laneWidth * 0.5) continue;
          GameState.enemyBullets.push(makeBossBullet(boss.x, boss.y, angle, {
            color: randomize ? 0xff6bb5 : 0x7df9ff,
            speed,
            damage: randomize ? 9 : 8,
            radius: 6
          }));
        }
      });
    }

    function trackingZone() {
      const player = GameState.player;
      const tx = player.spr.x;
      const ty = player.spr.y;
      boss.currentAction = "TRACKING";
      Effects.emitGroundTelegraph(tx, ty, boss.phase === 1 ? 54 : 64, 0xffb347, 16);
      schedule(16, () => {
        radialBurst(tx, ty, boss.phase === 1 ? 10 : 14, boss.phase === 1 ? 5.0 : 5.8, 0xffb347, 8, performance.now() * 0.002);
        Effects.emitPulse(tx, ty, 0xffb347, boss.phase === 1 ? 48 : 62, 12);
      });
    }

    function rotatingBurst() {
      boss.currentAction = "ROTATING";
      Effects.emitGroundTelegraph(boss.x, boss.y, 68, 0x9a7dff, 12);
      schedule(12, () => {
        radialBurst(boss.x, boss.y, 14, 5.2, 0x9a7dff, 8, boss.orbitT * 0.8);
      });
    }

    function doubleRing() {
      boss.currentAction = "DOUBLE";
      Effects.emitGroundTelegraph(boss.x, boss.y, 76, 0xff6bb5, 12);
      schedule(12, () => radialBurst(boss.x, boss.y, 12, 5.0, 0xff8fab, 9, performance.now() * 0.002));
      schedule(24, () => radialBurst(boss.x, boss.y, 18, 6.1, 0xff6bb5, 10, performance.now() * 0.003));
    }

    function teleportBlast() {
      const player = GameState.player;
      const preX = player.spr.x;
      const preY = player.spr.y;
      boss.currentAction = "TELEPORT";
      Effects.emitGroundTelegraph(preX, preY, 72, 0xff6bb5, 14);
      schedule(14, () => {
        const angle = Math.atan2(player.spr.y - boss.y, player.spr.x - boss.x) + Math.PI / 2;
        boss.x = Helpers.clamp(player.spr.x + Math.cos(angle) * 150, 42, GameState.app.renderer.width - 42);
        boss.y = Helpers.clamp(player.spr.y + Math.sin(angle) * 96, 54, GameState.app.renderer.height * 0.62);
        boss.spr.x = boss.x;
        boss.spr.y = boss.y;
        Effects.emitPulse(boss.x, boss.y, 0xff6bb5, 62, 10);
        radialBurst(boss.x, boss.y, 16, 6.2, 0xff6bb5, 10, performance.now() * 0.0025);
      });
    }

    function refreshCoreStyle() {
      boss.core.alpha = boss.currentAction === "TELEPORT" ? 0.82 : 1;
      boss.core.scale.set(1 + Math.sin(performance.now() * 0.012) * 0.03);
      setBossFrameValue(boss.core, boss.hp);
      redrawHpBar(boss.hpBar, boss.hp / boss.maxHp, boss.phase === 1 ? 0x9a7dff : 0xff8fab);
    }

    boss.updateBoss = (dt) => {
      updatePending(dt);
      if (boss.hp <= boss.maxHp * 0.5) boss.phase = 2;
      if (boss.phase === 2 && !boss.phaseShiftPlayed) {
        boss.phaseShiftPlayed = true;
        Effects.emitPulse(boss.x, boss.y, 0xff6bb5, 90, 18);
        Effects.emitParticle(boss.x, boss.y, 0xff8fab, 20, 1.5);
        boss.aiCd = Math.min(boss.aiCd, 10);
      }

      if (boss.phase === 1) {
        boss.orbitT += dt * 0.014;
        const targetX = GameState.app.renderer.width * 0.5 + Math.cos(boss.orbitT) * 110;
        const targetY = 112 + Math.sin(boss.orbitT * 2) * 24;
        boss.x = Helpers.lerp(boss.x, targetX, 0.06 * dt);
        boss.y = Helpers.lerp(boss.y, targetY, 0.06 * dt);
      } else {
        const player = GameState.player;
        boss.orbitT += dt * 0.02;
        const desired = Math.atan2(player.spr.y - boss.y, player.spr.x - boss.x) + Math.PI / 2;
        const targetX = player.spr.x + Math.cos(desired) * 165;
        const targetY = Helpers.clamp(player.spr.y + Math.sin(desired) * 104, 80, GameState.app.renderer.height * 0.62);
        boss.x = Helpers.lerp(boss.x, targetX, 0.07 * dt);
        boss.y = Helpers.lerp(boss.y, targetY, 0.07 * dt);
      }
      boss.spr.x = boss.x;
      boss.spr.y = boss.y;

      boss.aiCd -= dt;
      if (boss.aiCd <= 0) {
        if (boss.phase === 1) {
          const actions = [rotatingBurst, trackingZone, () => safeLaneBurst(false)];
          actions[boss.attackIndex % actions.length]();
          boss.aiCd = boss.attackIndex % 3 === 0 ? 34 : 30;
        } else {
          const actions = [doubleRing, () => safeLaneBurst(true), teleportBlast];
          actions[boss.attackIndex % actions.length]();
          boss.aiCd = boss.attackIndex % 3 === 0 ? 30 : 26;
        }
        boss.attackIndex += 1;
      }

      refreshCoreStyle();
    };

    boss.onDefeat = () => {
      Effects.emitPulse(boss.x, boss.y, 0xffffff, 150, 24);
      Effects.emitParticle(boss.x, boss.y, 0x9a7dff, 22, 1.5);
      Effects.emitParticle(boss.x, boss.y, 0xff8fab, 24, 1.8);
    };

    return boss;
  }

  function createSplitBoss() {
    const def = getDefinition("split");
    const boss = createBaseBoss(def, { contactDamage: 16, collisionPush: 8.2 });
    boss.phase = 1;
    boss.core = buildBossFrame({ radius: def.radius, code: def.code, bodyColor: 0xffd166, glowColor: 0xffb347 });
    boss.hpBar = attachHpBar(boss.spr, 200);
    boss.aiCd = 26;
    boss.phaseT = 0;
    boss.children = [];
    boss.spr.addChild(boss.core);

    function makeChild(role, offsetX, offsetY) {
      const isBlue = role === "blue";
      const child = {
        role,
        x: boss.x + offsetX,
        y: boss.y + offsetY,
        targetX: boss.x + offsetX,
        targetY: boss.y + offsetY,
        r: 22,
        hp: def.maxHp * 0.25,
        maxHp: def.maxHp * 0.25,
        dashCd: isBlue ? 0 : 58,
        fireCd: isBlue ? 32 : 0,
        pulse: Math.random() * Math.PI * 2,
        dashTelegraphShown: false,
        frame: buildBossFrame({
          radius: 22,
          code: isBlue ? "B" : "R",
          bodyColor: isBlue ? 0x7df9ff : 0xff8fab,
          glowColor: isBlue ? 0x54d6ff : 0xff5f90
        }),
        hpBar: null,
        glowColor: isBlue ? 0x54d6ff : 0xff5f90
      };
      child.hpBar = attachMiniHpBar(child.frame, 34, -31);
      boss.spr.addChild(child.frame);
      return child;
    }

    function enterSplitPhase() {
      if (boss.phase === 2) return;
      boss.phase = 2;
      boss.core.visible = false;
      boss.children = [
        makeChild("blue", -120, 18),
        makeChild("red", 120, -14)
      ];
      Effects.emitPulse(boss.x, boss.y, 0xffd166, 90, 16);
      Effects.emitParticle(boss.x, boss.y, 0xff8fab, 16, 1.3);
      Effects.emitParticle(boss.x, boss.y, 0x7df9ff, 16, 1.3);
      boss.hp = boss.children.reduce((sum, child) => sum + child.hp, 0);
    }

    function removeDeadChildren() {
      boss.children = boss.children.filter((child) => {
        if (child.hp > 0) return true;
        if (child.frame && child.frame.parent) child.frame.parent.removeChild(child.frame);
        return false;
      });
    }

    boss.getHitCircles = () => {
      if (boss.phase === 1) return [{ x: boss.x, y: boss.y, radius: boss.r }];
      return boss.children.map((child) => ({ x: child.x, y: child.y, radius: child.r, child }));
    };

    boss.takeDamage = (damage, ctx = {}) => {
      if (boss.phase === 1) {
        boss.hp = Math.max(0, boss.hp - damage);
        if (boss.hp <= boss.maxHp * 0.5) enterSplitPhase();
        return true;
      }
      const target = ctx.hitCircle && ctx.hitCircle.child
        ? ctx.hitCircle.child
        : boss.children[0];
      if (!target) return false;
      target.hp = Math.max(0, target.hp - damage);
      removeDeadChildren();
      boss.hp = boss.children.reduce((sum, child) => sum + child.hp, 0);
      return true;
    };

    boss.updateBoss = (dt) => {
      const player = GameState.player;
      boss.phaseT += dt * 0.015;
      if (boss.phase === 1) {
        boss.x = Helpers.lerp(boss.x, GameState.app.renderer.width * 0.5 + Math.cos(boss.phaseT) * 90, 0.045 * dt);
        boss.y = Helpers.lerp(boss.y, 110 + Math.sin(boss.phaseT * 2) * 24, 0.045 * dt);
        boss.spr.x = boss.x;
        boss.spr.y = boss.y;
        boss.aiCd -= dt;
        if (boss.aiCd <= 10 && boss.aiCd + dt > 10) {
          if ((((performance.now() / 220) | 0) % 2) === 0) {
            Effects.emitGroundTelegraph(boss.x, boss.y, 80, 0xffd166, 10);
          } else {
            const aim = Math.atan2(player.spr.y - boss.y, player.spr.x - boss.x);
            Effects.emitLineTelegraph(boss.x, boss.y, boss.x + Math.cos(aim) * 220, boss.y + Math.sin(aim) * 220, 0xff8fab, 10, 6);
          }
        }
        if (boss.aiCd <= 0) {
          if ((((performance.now() / 220) | 0) % 2) === 0) {
            for (let i = 0; i < 12; i++) {
              const angle = (Math.PI * 2 * i) / 12 + boss.phaseT * 0.8;
              GameState.enemyBullets.push(makeBossBullet(boss.x, boss.y, angle, {
                color: 0xffd166,
                speed: 5.4,
                damage: 8,
                radius: 7
              }));
            }
            boss.aiCd = 54;
          } else {
            const aim = Math.atan2(player.spr.y - boss.y, player.spr.x - boss.x);
            for (let i = -1; i <= 1; i++) {
              GameState.enemyBullets.push(makeBossBullet(boss.x, boss.y, aim + i * 0.18, {
                color: 0xff8fab,
                speed: 6.4,
                damage: 9,
                radius: 8
              }));
            }
            boss.aiCd = 32;
          }
        }
      } else {
        for (const child of boss.children) {
          child.pulse += dt * 0.018;
          if (child.role === "blue") {
            child.targetX = GameState.app.renderer.width * 0.36 + Math.cos(child.pulse) * 70;
            child.targetY = 148 + Math.sin(child.pulse * 2) * 30;
            child.x = Helpers.lerp(child.x, child.targetX, 0.06 * dt);
            child.y = Helpers.lerp(child.y, child.targetY, 0.06 * dt);
            child.fireCd -= dt;
            if (child.fireCd <= 10 && child.fireCd + dt > 10) {
              Effects.emitGroundTelegraph(child.x, child.y, boss.children.length === 1 ? 68 : 52, 0x7df9ff, 10);
            }
            if (child.fireCd <= 0) {
              const count = boss.children.length === 1 ? 14 : 9;
              const speed = boss.children.length === 1 ? 6.4 : 5.5;
              for (let i = 0; i < count; i++) {
                const angle = child.pulse + (Math.PI * 2 * i) / count;
                GameState.enemyBullets.push(makeBossBullet(child.x, child.y, angle, {
                  color: 0x7df9ff,
                  speed,
                  damage: 8,
                  radius: 7
                }));
              }
              child.fireCd = boss.children.length === 1 ? 34 : 52;
            }
          } else {
            child.dashCd -= dt;
            if (!child.dashTelegraphShown && child.dashCd <= 12) {
              const angle = Math.atan2(player.spr.y - child.y, player.spr.x - child.x);
              Effects.emitLineTelegraph(child.x, child.y, child.x + Math.cos(angle) * 180, child.y + Math.sin(angle) * 180, 0xff5f90, 12, 6);
              child.dashTelegraphShown = true;
            }
            if (child.dashCd <= 0) {
              const angle = Math.atan2(player.spr.y - child.y, player.spr.x - child.x);
              child.x += Math.cos(angle) * (boss.children.length === 1 ? 105 : 82);
              child.y += Math.sin(angle) * (boss.children.length === 1 ? 105 : 82);
              Effects.emitPulse(child.x, child.y, 0xff5f90, 44, 10);
              child.dashCd = boss.children.length === 1 ? 34 : 48;
              child.dashTelegraphShown = false;
            } else {
              const desired = Math.atan2(player.spr.y - child.y, player.spr.x - child.x) + Math.sin(child.pulse) * 0.6;
              child.targetX = player.spr.x + Math.cos(desired) * 160;
              child.targetY = Math.max(80, Math.min(GameState.app.renderer.height * 0.65, player.spr.y + Math.sin(desired) * 90));
              child.x = Helpers.lerp(child.x, child.targetX, 0.055 * dt);
              child.y = Helpers.lerp(child.y, child.targetY, 0.055 * dt);
            }
          }
          child.frame.x = child.x - boss.x;
          child.frame.y = child.y - boss.y;
          redrawMiniHpBar(child.hpBar, child.hp / child.maxHp, child.role === "blue" ? 0x7df9ff : 0xff8fab);
          setBossFrameValue(child.frame, child.hp);
        }
        if (boss.children.length > 0) {
          boss.x = boss.children.reduce((sum, child) => sum + child.x, 0) / boss.children.length;
          boss.y = boss.children.reduce((sum, child) => sum + child.y, 0) / boss.children.length;
          boss.spr.x = boss.x;
          boss.spr.y = boss.y;
        }
      }
      redrawHpBar(boss.hpBar, boss.hp / boss.maxHp, boss.phase === 1 ? 0xffd166 : 0xff8fab);
      if (boss.core.visible) setBossFrameValue(boss.core, boss.hp);
    };

    boss.onDefeat = () => {
      for (const child of boss.children) {
        Effects.emitParticle(child.x, child.y, child.glowColor, 16, 1.2);
      }
      Effects.emitPulse(boss.x, boss.y, 0xffffff, 120, 20);
      Effects.emitParticle(boss.x, boss.y, 0xffd166, 26, 1.8);
    };

    return boss;
  }

  function createSummonerBoss() {
    const def = getDefinition("summoner");
    const boss = createBaseBoss(def, { contactDamage: 13, collisionPush: 6.2 });
    boss.phase = 1;
    boss.core = buildBossFrame({ radius: def.radius, code: def.code, bodyColor: 0x8a91ff, glowColor: 0x6e78ff });
    boss.hpBar = attachHpBar(boss.spr, 190);
    boss.spr.addChild(boss.core);
    boss.orbitT = Math.random() * Math.PI * 2;
    boss.aiCd = 24;
    boss.minions = [];

    function createMinion(role, angle) {
      const isShooter = role === "shooter";
      const minion = {
        role,
        x: boss.x + Math.cos(angle) * 52,
        y: boss.y + Math.sin(angle) * 32,
        orbit: angle,
        distX: isShooter ? 76 : 58,
        distY: isShooter ? 42 : 30,
        r: isShooter ? 15 : 17,
        hp: isShooter ? 18 : 24,
        maxHp: isShooter ? 18 : 24,
        fireCd: isShooter ? 28 : 0,
        dashCd: isShooter ? 0 : 46,
        dashTelegraphShown: false,
        frame: buildBossFrame({
          radius: isShooter ? 15 : 17,
          code: isShooter ? "S" : "C",
          bodyColor: isShooter ? 0xd8dcff : 0xff8be4,
          glowColor: isShooter ? 0xa2a8ff : 0xd85cf0
        }),
        hpBar: null,
        glowColor: isShooter ? 0xa2a8ff : 0xd85cf0
      };
      minion.hpBar = attachMiniHpBar(minion.frame, 28, -24);
      boss.spr.addChild(minion.frame);
      return minion;
    }

    function pruneMinions() {
      boss.minions = boss.minions.filter((minion) => {
        if (minion.hp > 0) return true;
        if (minion.frame && minion.frame.parent) minion.frame.parent.removeChild(minion.frame);
        return false;
      });
    }

    function spawnWave() {
      const limit = boss.phase === 1 ? 2 : 3;
      if (boss.minions.length >= limit) return false;
      const missing = limit - boss.minions.length;
      const roles = boss.phase === 1 ? ["shooter", "chaser"] : ["shooter", "chaser", "shooter"];
      for (let i = 0; i < missing; i++) {
        const role = roles[(boss.minions.length + i) % roles.length];
        const angle = boss.orbitT + (Math.PI * 2 * (i + 1)) / (missing + 1);
        boss.minions.push(createMinion(role, angle));
      }
      Effects.emitPulse(boss.x, boss.y, boss.phase === 1 ? 0xa2a8ff : 0xff6bd6, 64, 12);
      Effects.emitParticle(boss.x, boss.y, boss.phase === 1 ? 0xa2a8ff : 0xff6bd6, 16, 1.1);
      return true;
    }

    boss.getHitCircles = () => {
      const circles = [{ x: boss.x, y: boss.y, radius: boss.r, bossCore: true }];
      for (const minion of boss.minions) {
        circles.push({ x: minion.x, y: minion.y, radius: minion.r, minion });
      }
      return circles;
    };

    boss.takeDamage = (damage, ctx = {}) => {
      if (ctx.hitCircle && ctx.hitCircle.minion) {
        ctx.hitCircle.minion.hp = Math.max(0, ctx.hitCircle.minion.hp - damage);
        pruneMinions();
        if (boss.phase === 1 && boss.hp <= boss.maxHp * 0.5) boss.phase = 2;
        return true;
      }
      if (boss.minions.length > 0) {
        return false;
      }
      boss.hp = Math.max(0, boss.hp - damage);
      if (boss.hp <= boss.maxHp * 0.5) boss.phase = 2;
      return true;
    };

    boss.onDefeat = () => {
      for (const minion of boss.minions) {
        Effects.emitParticle(minion.x, minion.y, minion.glowColor, 12, 1.0);
      }
      Effects.emitPulse(boss.x, boss.y, 0xffffff, 120, 20);
      Effects.emitParticle(boss.x, boss.y, 0xa2a8ff, 30, 1.7);
      Effects.emitParticle(boss.x, boss.y, 0xff6bd6, 18, 1.3);
    };

    boss.updateBoss = (dt) => {
      const player = GameState.player;
      boss.orbitT += dt * (boss.phase === 1 ? 0.011 : 0.016);
      const targetX = GameState.app.renderer.width * 0.5 + Math.cos(boss.orbitT) * (boss.phase === 1 ? 84 : 132);
      const targetY = 110 + Math.sin(boss.orbitT * 2) * (boss.phase === 1 ? 20 : 30);
      boss.x = Helpers.lerp(boss.x, targetX, 0.05 * dt);
      boss.y = Helpers.lerp(boss.y, targetY, 0.05 * dt);
      boss.spr.x = boss.x;
      boss.spr.y = boss.y;

      boss.aiCd -= dt;
      if (boss.aiCd <= 14 && boss.aiCd + dt > 14) {
        if (boss.minions.length < (boss.phase === 1 ? 2 : 3)) {
          Effects.emitGroundTelegraph(boss.x, boss.y, boss.phase === 1 ? 56 : 68, boss.phase === 1 ? 0xa2a8ff : 0xff6bd6, 14);
        } else {
          const aim = Math.atan2(player.spr.y - boss.y, player.spr.x - boss.x);
          Effects.emitLineTelegraph(boss.x, boss.y, boss.x + Math.cos(aim) * 220, boss.y + Math.sin(aim) * 220, boss.phase === 1 ? 0xa2a8ff : 0xff6bd6, 14, 6);
        }
      }
      if (boss.aiCd <= 0) {
        const didSummon = spawnWave();
        if (!didSummon) {
          const aim = Math.atan2(player.spr.y - boss.y, player.spr.x - boss.x);
          const shotCount = boss.phase === 1 ? 3 : 5;
          for (let i = 0; i < shotCount; i++) {
            const offset = (i - (shotCount - 1) / 2) * 0.14;
            GameState.enemyBullets.push(makeBossBullet(boss.x, boss.y, aim + offset, {
              color: boss.phase === 1 ? 0xa2a8ff : 0xff6bd6,
              speed: boss.phase === 1 ? 5.8 : 6.4,
              damage: boss.phase === 1 ? 8 : 9,
              radius: 8
            }));
          }
        }
        boss.aiCd = didSummon ? (boss.phase === 1 ? 72 : 58) : (boss.phase === 1 ? 34 : 28);
      }

      for (const minion of boss.minions) {
        minion.orbit += dt * (minion.role === "shooter" ? 0.02 : 0.028);
        const orbitX = Math.cos(minion.orbit) * minion.distX;
        const orbitY = Math.sin(minion.orbit * 1.3) * minion.distY;
        if (minion.role === "shooter") {
          minion.x = boss.x + orbitX;
          minion.y = boss.y + orbitY;
          minion.fireCd -= dt;
          if (minion.fireCd <= 10 && minion.fireCd + dt > 10) {
            const aim = Math.atan2(player.spr.y - minion.y, player.spr.x - minion.x);
            Effects.emitLineTelegraph(minion.x, minion.y, minion.x + Math.cos(aim) * 160, minion.y + Math.sin(aim) * 160, 0xd8dcff, 10, 4);
          }
          if (minion.fireCd <= 0) {
            const aim = Math.atan2(player.spr.y - minion.y, player.spr.x - minion.x);
            GameState.enemyBullets.push(makeBossBullet(minion.x, minion.y, aim, {
              color: 0xd8dcff,
              speed: boss.phase === 1 ? 6.1 : 6.8,
              damage: boss.phase === 1 ? 6 : 7,
              radius: 6
            }));
            minion.fireCd = boss.phase === 1 ? 32 : 24;
          }
        } else {
          minion.dashCd -= dt;
          if (!minion.dashTelegraphShown && minion.dashCd <= 12) {
            const angle = Math.atan2(player.spr.y - minion.y, player.spr.x - minion.x);
            Effects.emitLineTelegraph(minion.x, minion.y, minion.x + Math.cos(angle) * 140, minion.y + Math.sin(angle) * 140, 0xd85cf0, 12, 5);
            minion.dashTelegraphShown = true;
          }
          if (minion.dashCd <= 0) {
            const angle = Math.atan2(player.spr.y - minion.y, player.spr.x - minion.x);
            minion.x += Math.cos(angle) * (boss.phase === 1 ? 46 : 70);
            minion.y += Math.sin(angle) * (boss.phase === 1 ? 46 : 70);
            Effects.emitPulse(minion.x, minion.y, 0xd85cf0, 28, 8);
            minion.dashCd = boss.phase === 1 ? 38 : 28;
            minion.dashTelegraphShown = false;
          } else {
            minion.x = boss.x + orbitX * 0.8 + Math.cos(minion.orbit * 2.2) * 24;
            minion.y = boss.y + orbitY * 0.8 + Math.sin(minion.orbit * 1.7) * 18;
          }
        }
        minion.frame.x = minion.x - boss.x;
        minion.frame.y = minion.y - boss.y;
        minion.frame.alpha = minion.hp / minion.maxHp;
        redrawMiniHpBar(minion.hpBar, minion.hp / minion.maxHp, minion.role === "shooter" ? 0xd8dcff : 0xff8be4);
        setBossFrameValue(minion.frame, minion.hp);
      }

      boss.core.alpha = boss.minions.length > 0 ? 0.58 : 1;
      boss.core.scale.set(1 + Math.sin(performance.now() * 0.01) * 0.03);
      redrawHpBar(boss.hpBar, boss.hp / boss.maxHp, boss.phase === 1 ? 0x8a91ff : 0xff8be4);
      setBossFrameValue(boss.core, boss.hp);
    };

    return boss;
  }

  function createKnightBoss() {
    const def = getDefinition("knight");
    const boss = createBaseBoss(def, { contactDamage: 18, collisionPush: 8.8 });
    boss.phase = 1;
    boss.core = buildBossFrame({ radius: def.radius, code: def.code, bodyColor: 0x7a5cff, glowColor: 0x9a7dff });
    boss.blade = new PIXI.Graphics();
    boss.hpBar = attachHpBar(boss.spr, 190);
    boss.spr.addChild(boss.core, boss.blade);
    boss.state = "APPROACH";
    boss.stateTime = 0;
    boss.stateDuration = 34;
    boss.lockAngle = 0;
    boss.attackPattern = "FORWARD_SLASH";
    boss.attackSide = 1;
    boss.afterSlash = 0;
    boss.attackFxPlayed = false;
    boss.dashTelegraphShown = false;

    function setState(next, duration) {
      boss.state = next;
      boss.stateTime = 0;
      boss.stateDuration = duration;
      boss.attackFxPlayed = false;
      if (next !== "CHARGE") boss.dashTelegraphShown = false;
    }

    function chooseAttackPattern(distanceToPlayer) {
      if (distanceToPlayer > (boss.phase === 1 ? 165 : 185)) return "FORWARD_SLASH";
      boss.attackSide *= -1;
      return boss.attackSide > 0 ? "LEFT_STEP_SLASH" : "RIGHT_STEP_SLASH";
    }

    function getSlashAngles() {
      if (boss.attackPattern === "LEFT_STEP_SLASH") {
        return {
          start: boss.lockAngle - Math.PI * 1.05,
          end: boss.lockAngle - Math.PI * 0.12
        };
      }
      if (boss.attackPattern === "RIGHT_STEP_SLASH") {
        return {
          start: boss.lockAngle + Math.PI * 0.12,
          end: boss.lockAngle + Math.PI * 1.05
        };
      }
      return {
        start: boss.lockAngle - Math.PI * 0.75,
        end: boss.lockAngle + Math.PI * 0.15
      };
    }

    function drawBlade() {
      boss.blade.clear();
      if (!(boss.state === "CHARGE" || boss.state === "ATTACK")) return;
      const facing = boss.lockAngle || 0;
      let bladeLen = boss.state === "CHARGE" ? 28 + Math.sin(boss.stateTime * 0.4) * 6 : 48;
      if (boss.phase === 2) bladeLen += 6;
      let bladeAngle = boss.state === "CHARGE"
        ? facing + 0.55
        : facing - 0.2 + Math.sin(boss.stateTime * 0.5) * 0.28;
      if (boss.attackPattern === "LEFT_STEP_SLASH") {
        bladeAngle = boss.state === "CHARGE" ? facing - 0.9 : facing - 0.95 + Math.sin(boss.stateTime * 0.55) * 0.16;
      } else if (boss.attackPattern === "RIGHT_STEP_SLASH") {
        bladeAngle = boss.state === "CHARGE" ? facing + 0.9 : facing + 0.95 - Math.sin(boss.stateTime * 0.55) * 0.16;
      }
      const bladeX1 = Math.cos(bladeAngle) * 10;
      const bladeY1 = Math.sin(bladeAngle) * 10;
      const bladeX2 = bladeX1 + Math.cos(bladeAngle) * bladeLen;
      const bladeY2 = bladeY1 + Math.sin(bladeAngle) * bladeLen;
      const glowColor = boss.phase === 1 ? 0x7df9ff : 0xff8be4;
      boss.blade.lineStyle(10, glowColor, 0.22);
      boss.blade.moveTo(bladeX1, bladeY1);
      boss.blade.lineTo(bladeX2, bladeY2);
      boss.blade.lineStyle(6, glowColor, 0.92);
      boss.blade.moveTo(bladeX1, bladeY1);
      boss.blade.lineTo(bladeX2, bladeY2);
      boss.blade.lineStyle(2, 0xffffff, 0.96);
      boss.blade.moveTo(bladeX1, bladeY1);
      boss.blade.lineTo(bladeX2, bladeY2);
      boss.blade.beginFill(0xffffff, 0.95);
      boss.blade.drawCircle(bladeX2, bladeY2, 3);
      boss.blade.endFill();
    }

    boss.updateBoss = (dt) => {
      const player = GameState.player;
      boss.stateTime += dt;
      if (boss.hp <= boss.maxHp * 0.5) boss.phase = 2;

      const angleToPlayer = Math.atan2(player.spr.y - boss.y, player.spr.x - boss.x);
      const distToPlayer = Math.hypot(player.spr.x - boss.x, player.spr.y - boss.y) || 1;
      const moveSpeed = boss.phase === 1 ? 3.2 : 4.1;

      if (boss.state === "APPROACH") {
        const targetDist = boss.phase === 1 ? 170 : 145;
        if (distToPlayer > targetDist) {
          boss.x += Math.cos(angleToPlayer) * moveSpeed * dt;
          boss.y += Math.sin(angleToPlayer) * moveSpeed * dt;
        } else {
          boss.x -= Math.cos(angleToPlayer) * moveSpeed * 0.22 * dt;
          boss.y -= Math.sin(angleToPlayer) * moveSpeed * 0.22 * dt;
        }
        if (boss.stateTime >= boss.stateDuration || distToPlayer < targetDist + 20) {
          setState("STRAFE", boss.phase === 1 ? 24 : 18);
        }
      } else if (boss.state === "STRAFE") {
        const side = Math.sin(performance.now() * 0.004) > 0 ? 1 : -1;
        boss.x += Math.cos(angleToPlayer + Math.PI / 2 * side) * moveSpeed * 0.85 * dt;
        boss.y += Math.sin(angleToPlayer + Math.PI / 2 * side) * moveSpeed * 0.85 * dt;
        if (boss.stateTime >= boss.stateDuration) {
          boss.lockAngle = angleToPlayer;
          boss.attackPattern = chooseAttackPattern(distToPlayer);
          setState("CHARGE", boss.phase === 1 ? 14 : 10);
        }
      } else if (boss.state === "CHARGE") {
        boss.lockAngle = angleToPlayer;
        if (!boss.dashTelegraphShown) {
          Effects.emitLineTelegraph(boss.x, boss.y, boss.x + Math.cos(boss.lockAngle) * 240, boss.y + Math.sin(boss.lockAngle) * 240, boss.phase === 1 ? 0x7df9ff : 0xff8be4, boss.phase === 1 ? 14 : 10, 7);
          boss.dashTelegraphShown = true;
        }
        if (boss.stateTime >= boss.stateDuration) {
          setState("ATTACK", boss.phase === 1 ? 10 : 8);
        }
      } else if (boss.state === "ATTACK") {
        boss.x += Math.cos(boss.lockAngle) * (boss.phase === 1 ? 16 : 20) * dt;
        boss.y += Math.sin(boss.lockAngle) * (boss.phase === 1 ? 16 : 20) * dt;
        if (!boss.attackFxPlayed) {
          boss.attackFxPlayed = true;
          const arcRadius = boss.phase === 1 ? 60 : 68;
          const accent = boss.phase === 1 ? 0x7df9ff : 0xff8be4;
          const slash = getSlashAngles();
          const arcX = boss.x + Math.cos(boss.lockAngle) * 32;
          const arcY = boss.y + Math.sin(boss.lockAngle) * 32;
          Effects.emitSlashArc(arcX, arcY, slash.start, slash.end, 0xffffff, 9, arcRadius, 8);
          Effects.emitSlashArc(
            arcX - Math.cos(boss.lockAngle) * 8,
            arcY - Math.sin(boss.lockAngle) * 8,
            slash.start + 0.06,
            slash.end - 0.06,
            accent,
            8,
            arcRadius - 6,
            5
          );
        }
        if (boss.afterSlash <= 0) {
          boss.afterSlash = boss.phase === 1 ? 4 : 3;
          const spread = boss.phase === 1 ? 1 : 3;
          for (let i = -spread; i <= spread; i++) {
            GameState.enemyBullets.push(makeBossBullet(boss.x, boss.y, boss.lockAngle + i * 0.12, {
              color: boss.phase === 1 ? 0x7df9ff : 0xff8be4,
              speed: boss.phase === 1 ? 5.6 : 6.4,
              damage: boss.phase === 1 ? 8 : 10,
              radius: 7
            }));
          }
          Effects.emitPulse(boss.x, boss.y, boss.phase === 1 ? 0x7df9ff : 0xff8be4, boss.phase === 1 ? 34 : 42, 8);
        } else {
          boss.afterSlash -= dt;
        }
        if (boss.stateTime >= boss.stateDuration) {
          boss.afterSlash = 0;
          setState("RECOVERY", boss.phase === 1 ? 16 : 12);
        }
      } else if (boss.state === "RECOVERY") {
        boss.x -= Math.cos(angleToPlayer) * moveSpeed * 0.55 * dt;
        boss.y -= Math.sin(angleToPlayer) * moveSpeed * 0.55 * dt;
        if (boss.stateTime >= boss.stateDuration) {
          setState("APPROACH", boss.phase === 1 ? 28 : 20);
        }
      }

      boss.x = Helpers.clamp(boss.x, 28, GameState.app.renderer.width - 28);
      boss.y = Helpers.clamp(boss.y, 44, GameState.app.renderer.height - 40);
      boss.spr.x = boss.x;
      boss.spr.y = boss.y;

      let bodyColor = boss.phase === 1 ? 0x7a5cff : 0xff8be4;
      let glowColor = boss.phase === 1 ? 0x9a7dff : 0xff6bd6;
      if (boss.state === "CHARGE") {
        bodyColor = 0xffffff;
        glowColor = boss.phase === 1 ? 0x7df9ff : 0xff9be8;
      } else if (boss.state === "ATTACK") {
        bodyColor = boss.phase === 1 ? 0x7df9ff : 0xff8be4;
        glowColor = bodyColor;
      }
      boss.core.codeText.text = def.code;
      boss.core.children[1].tint = 0xffffff;
      redrawHpBar(boss.hpBar, boss.hp / boss.maxHp, glowColor);
      setBossFrameValue(boss.core, boss.hp);
      boss.core.scale.set(1 + Math.sin(performance.now() * 0.02) * 0.02);
      boss.core.alpha = boss.state === "RECOVERY" ? 0.82 : 1;
      drawBlade();
    };

    boss.onDefeat = () => {
      Effects.emitPulse(boss.x, boss.y, 0xffffff, 140, 22);
      Effects.emitParticle(boss.x, boss.y, 0x9a7dff, 28, 1.8);
      Effects.emitParticle(boss.x, boss.y, 0xff8be4, 24, 1.5);
    };

    return boss;
  }

  const factories = {
    basic: createBasicBoss,
    advanced: createAdvancedBoss,
    knight: createKnightBoss,
    split: createSplitBoss,
    summoner: createSummonerBoss
  };

  function spawnBoss(id, options = {}) {
    const factory = factories[id];
    if (!factory) return null;
    if (options.replaceExisting !== false) clearCurrentArena();
    const boss = factory();
    GameState.enemies.push(boss);
    GameState.progression.waveAlive = 1;
    GameState.progression.spawnedCount = 1;
    UI.triggerBossWarning();
    UI.hudUpdate();
    return boss;
  }

  function spawnSelectedPracticeBoss() {
    if (!GameState.stats.practice) return null;
    return spawnBoss(getPracticeBossId(), { replaceExisting: true });
  }

  function spawnWaveBoss(wave = GameState.progression.wave) {
    return spawnBoss(getWaveBossId(wave), { replaceExisting: false });
  }

  return {
    getActiveBoss,
    getDefinitions,
    getDefinition,
    getPracticeBossId,
    setPracticeBossId,
    hasActiveBoss,
    isBossWave,
    getWaveBossId,
    shouldSuppressPracticeSpawns,
    shouldSuppressEnemySpawns,
    spawnBoss,
    spawnSelectedPracticeBoss,
    spawnWaveBoss
  };
})();
