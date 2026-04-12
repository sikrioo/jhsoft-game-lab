export const QUEUE_SIZE = 15;

export const DEFAULT_PLAYER = Object.freeze({
  hp: 500,
  maxHp: 500,
  mp: 200,
  maxMp: 200,
  effects: {},
});

export const DEFAULT_STARTER = ['atk', 'fireball', 'heal', 'icebolt', 'guard', 'heavy', 'regen', 'shock', 'atk', 'fireball'];

export const SKILLS = [
  { id: 'atk', name: '일반 공격', icon: '⚔️', el: 'physical', type: '공격', target: 'enemy', mp: 0, cd: 0, desc: '기본 물리 피해', dmg: [18, 28], effect: null },
  { id: 'heavy', name: '강타', icon: '🔨', el: 'physical', type: '공격', target: 'enemy', mp: 8, cd: 2, desc: '강력한 단일 타격. 30% 기절', dmg: [40, 60], effect: { stun: 2, chance: 0.3 } },
  { id: 'slash', name: '연속 베기', icon: '🌀', el: 'physical', type: '공격', target: 'enemy', mp: 12, cd: 3, desc: '2회 연속 공격', dmg: [15, 22], hits: 2, effect: null },
  { id: 'pierce', name: '관통', icon: '🏹', el: 'physical', type: '공격', target: 'enemy', mp: 10, cd: 2, desc: '방어 무시 공격', dmg: [30, 45], pen: true, effect: null },
  { id: 'fireball', name: '화염구', icon: '🔥', el: 'fire', type: '마법', target: 'enemy', mp: 18, cd: 1, desc: '화염 마법 피해 + 화상', dmg: [35, 55], effect: { burn: 3 } },
  { id: 'meteor', name: '메테오', icon: '☄️', el: 'fire', type: '마법', target: 'enemy', mp: 35, cd: 5, desc: '대형 화염 폭발', dmg: [80, 120], effect: { burn: 2 } },
  { id: 'flameburst', name: '폭염', icon: '💥', el: 'fire', type: '마법', target: 'enemy', mp: 22, cd: 3, desc: '화염 범위 피해', dmg: [45, 65], effect: { burn: 2 } },
  { id: 'icebolt', name: '얼음 화살', icon: '❄️', el: 'ice', type: '마법', target: 'enemy', mp: 14, cd: 1, desc: '냉기 피해 + 둔화', dmg: [25, 40], effect: { slow: 2 } },
  { id: 'blizzard', name: '눈보라', icon: '🌨️', el: 'ice', type: '마법', target: 'enemy', mp: 30, cd: 4, desc: '강력한 냉기 + 빙결', dmg: [55, 75], effect: { freeze: 2 } },
  { id: 'shock', name: '감전', icon: '⚡', el: 'lightning', type: '마법', target: 'enemy', mp: 16, cd: 2, desc: '번개 + 마비', dmg: [30, 50], effect: { paralyze: 1 } },
  { id: 'chain', name: '연쇄 번개', icon: '🌩️', el: 'lightning', type: '마법', target: 'enemy', mp: 28, cd: 4, desc: '3번 튀는 번개', dmg: [20, 35], hits: 3, effect: null },
  { id: 'drain', name: '생명 흡수', icon: '🩸', el: 'dark', type: '마법', target: 'enemy', mp: 20, cd: 3, desc: '피해의 50% 흡수', dmg: [25, 40], drain: 0.5, effect: null },
  { id: 'curse', name: '저주', icon: '💀', el: 'dark', type: '디버프', target: 'enemy', mp: 15, cd: 4, desc: '방어/공격 약화, 3턴', dmg: [0, 0], effect: { curse: 3 } },
  { id: 'poison', name: '맹독', icon: '☠️', el: 'dark', type: '디버프', target: 'enemy', mp: 18, cd: 3, desc: '매 턴 독 피해 3턴', dmg: [8, 12], dot: 3, effect: { poison: 3 } },
  { id: 'charge', name: '돌진', icon: '💨', el: 'physical', type: '공격', target: 'enemy', mp: 10, cd: 2, desc: '돌진 공격 + 밀쳐내기', dmg: [28, 42], effect: { knockback: 1 } },
  { id: 'blink', name: '순간이동', icon: '✨', el: 'dark', type: '이동', target: 'self', mp: 20, cd: 3, desc: '다음 피해 회피', dmg: [0, 0], effect: { dodge: 1 } },
  { id: 'entangle', name: '속박', icon: '🌿', el: 'nature', type: '디버프', target: 'enemy', mp: 14, cd: 3, desc: '적 2턴 행동 불능', dmg: [5, 10], effect: { root: 2 } },
  { id: 'nature_strike', name: '자연의 일격', icon: '🍃', el: 'nature', type: '공격', target: 'enemy', mp: 12, cd: 2, desc: '자연 피해 + 독', dmg: [22, 35], effect: { poison: 2 } },
  { id: 'smite', name: '신성 강타', icon: '✝️', el: 'holy', type: '공격', target: 'enemy', mp: 16, cd: 2, desc: '신성 피해 (언데드 2배)', dmg: [30, 48], holy: true, effect: null },
  { id: 'barrier', name: '신성 보호막', icon: '🛡️', el: 'holy', type: '방어', target: 'self', mp: 18, cd: 4, desc: '다음 공격 완전 차단', dmg: [0, 0], effect: { shield: 2 } },
  { id: 'heal', name: '회복', icon: '💚', el: 'buff', type: '회복', target: 'self', mp: 20, cd: 3, desc: 'HP 60~80 회복', heal: [60, 80], effect: null },
  { id: 'regen', name: '재생', icon: '💛', el: 'buff', type: '회복', target: 'self', mp: 15, cd: 4, desc: '3턴 지속 HP 재생', hotick: 15, effect: { regen: 3 } },
  { id: 'power', name: '파워 업', icon: '💪', el: 'buff', type: '버프', target: 'self', mp: 18, cd: 4, desc: '공격력 증가, 2턴', dmg: [0, 0], effect: { powerup: 2 } },
  { id: 'focus', name: '집중', icon: '🧿', el: 'buff', type: '버프', target: 'self', mp: 12, cd: 3, desc: 'MP 30 즉시 회복', mpgain: 30, effect: null },
  { id: 'stun_atk', name: '스턴 강타', icon: '💫', el: 'physical', type: '공격', target: 'enemy', mp: 14, cd: 3, desc: '100% 스턴 1턴', dmg: [22, 35], effect: { stun: 1 } },
  { id: 'guard', name: '가드', icon: '🔰', el: 'buff', type: '방어', target: 'self', mp: 0, cd: 2, desc: '이번 턴 피해 70% 감소', dmg: [0, 0], effect: { guard: 1 } },
  { id: 'berserk', name: '광폭화', icon: '😡', el: 'physical', type: '버프', target: 'self', mp: 10, cd: 5, desc: '공격 2배 대신 HP 소모', dmg: [0, 0], effect: { berserk: 2 } },
];

export const WAVES = [
  { name: '좀비', icon: '🧟', hp: 250, atk: [15, 25], el: 'physical', reward: 100, special: null },
  { name: '스켈레톤', icon: '💀', hp: 320, atk: [20, 32], el: 'physical', reward: 150, special: 'poison' },
  { name: '데몬', icon: '👹', hp: 450, atk: [28, 42], el: 'fire', reward: 200, special: 'fire' },
  { name: '드래곤', icon: '🐉', hp: 600, atk: [35, 55], el: 'fire', reward: 300, special: 'fire_breath' },
  { name: '리치 킹', icon: '💀', hp: 800, atk: [40, 65], el: 'dark', reward: 500, special: 'drain' },
];
