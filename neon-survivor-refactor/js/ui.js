window.UI = (() => {
  const $score = document.getElementById("score");
  const $wave = document.getElementById("wave");
  const $hp = document.getElementById("hp");
  const $combo = document.getElementById("combo");

  const overlayRoot = document.getElementById("overlayRoot");
  const startCard = document.getElementById("startCard");
  const upgradeCard = document.getElementById("upgradeCard");
  const gameOverCard = document.getElementById("gameOverCard");
  const finalScoreEl = document.getElementById("finalScore");
  const warningOverlay = document.getElementById("warningOverlay");

  function hudUpdate() {
    const S = GameState;
    $score.textContent = String(Math.floor(S.score));
    $wave.textContent = String(S.wave);
    $hp.textContent = String(Math.max(0, Math.floor(S.stats.hp)));
    $combo.textContent = "x" + S.combo.toFixed(1).replace(/\.0$/,"");
  }

  function showCard(which) {
    startCard.style.display = which === "start" ? "block" : "none";
    upgradeCard.style.display = which === "upgrade" ? "block" : "none";
    gameOverCard.style.display = which === "over" ? "block" : "none";
    overlayRoot.style.display = which ? "flex" : "none";
  }

  function showGameOver() {
    finalScoreEl.textContent = String(Math.floor(GameState.score));
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
    setTimeout(() => {
      warningOverlay.style.display = "none";
    }, 1450);
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
    bindButtons
  };
})();
