window.UI = (() => {
  const $score = document.getElementById("score");
  const $wave = document.getElementById("wave");
  const $level = document.getElementById("level");
  const $xp = document.getElementById("xp");
  const $hp = document.getElementById("hp");
  const $mp = document.getElementById("mp");
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

  function hudUpdate() {
    const S = GameState;
    const P = S.progression;
    const weaponDef = WEAPON_DEFINITIONS[S.weaponState.current];
    const weaponLevel = S.weaponState.levels[S.weaponState.current] || 1;
    $score.textContent = String(Math.floor(P.score));
    $wave.textContent = String(P.wave);
    $level.textContent = String(P.level);
    $xp.textContent = `${Math.floor(P.xp)} / ${Math.floor(P.xpToNext)}`;
    $hp.textContent = String(Math.max(0, Math.floor(S.stats.hp)));
    $mp.textContent = `${Math.floor(S.stats.mp)} / ${Math.floor(S.stats.mpMax)}`;
    $shield.textContent = S.stats.shieldMax > 0
      ? `${Math.max(0, Math.floor(S.stats.shield))} / ${Math.floor(S.stats.shieldMax)}`
      : "-";
    $atk.textContent = String(S.stats.bulletDamage);
    $def.textContent = String(S.stats.defense);
    $fireRate.textContent = weaponDef ? String(weaponDef.fireInterval) : String(S.stats.fireRate);
    $shots.textContent = S.weaponState.current === "machinegun"
      ? String(Math.min(5, Math.max(weaponLevel, S.stats.bulletCount)))
      : S.weaponState.current === "shotgun"
        ? String(6 + Math.min(4, weaponLevel))
        : "1";
    $pierce.textContent = String(S.stats.bulletPierce);
    $combo.textContent = "x" + P.combo.toFixed(1).replace(/\.0$/,"");
    $weaponName.textContent = weaponDef ? weaponDef.name : "-";
    $weaponLevel.textContent = weaponDef && weaponLevel >= weaponDef.maxLevel ? "Lv.MAX" : `Lv.${weaponLevel}`;
    for (const radio of weaponRadioEls) radio.checked = radio.value === S.weaponState.current;
    weaponHud.style.display = S.stats.practice ? "block" : "none";
    renderActiveSlots();
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
      const el = document.createElement("div");
      el.className = "upgrade";
      el.innerHTML = `<h3>${choice.name}</h3><p>${choice.desc}</p>`;
      el.onclick = () => onPick(choice);
      upgradeGrid.appendChild(el);
    }
  }

  function bindButtons({ onStart, onPractice, onRetry, onBack }) {
    document.getElementById("btnStart").onclick = onStart;
    document.getElementById("btnPractice").onclick = onPractice;
    document.getElementById("btnRetry").onclick = onRetry;
    document.getElementById("btnBack").onclick = onBack;
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
    flashActiveSlot
  };
})();
