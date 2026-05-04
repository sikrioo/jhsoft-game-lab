import { BattleScene } from '../scenes/BattleScene.js';

let game = null;
let kills = 0;
let deaths = 0;

export function getRecord() {
  return { kills, deaths };
}

export function addKill() {
  kills += 1;
}

export function addDeath() {
  deaths += 1;
}

export function resetRecord() {
  kills = 0;
  deaths = 0;
}

export function startGame(characterType = 'warrior') {
  window.WARRIOR_IO_SELECTED_CHARACTER = characterType;
  document.getElementById('title-screen').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  initPhaserGame();
}

export function restartGame() {
  document.getElementById('gameover-screen').style.display = 'none';
  resetRecord();
  if (game) {
    game.destroy(true);
    game = null;
  }
  initPhaserGame();
}

function initPhaserGame() {
  const cfg = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#050508',
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
    scene: [BattleScene],
    pixelArt: true,
    antialias: false,
    roundPixels: true,
  };
  game = new Phaser.Game(cfg);
}

window.addEventListener('resize', () => {
  if (game?.scale) game.scale.resize(window.innerWidth, window.innerHeight);
});
