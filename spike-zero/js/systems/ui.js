window.UI = (() => {
  const $score = document.getElementById("score");
  const $stage = document.getElementById("stage");
  const $stageTime = document.getElementById("stageTime");
  const $wave = document.getElementById("wave");
  const $level = document.getElementById("level");
  const $xp = document.getElementById("xp");
  const $hp = document.getElementById("hp");
  const $mp = document.getElementById("mp");
  const $speed = document.getElementById("speed");
  const $shield = document.getElementById("shield");
  const $atk = document.getElementById("atk");
  const $def = document.getElementById("def");
  const $fireRate = document.getElementById("fireRate");
  const $shots = document.getElementById("shots");
  const $pierce = document.getElementById("pierce");
  const $combo = document.getElementById("combo");
  const $weaponName = document.getElementById("weaponName");
  const $weaponLevel = document.getElementById("weaponLevel");

  const overlayRoot = document.getElementById("overlayRoot");
  const startCard = document.getElementById("startCard");
  const upgradeCard = document.getElementById("upgradeCard");
  const gameOverCard = document.getElementById("gameOverCard");
  const upgradeGrid = document.getElementById("upgradeGrid");
  const finalScoreEl = document.getElementById("finalScore");
  const warningOverlay = document.getElementById("warningOverlay");
  const activeSlotEls = [...document.querySelectorAll(".activeSlot")];
  const weaponRadioEls = [...document.querySelectorAll("input[name='weaponType']")];
  const weaponHud = document.getElementById("weaponHud");
  const bossSelect = document.getElementById("bossSelect");
  const spawnBossBtn = document.getElementById("btnSpawnBoss");
  const bossHud = document.getElementById("bossHud");
  const bossHudName = document.getElementById("bossHudName");
  const bossHudMeta = document.getElementById("bossHudMeta");
  const bossHudFill = document.getElementById("bossHudFill");

  function getUpgradeTypeMeta(upgrade){
    const type = upgrade && upgrade.upgradeType ? upgrade.upgradeType : "passive";
    if (type === "weapon") return { label: "WEAPON", className: "weapon" };
    if (type === "active") return { label: "ACTIVE", className: "active" };
    return { label: "PASSIVE", className: "passive" };
  }

  function formatStageTime(frames = 0) {
    const totalSeconds = Math.max(0, Math.ceil(frames / 60));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function hudUpdate() {
    const S = GameState;
    const P = S.progression;
    const weaponDef = WEAPON_DEFINITIONS[S.weaponState.current];
    $score.textContent = String(Math.floor(P.score));
    $stage.textContent = String(P.stage || 1);
    $stageTime.textContent = S.stats.practice ? "TEST" : formatStageTime(P.stageTime);
    $wave.textContent = String(P.wave);
    $level.textContent = String(P.level);
    $xp.textContent = `${Math.floor(P.xp)} / ${Math.floor(P.xpToNext)}`;
    $hp.textContent = String(Math.max(0, Math.floor(S.stats.hp)));
    $mp.textContent = `${Math.floor(S.stats.mp)} / ${Math.floor(S.stats.mpMax)}`;
    $speed.textContent = (Math.round(S.stats.speed * 10) / 10).toFixed(1);
    $shield.textContent = S.stats.shieldMax > 0
      ? `${Math.max(0, Math.floor(S.stats.shield))} / ${Math.floor(S.stats.shieldMax)}`
      : "-";
    $atk.textContent = String(S.stats.bulletDamage);
    $def.textContent = String(S.stats.defense);
    $fireRate.textContent = String(Math.round(S.stats.fireRate));
    $shots.textContent = S.weaponState.current === "machinegun"
      ? String(Math.min(5, Math.max(1, S.stats.bulletCount)))
      : S.weaponState.current === "shotgun"
        ? String(4 + Math.min(6, S.stats.bulletCount * 2))
        : "1";
    $pierce.textContent = String(S.stats.bulletPierce);
    $combo.textContent = "x" + P.combo.toFixed(1).replace(/\.0$/,"");
    $weaponName.textContent = weaponDef ? weaponDef.name : "-";
    $weaponLevel.textContent = "Type Shift";
    for (const radio of weaponRadioEls) radio.checked = radio.value === S.weaponState.current;
    weaponHud.style.display = S.stats.practice ? "block" : "none";
    if (bossSelect && window.BossSystem) {
      bossSelect.value = BossSystem.getPracticeBossId();
    }
    if (spawnBossBtn) spawnBossBtn.disabled = !S.stats.practice;
    renderBossHud();
    renderActiveSlots();
  }

  function populateBossOptions() {
    if (!bossSelect || !window.BossSystem) return;
    const selected = BossSystem.getPracticeBossId();
    bossSelect.innerHTML = "";
    for (const boss of BossSystem.getDefinitions()) {
      const option = document.createElement("option");
      option.value = boss.id;
      option.textContent = boss.name;
      if (boss.id === selected) option.selected = true;
      bossSelect.appendChild(option);
    }
  }

  function renderActiveSlots(){
    for (const el of activeSlotEls){
      const slot = GameState.activeSkillState.slots.find(item => item.key === el.dataset.key);
      const skill = slot ? ActiveSkillSystem.getSlotSkill(slot) : null;
      const nameEl = el.querySelector(".slotName");
      const typeEl = el.querySelector(".slotType");
      const costEl = el.querySelector(".slotCost");
      const cdEl = el.querySelector(".slotCd");

      if (!slot || !skill){
        nameEl.textContent = "Empty";
        typeEl.textContent = "-";
        costEl.textContent = "0 MP";
        cdEl.textContent = "READY";
        el.classList.remove("cooldown");
        el.classList.remove("noMp");
        continue;
      }

      nameEl.textContent = skill.name;
      typeEl.textContent = skill.type.toUpperCase();
      costEl.textContent = `${skill.mpCost} MP`;
      cdEl.textContent = slot.cooldown > 0 ? `${(slot.cooldown / 60).toFixed(1)}s` : "READY";
      el.classList.toggle("cooldown", slot.cooldown > 0);
      el.classList.toggle("noMp", GameState.stats.mp < skill.mpCost);
    }
  }

  function renderBossHud() {
    if (!bossHud || !window.BossSystem) return;
    const boss = BossSystem.getActiveBoss();
    if (!boss) {
      bossHud.classList.remove("visible");
      bossHudName.textContent = "-";
      bossHudMeta.textContent = "No Active Boss";
      bossHudFill.style.width = "0%";
      return;
    }
    const ratio = boss.maxHp > 0 ? Math.max(0, boss.hp / boss.maxHp) : 0;
    const phaseLabel = boss.phase ? `Phase ${boss.phase}` : "Boss";
    let extra = "";
    if (boss.bossId === "summoner" && boss.minions) {
      extra = boss.minions.length > 0 ? ` | Shielded by ${boss.minions.length}` : " | Core Exposed";
    } else if (boss.bossId === "split" && boss.children) {
      extra = ` | Cores ${boss.children.length}`;
    } else if (boss.bossId === "knight" && boss.state) {
      extra = ` | ${boss.state}`;
    } else if (boss.bossId === "advanced" && boss.currentAction) {
      extra = ` | ${boss.currentAction}`;
    }
    bossHud.classList.add("visible");
    bossHudName.textContent = boss.displayName || boss.name || boss.bossId || "Boss";
    bossHudMeta.textContent = `${phaseLabel} | HP ${Math.ceil(Math.max(0, boss.hp))} / ${Math.ceil(boss.maxHp)}${extra}`;
    bossHudFill.style.width = `${Math.max(0, Math.min(100, ratio * 100))}%`;
  }

  function flashActiveSlot(key, reason="cast"){
    const el = activeSlotEls.find(item => item.dataset.key === key);
    if (!el) return;
    const className = reason === "mp" ? "noMp" : "cast";
    el.classList.add(className);
    setTimeout(() => el.classList.remove(className), 160);
  }

  function showCard(which) {
    startCard.style.display = which === "start" ? "block" : "none";
    upgradeCard.style.display = which === "upgrade" ? "block" : "none";
    gameOverCard.style.display = which === "over" ? "block" : "none";
    overlayRoot.style.display = which ? "flex" : "none";
  }

  function showGameOver() {
    finalScoreEl.textContent = String(Math.floor(GameState.progression.score));
    showCard("over");
  }

  function triggerBossWarning() {
    warningOverlay.style.display = "flex";
    warningOverlay.animate(
      [
        { opacity: 0 },
        { opacity: 1, offset: 0.25 },
        { opacity: 1, offset: 0.75 },
        { opacity: 0 }
      ],
      { duration: 1400, easing: "ease-out" }
    );
    setTimeout(() => warningOverlay.style.display = "none", 1450);
  }

  function renderUpgradeChoices(choices, onPick) {
    upgradeGrid.innerHTML = "";
    for (const choice of choices) {
      const typeMeta = getUpgradeTypeMeta(choice);
      const el = document.createElement("div");
      el.className = `upgrade ${typeMeta.className}`;
      el.innerHTML = `<div class="upgradeType">${typeMeta.label}</div><h3>${choice.name}</h3><p>${choice.desc}</p>`;
      el.onclick = () => onPick(choice);
      upgradeGrid.appendChild(el);
    }
  }

  function bindButtons({ onStart, onPractice, onRetry, onBack, onBossChange, onSpawnBoss }) {
    document.getElementById("btnStart").onclick = onStart;
    document.getElementById("btnPractice").onclick = onPractice;
    document.getElementById("btnRetry").onclick = onRetry;
    document.getElementById("btnBack").onclick = onBack;
    if (bossSelect) bossSelect.onchange = () => onBossChange && onBossChange(bossSelect.value);
    if (spawnBossBtn) spawnBossBtn.onclick = () => onSpawnBoss && onSpawnBoss();
    for (const radio of weaponRadioEls){
      radio.onchange = () => {
        if (radio.checked) CombatSystem.setWeaponType(radio.value);
      };
    }
  }

  return {
    hudUpdate,
    showCard,
    showGameOver,
    triggerBossWarning,
    renderUpgradeChoices,
    bindButtons,
    flashActiveSlot,
    populateBossOptions
  };
})();
