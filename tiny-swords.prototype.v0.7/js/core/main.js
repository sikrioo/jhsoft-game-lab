import { startGame, restartGame } from './game.js';

const warriorBtn = document.getElementById('start-warrior-btn');
const archerBtn = document.getElementById('start-archer-btn');
const oldStartBtn = document.getElementById('start-btn');

if (warriorBtn) warriorBtn.addEventListener('click', () => startGame('warrior'));
if (archerBtn) archerBtn.addEventListener('click', () => startGame('archer'));
if (oldStartBtn) oldStartBtn.addEventListener('click', () => startGame('warrior'));

document.getElementById('restart-btn').addEventListener('click', restartGame);
