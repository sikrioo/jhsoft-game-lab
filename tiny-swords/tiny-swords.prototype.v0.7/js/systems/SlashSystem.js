import { GAME } from '../config/constants.js';

export class SlashSystem {
  constructor(scene) {
    this.scene = scene;
    this.gfx = scene.add.graphics().setDepth(20);
  }

  clear() {
    this.gfx.clear();
  }

  draw(x, y, facing) {
    this.gfx.clear();
    const dir = facing > 0 ? 1 : -1;
    this.gfx.lineStyle(3, 0xffe080, 0.85);
    this.gfx.beginPath();
    this.gfx.moveTo(x + dir * 20, y - 20);
    this.gfx.lineTo(x + dir * GAME.atkRange * 0.8, y + 10);
    this.gfx.lineTo(x + dir * 30, y + 30);
    this.gfx.strokePath();
    this.gfx.fillStyle(0xffe080, 0.18);
    this.gfx.beginPath();
    this.gfx.moveTo(x + dir * 20, y - 20);
    this.gfx.lineTo(x + dir * GAME.atkRange * 0.8, y + 10);
    this.gfx.lineTo(x + dir * 30, y + 30);
    this.gfx.closePath();
    this.gfx.fillPath();
    this.scene.time.delayedCall(120, () => this.gfx.clear());
  }
}
