window.UI = (() => {
  const $score = document.getElementById("score");
  const $wave = document.getElementById("wave");
  const $level = document.getElementById("level");
  const $xp = document.getElementById("xp");
  const $hp = document.getElementById("hp");
  const $atk = document.getElementById("atk");
  const $def = document.getElementById("def");
  const $fireRate = document.getElementById("fireRate");
  const $pierce = document.getElementById("pierce");
  const $combo = document.getElementById("combo");

  const overlayRoot = document.getElementById("overlayRoot");
  const startCard = document.getElementById("startCard");
  const upgradeCard = document.getElementById("upgradeCard");
  const gameOverCard = document.getElementById("gameOverCard");
  const upgradeGrid = document.getElementById("upgradeGrid");
  const finalScoreEl = document.getElementById("finalScore");
  const warningOverlay = document.getElementById("warningOverlay");

  function hudUpdate() {
    const S = GameState;
    const P = S.progression;
    $score.textContent = String(Math.floor(P.score));
    $wave.textContent = String(P.wave);
    $level.textContent = String(P.level);
    $xp.textContent = `${Math.floor(P.xp)} / ${Math.floor(P.xpToNext)}`;
    $hp.textContent = String(Math.max(0, Math.floor(S.stats.hp)));
    $atk.textContent = String(S.stats.bulletDamage);
    $def.textContent = String(S.stats.defense);
    $fireRate.textContent = String(S.stats.fireRate);
    $pierce.textContent = String(S.stats.bulletPierce);
    $combo.textContent = "x" + P.combo.toFixed(1).replace(/\.0$/,"");
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
  }

  return {
    hudUpdate,
    showCard,
    showGameOver,
    triggerBossWarning,
    renderUpgradeChoices,
    bindButtons
  };
})();
