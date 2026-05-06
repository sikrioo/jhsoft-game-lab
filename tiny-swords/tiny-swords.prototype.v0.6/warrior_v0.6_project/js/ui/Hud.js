import { GAME, BOT_NAMES } from '../config/constants.js';
import { getRecord } from '../core/game.js';

export class Hud {
  constructor(scene) {
    this.scene = scene;
    this.miniCtx = document.getElementById('minimap-canvas').getContext('2d');
  }

  update(playerController, bots) {
    const hpPct = Math.max(0, playerController.hp / GAME.maxHp) * 100;
    const hpBar = document.getElementById('hp-bar');
    hpBar.style.width = `${hpPct}%`;
    document.getElementById('hp-text').textContent = `${Math.ceil(playerController.hp)} / ${GAME.maxHp}`;
    hpBar.style.background = hpPct > 60
      ? 'linear-gradient(90deg, #8b1a1a, #c93030)'
      : hpPct > 30
        ? 'linear-gradient(90deg, #8b4a1a, #c97030)'
        : 'linear-gradient(90deg, #6b1a1a, #ff2020)';

    const guardPct = Math.max(0, playerController.guard / GAME.maxGuard) * 100;
    const guardBar = document.getElementById('guard-bar');
    guardBar.style.width = `${guardPct}%`;
    guardBar.style.background = playerController.isGuardBroken
      ? 'linear-gradient(90deg, #3a2a1a, #6a4a2a)'
      : 'linear-gradient(90deg, #1a4a6a, #3a8ab0)';

    const { kills, deaths } = getRecord();
    document.getElementById('kills-val').textContent = kills;
    document.getElementById('deaths-val').textContent = deaths;
    document.getElementById('bots-val').textContent = bots.filter((b) => b.alive).length;
    this.drawMinimap(playerController.sprite, bots);
  }

  setState(text) {
    document.getElementById('state-value').textContent = text;
  }

  setGuardVisible(visible) {
    document.getElementById('guard-icon').style.opacity = visible ? '1' : '0';
  }

  addKillFeed(msg, color = '#c9a84c') {
    const feed = document.getElementById('kill-feed');
    const el = document.createElement('div');
    el.className = 'kill-entry';
    el.textContent = msg;
    el.style.color = color;
    feed.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  showDmgFloat(text, wx, wy, color, fontSize = '18px') {
    const cam = this.scene.cameras.main;
    const sx = (wx - cam.worldView.x) * cam.zoom + window.innerWidth / 2 - (cam.worldView.width / 2) * cam.zoom;
    const sy = (wy - cam.worldView.y) * cam.zoom + window.innerHeight / 2 - (cam.worldView.height / 2) * cam.zoom;
    const rect = document.getElementById('game-container').getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'dmg-float';
    el.textContent = text;
    el.style.cssText = `left:${sx + rect.left}px;top:${sy + rect.top}px;color:${color};font-size:${fontSize};text-shadow:0 0 10px ${color};`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  drawMinimap(player, bots) {
    if (!this.miniCtx || !player) return;
    const mW = 120;
    const mH = 120;
    const scaleX = mW / GAME.mapW;
    const scaleY = mH / GAME.mapH;
    this.miniCtx.clearRect(0, 0, mW, mH);
    this.miniCtx.fillStyle = '#07060a';
    this.miniCtx.fillRect(0, 0, mW, mH);
    bots.forEach((bot, i) => {
      if (!bot.alive) return;
      this.miniCtx.fillStyle = ['#ff6666', '#6699ff', '#88ff66'][i];
      this.miniCtx.fillRect(bot.spr.x * scaleX - 2, bot.spr.y * scaleY - 2, 4, 4);
    });
    this.miniCtx.fillStyle = '#c9a84c';
    this.miniCtx.beginPath();
    this.miniCtx.arc(player.x * scaleX, player.y * scaleY, 3.5, 0, Math.PI * 2);
    this.miniCtx.fill();
    this.miniCtx.strokeStyle = '#2a2018';
    this.miniCtx.strokeRect(0, 0, mW, mH);
  }
}
