window.ActiveSkillSystem = (() => {
  function getDefinition(skillId){
    return ACTIVE_SKILL_DEFINITIONS.find(skill => skill.id === skillId) || null;
  }

  function getSlotByKey(code){
    return GameState.activeSkillState.slots.find(slot => slot.key === code) || null;
  }

  function getSlotSkill(slot){
    return slot && slot.skillId ? getDefinition(slot.skillId) : null;
  }

  function getOwnedSkills(){
    return GameState.activeSkillState.ownedSkillIds
      .map(getDefinition)
      .filter(Boolean);
  }

  function getAssignedSkillIds(excludeKey=null){
    return GameState.activeSkillState.slots
      .filter(slot => slot.key !== excludeKey && slot.skillId)
      .map(slot => slot.skillId);
  }

  function autoAssignSkill(skillId){
    const slots = GameState.activeSkillState.slots;
    if (slots.some(slot => slot.skillId === skillId)) return true;
    const empty = slots.find(slot => !slot.skillId);
    if (!empty) return false;
    empty.skillId = skillId;
    empty.cooldown = 0;
    empty.autoCast = false;
    return true;
  }

  function unlockSkill(skillId, options={}){
    const skill = getDefinition(skillId);
    if (!skill) return false;
    const owned = GameState.activeSkillState.ownedSkillIds;
    if (!owned.includes(skillId)) owned.push(skillId);
    if (options.autoAssign !== false) autoAssignSkill(skillId);
    UI.hudUpdate();
    return true;
  }

  function clearSlot(slotKey){
    const slot = getSlotByKey(slotKey);
    if (!slot) return false;
    slot.skillId = null;
    slot.cooldown = 0;
    slot.autoCast = false;
    UI.hudUpdate();
    return true;
  }

  function assignSkillToSlot(slotKey, skillId){
    const slot = getSlotByKey(slotKey);
    const skill = getDefinition(skillId);
    if (!slot || !skill) return false;
    if (!GameState.activeSkillState.ownedSkillIds.includes(skillId)) return false;

    const fromSlot = GameState.activeSkillState.slots.find(item => item.skillId === skillId);
    if (fromSlot && fromSlot !== slot) {
      fromSlot.skillId = null;
      fromSlot.cooldown = 0;
      fromSlot.autoCast = false;
    }

    slot.skillId = skillId;
    slot.cooldown = 0;
    slot.autoCast = false;
    UI.hudUpdate();
    return true;
  }

  function getAssignableSkills(slotKey){
    const blocked = new Set(getAssignedSkillIds(slotKey));
    return getOwnedSkills().filter(skill => !blocked.has(skill.id));
  }

  function assignStartingLoadout(testMode=false){
    const slots = GameState.activeSkillState.slots;
    for (let i=0; i<slots.length; i++){
      slots[i].skillId = null;
      slots[i].cooldown = 0;
      slots[i].autoCast = false;
    }
    GameState.activeSkillState.ownedSkillIds = [];

    const loadout = testMode ? ((GAME_BALANCE.TEST && GAME_BALANCE.TEST.STARTING_ACTIVE_SKILLS) || []) : [];
    for (const skillId of loadout) unlockSkill(skillId, { autoAssign: true });

    const startingLevels = testMode ? ((GAME_BALANCE.TEST && GAME_BALANCE.TEST.STARTING_ACTIVE_SKILL_LEVELS) || {}) : {};
    GameState.activeSkillState.levels.boost = Math.max(1, startingLevels.boost || 1);
  }

  function canUseSlot(slot){
    if (!slot) return { ok:false, reason:"invalid" };
    const skill = getSlotSkill(slot);
    if (!skill) return { ok:false, reason:"empty" };
    if (slot.cooldown > 0) return { ok:false, reason:"cooldown", skill };
    if (GameState.stats.mp < skill.mpCost) return { ok:false, reason:"mp", skill };
    if (GameState.progression.waveState !== "running") return { ok:false, reason:"paused", skill };
    return { ok:true, skill };
  }

  function tryUseSlotByKey(code){
    return tryUseSlot(getSlotByKey(code));
  }

  function tryUseBoostDirection(direction){
    const boostSlot = GameState.activeSkillState.slots.find(slot => slot.skillId === "boost");
    if (!boostSlot) return false;
    return tryUseSlot(boostSlot, { boostDirection: direction });
  }

  function tryUseSlot(slot, context={}){
    const check = canUseSlot(slot);
    if (!check.ok){
      if (slot && check.reason === "mp") UI.flashActiveSlot(slot.key, "mp");
      return false;
    }

    const { skill } = check;
    let casted = false;
    if (skill.id === "decoy_drone") casted = castDecoyDrone(skill);
    if (skill.id === "boost") casted = castBoost(skill, context);
    if (skill.id === "afterburner") casted = castAfterburner(skill);
    if (skill.id === "nova_pulse") casted = castNovaPulse(skill);
    if (skill.id === "stealth_field") casted = castStealthField(skill);
    if (!casted) return false;

    GameState.stats.mp = Math.max(0, GameState.stats.mp - skill.mpCost);
    slot.cooldown = skill.cooldown;
    UI.flashActiveSlot(slot.key, "cast");
    return true;
  }

  function castDecoyDrone(skill){
    const S = GameState;
    const angle = Math.atan2(S.mouse.y - S.player.spr.y, S.mouse.x - S.player.spr.x);
    const spawnX = S.player.spr.x + Math.cos(angle) * 40;
    const spawnY = S.player.spr.y + Math.sin(angle) * 40;

    const c = new PIXI.Container();
    const body = new PIXI.Graphics();
    body.beginFill(0x10162a, 1);
    body.lineStyle(2, 0xffd27a, 0.95);
    body.drawPolygon([ 0,-11, 9,8, 0,4, -9,8 ]);
    body.endFill();

    const core = new PIXI.Graphics();
    core.beginFill(0xffd27a, 0.9);
    core.drawCircle(0, 1, 3);
    core.endFill();

    c.addChild(body, core);
    c.x = spawnX;
    c.y = spawnY;
    c.rotation = angle + Math.PI / 2;
    S.uiLayer.addChild(c);

    S.decoys.push({
      spr: c,
      x: spawnX,
      y: spawnY,
      r: 12,
      hp: skill.effectData.hp,
      life: skill.duration,
      angle
    });

    Effects.emitParticle(spawnX, spawnY, 0xffd27a, 16, 1.1);
    Effects.emitPulse(spawnX, spawnY, 0xffd27a, 48, 14);
    return true;
  }

  function castBoost(skill, context={}){
    const S = GameState;
    const p = S.player;
    const facing = Math.atan2(S.mouse.y - p.spr.y, S.mouse.x - p.spr.x);
    const level = Math.max(1, S.activeSkillState.levels.boost || 1);
    const boostSpec = getBoostSpec(skill, facing, level, context.boostDirection || null);

    p.vx += Math.cos(boostSpec.angle) * boostSpec.profile.speed;
    p.vy += Math.sin(boostSpec.angle) * boostSpec.profile.speed;
    S.activeSkillState.boostDir = boostSpec.angle;
    S.activeSkillState.boostDrag = boostSpec.profile.drag;
    S.activeSkillState.boostMitigationT = Math.max(S.activeSkillState.boostMitigationT, skill.duration + 3);
    S.activeSkillState.boostMitigationMul = boostSpec.profile.mitigationMul;
    S.activeSkillState.boostT = Math.max(S.activeSkillState.boostT, skill.duration);

    const backX = p.spr.x - Math.cos(boostSpec.angle) * 18;
    const backY = p.spr.y - Math.sin(boostSpec.angle) * 18;
    Effects.emitParticle(backX, backY, 0x8be9ff, 7, 0.75);
    return true;
  }

  function getBoostSpec(skill, facing, level, explicitDirection=null){
    let angle = facing;
    let profile = skill.effectData.forward;

    if (explicitDirection === "forward"){
      angle = facing;
      profile = skill.effectData.forward;
    } else if (explicitDirection === "back" && level >= 3){
      angle = facing + Math.PI;
      profile = skill.effectData.back;
    } else if (explicitDirection === "left" && level >= 2){
      angle = facing - Math.PI / 2;
      profile = skill.effectData.side;
    } else if (explicitDirection === "right" && level >= 2){
      angle = facing + Math.PI / 2;
      profile = skill.effectData.side;
    }

    return { angle, profile };
  }

  function castAfterburner(skill){
    const S = GameState;
    S.activeSkillState.afterburnerT = Math.max(S.activeSkillState.afterburnerT, skill.duration);
    Effects.emitParticle(S.player.spr.x, S.player.spr.y, 0xff7a47, 20, 1.5);
    Effects.emitPulse(S.player.spr.x, S.player.spr.y, 0xff7a47, 92, 18);
    return true;
  }

  function castNovaPulse(skill){
    const S = GameState;
    const px = S.player.spr.x;
    const py = S.player.spr.y;
    const radius = skill.effectData.radius || 140;
    const bulletClearRadius = skill.effectData.bulletClearRadius || radius + 30;
    const damage = skill.effectData.damage || 6;
    const bossDamage = skill.effectData.bossDamage || Math.max(1, damage - 2);
    const knockback = skill.effectData.knockback || 22;
    const radiusSq = radius * radius;
    const bulletRadiusSq = bulletClearRadius * bulletClearRadius;

    Effects.emitPulse(px, py, 0x7df9ff, radius, 14);
    Effects.emitPulse(px, py, 0xffffff, Math.max(54, radius * 0.62), 9);
    Effects.emitParticle(px, py, 0x7df9ff, 22, 1.35);
    Effects.emitParticle(px, py, 0xff9ae8, 12, 1.0);
    S.shake = Math.min(24, S.shake + 4);

    for (const enemy of [...S.enemies]){
      const hitCircles = enemy && typeof enemy.getHitCircles === "function"
        ? enemy.getHitCircles()
        : [{ x: enemy.x, y: enemy.y, radius: enemy.r }];
      const hitCircle = hitCircles.find((circle) => {
        const rr = radius + circle.radius;
        return Helpers.dist2(px, py, circle.x, circle.y) <= rr * rr;
      });
      if (!hitCircle) continue;

      const dist = Math.max(1, Math.hypot(hitCircle.x - px, hitCircle.y - py));
      const dx = (hitCircle.x - px) / dist;
      const dy = (hitCircle.y - py) / dist;

      if (enemy.x != null) enemy.x += dx * knockback;
      if (enemy.y != null) enemy.y += dy * knockback;
      if (enemy.spr) {
        enemy.spr.x = enemy.x;
        enemy.spr.y = enemy.y;
      }
      if (enemy.hpText) enemy.hpText.rotation = -enemy.spr.rotation;

      const appliedDamage = enemy.tier === "boss" ? bossDamage : damage;
      CombatSystem.damageEnemy(enemy, appliedDamage, 0x7df9ff, enemy.tier === "boss" ? 16 : 10, 1.0, hitCircle);
    }

    for (let i = S.enemyBullets.length - 1; i >= 0; i--){
      const bullet = S.enemyBullets[i];
      if (Helpers.dist2(px, py, bullet.x, bullet.y) > bulletRadiusSq) continue;
      Effects.emitParticle(bullet.x, bullet.y, 0x7df9ff, 6, 0.7);
      Effects.emitPulse(bullet.x, bullet.y, 0xc18dff, 18, 6);
      S.fx.removeChild(bullet.spr);
      S.enemyBullets.splice(i, 1);
    }

    UI.hudUpdate();
    return true;
  }

  function castStealthField(skill){
    const S = GameState;
    S.activeSkillState.stealthT = Math.max(S.activeSkillState.stealthT, skill.duration);
    S.activeSkillState.stealthAlpha = skill.effectData.alpha || 0.42;
    S.activeSkillState.stealthLastKnownX = S.player.spr.x;
    S.activeSkillState.stealthLastKnownY = S.player.spr.y;
    Effects.emitParticle(S.player.spr.x, S.player.spr.y, 0x6cf5ff, 8, 0.55);
    Effects.emitParticle(S.player.spr.x, S.player.spr.y, 0xc595ff, 4, 0.45);
    UI.hudUpdate();
    return true;
  }

  function breakStealth(reason="attack"){
    const S = GameState;
    if (S.activeSkillState.stealthT <= 0) return false;
    S.activeSkillState.stealthT = 0;
    S.activeSkillState.stealthAlpha = 1;
    Effects.emitParticle(S.player.spr.x, S.player.spr.y, reason === "attack" ? 0xff8a66 : 0x6cf5ff, 5, 0.42);
    UI.hudUpdate();
    return true;
  }

  function updateDecoys(dt){
    const S = GameState;
    for (let i=S.decoys.length-1; i>=0; i--){
      const d = S.decoys[i];
      d.life -= dt;
      d.spr.rotation += 0.02 * dt;
      d.spr.alpha = 0.78 + Math.sin(performance.now() / 180 + i) * 0.18;
      if (d.life <= 0 || d.hp <= 0){
        Effects.emitParticle(d.x, d.y, 0xffd27a, 14, 1.0);
        S.uiLayer.removeChild(d.spr);
        S.decoys.splice(i, 1);
      }
    }
  }

  function update(dt){
    const S = GameState;
    for (const slot of S.activeSkillState.slots){
      if (slot.cooldown > 0) slot.cooldown = Math.max(0, slot.cooldown - dt);
    }

    if (S.activeSkillState.boostT > 0){
      S.activeSkillState.boostT = Math.max(0, S.activeSkillState.boostT - dt);
      if ((performance.now() | 0) % 3 === 0){
        const ang = S.activeSkillState.boostDir || (S.player.spr.rotation - Math.PI / 2);
        const p = Effects.makeTrailSprite(
          S.player.spr.x - Math.cos(ang) * 16 + Helpers.rand(-2, 2),
          S.player.spr.y - Math.sin(ang) * 16 + Helpers.rand(-2, 2),
          0x8be9ff,
          Helpers.rand(0.12, 0.2),
          0.18
        );
        S.fx.addChild(p);
        S.particles.push({
          spr:p,
          x:p.x,
          y:p.y,
          vx:Helpers.rand(-0.3, 0.3) - Math.cos(ang) * 0.6,
          vy:Helpers.rand(-0.3, 0.3) - Math.sin(ang) * 0.6,
          life:10,
          drag:0.84
        });
      }
    }
    if (S.activeSkillState.boostMitigationT > 0){
      S.activeSkillState.boostMitigationT = Math.max(0, S.activeSkillState.boostMitigationT - dt);
    } else {
      S.activeSkillState.boostMitigationMul = 1;
    }

    if (S.activeSkillState.afterburnerT > 0){
      S.activeSkillState.afterburnerT = Math.max(0, S.activeSkillState.afterburnerT - dt);
      if ((performance.now() | 0) % 3 === 0){
        const p = Effects.makeTrailSprite(S.player.spr.x, S.player.spr.y + 14, 0xff7a47, Helpers.rand(0.25, 0.45), 0.28);
        S.fx.addChild(p);
        S.particles.push({ spr:p, x:p.x, y:p.y, vx:Helpers.rand(-0.6, 0.6), vy:Helpers.rand(0.8, 2.2), life:14, drag:0.88 });
      }
    }

    if (S.activeSkillState.stealthT > 0){
      S.activeSkillState.stealthT = Math.max(0, S.activeSkillState.stealthT - dt);
      if ((performance.now() | 0) % 4 === 0){
        const p = Effects.makeTrailSprite(
          S.player.spr.x + Helpers.rand(-6, 6),
          S.player.spr.y + Helpers.rand(-6, 6),
          Math.random() < 0.5 ? 0x6cf5ff : 0xc595ff,
          Helpers.rand(0.14, 0.24),
          0.18
        );
        S.fx.addChild(p);
        S.particles.push({ spr:p, x:p.x, y:p.y, vx:Helpers.rand(-0.35, 0.35), vy:Helpers.rand(-0.35, 0.35), life:12, drag:0.86 });
      }
      if (S.activeSkillState.stealthT <= 0) {
        breakStealth("expire");
      }
    }

    updateDecoys(dt);
  }

  return {
    getDefinition,
    getOwnedSkills,
    getSlotSkill,
    getAssignableSkills,
    assignStartingLoadout,
    unlockSkill,
    clearSlot,
    assignSkillToSlot,
    breakStealth,
    tryUseSlotByKey,
    tryUseBoostDirection,
    update
  };
})();
