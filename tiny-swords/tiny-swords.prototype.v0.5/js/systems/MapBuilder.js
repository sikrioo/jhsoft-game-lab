import { GAME } from '../config/constants.js';

export function buildMap(scene) {
  const g = scene.add.graphics().setDepth(0);
  g.fillStyle(0x050508);
  g.fillRect(0, 0, GAME.mapW, GAME.mapH);

  for (let y = 0; y < GAME.mapH; y += GAME.tile) {
    for (let x = 0; x < GAME.mapW; x += GAME.tile) {
      const dark = ((x / GAME.tile + y / GAME.tile) % 2 === 0);
      g.fillStyle(dark ? 0x07070a : 0x0b090d, 0.95);
      g.fillRect(x + 1, y + 1, GAME.tile - 2, GAME.tile - 2);
    }
  }

  for (let i = 0; i < 30; i++) {
    const fx = Phaser.Math.Between(100, GAME.mapW - 100);
    const fy = Phaser.Math.Between(100, GAME.mapH - 100);
    g.fillStyle(0x2a1e0c);
    g.fillRect(fx - 4, fy - 16, 8, 18);
    g.fillStyle(0xc9641c, 0.08);
    g.fillCircle(fx, fy - 18, 30);
    g.fillStyle(0xe8a030, 0.15);
    g.fillCircle(fx, fy - 18, 16);
    g.fillStyle(0xffd060, 0.4);
    g.fillCircle(fx, fy - 18, 6);
  }

  g.lineStyle(4, 0x1f1820, 1);
  g.strokeRect(2, 2, GAME.mapW - 4, GAME.mapH - 4);
  g.lineStyle(2, 0x120e16, 0.5);
  g.strokeRect(8, 8, GAME.mapW - 16, GAME.mapH - 16);
}
