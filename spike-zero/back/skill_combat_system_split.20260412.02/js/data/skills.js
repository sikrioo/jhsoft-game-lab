const BASIC_SKILLS = [
  {
    id: 'atk',
    name: '기본 공격',
    icon: '⚔',
    rarity: 'common',
    slotRole: 'attack',
    school: 'physical',
    category: 'basic',
    target: 'enemy',
    cost: 6,
    atbCost: 22,
    mp: 0,
    cd: 0,
    desc: '무난한 기본 물리 공격.',
    dmg: [18, 28],
    tags: ['attack'],
    maxLevel: 3,
    unlock: { type: 'starter' },
  },
  {
    id: 'guard',
    name: '가드',
    icon: '🔰',
    rarity: 'common',
    slotRole: 'defense',
    school: 'support',
    category: 'basic',
    target: 'self',
    cost: 6,
    atbCost: 20,
    mp: 0,
    cd: 2,
    desc: '이번 행동 동안 받는 피해를 크게 줄입니다.',
    effect: { guard: 1 },
    tags: ['defense'],
    maxLevel: 3,
    unlock: { type: 'starter' },
  },
];

export const TREE_DEFINITIONS = Object.freeze([
  {
    id: 'impact',
    name: '강타 계열',
    slotRole: 'attack',
    school: 'physical',
    nodes: [
      { id: 'smash', name: '강타', icon: '🔨', rarity: 'common', cost: 8, atbCost: 28, mp: 4, cd: 1, dmg: [24, 36], effect: { stun: 1, chance: 0.2 }, desc: '강한 일격으로 스턴을 노립니다.', tags: ['attack', 'control'] },
      { id: 'concuss', name: '스턴', icon: '🪓', rarity: 'magic', cost: 10, atbCost: 32, mp: 8, cd: 2, dmg: [30, 44], effect: { stun: 1, chance: 0.35 }, bonusVsStunned: 0.22, desc: '기절 직전의 충격을 남깁니다.', tags: ['attack', 'control'] },
      { id: 'knockout', name: '기절', icon: '💥', rarity: 'rare', cost: 12, atbCost: 38, mp: 12, cd: 3, dmg: [38, 54], effect: { stun: 2, chance: 0.45 }, bonusVsStunned: 0.38, desc: '스턴 대상에게 특히 치명적입니다.', tags: ['attack', 'control'] },
    ],
    heroes: [
      { id: 'shockwave', name: '충격파', icon: '🌋', rarity: 'epic', cost: 16, atbCost: 46, mp: 20, cd: 4, dmg: [58, 82], effect: { stun: 1, chance: 0.5 }, bonusVsStunned: 0.65, desc: '기절한 적에게 폭발적인 추가 피해를 줍니다.', tags: ['attack', 'control'], heroOnly: true },
      { id: 'shatter', name: '파쇄', icon: '🪨', rarity: 'epic', cost: 15, atbCost: 42, mp: 18, cd: 3, dmg: [54, 76], pen: true, selfDamagePct: 0.05, desc: '방어를 파쇄하지만 반동 피해를 받습니다.', tags: ['attack'], heroOnly: true },
      { id: 'chain_impact', name: '연쇄 충격', icon: '⛓', rarity: 'epic', cost: 15, atbCost: 44, mp: 19, cd: 4, dmg: [50, 72], effect: { stun: 1, chance: 0.55 }, chainOnControl: 0.28, desc: '상태 이상이 걸린 적에게 연쇄 충격이 이어집니다.', tags: ['attack', 'control'], heroOnly: true },
    ],
  },
  {
    id: 'speed',
    name: '속도 계열',
    slotRole: 'attack',
    school: 'physical',
    nodes: [
      { id: 'swift_strike', name: '빠른 공격', icon: '💨', rarity: 'common', cost: 6, atbCost: 16, mp: 2, cd: 0, dmg: [14, 22], desc: '낮은 비용으로 자주 사용하는 공격.', tags: ['attack', 'fast'] },
      { id: 'double_slash', name: '연속 공격', icon: '⚔', rarity: 'magic', cost: 9, atbCost: 24, mp: 6, cd: 1, dmg: [16, 24], hits: 2, desc: '짧은 빈틈에 두 번 베어냅니다.', tags: ['attack', 'fast'] },
      { id: 'overrun', name: '폭주', icon: '🌀', rarity: 'rare', cost: 11, atbCost: 30, mp: 10, cd: 2, dmg: [18, 28], hits: 2, extraHitChance: 0.35, desc: '낮은 확률로 추가 타격이 이어집니다.', tags: ['attack', 'fast'] },
    ],
    heroes: [
      { id: 'flurry', name: '난무', icon: '🌪', rarity: 'epic', cost: 16, atbCost: 42, mp: 18, cd: 3, dmg: [14, 22], hits: 4, desc: '극단적인 다단히트지만 한 방의 위력은 낮습니다.', tags: ['attack', 'fast'], heroOnly: true },
      { id: 'lightspeed', name: '광속', icon: '✨', rarity: 'epic', cost: 13, atbCost: 26, mp: 16, cd: 4, dmg: [22, 34], effect: { haste: 2 }, desc: '피해는 낮지만 이후 ATB가 크게 빨라집니다.', tags: ['attack', 'buff', 'fast'], heroOnly: true },
      { id: 'overdrive', name: '과부하', icon: '🚨', rarity: 'epic', cost: 18, atbCost: 48, mp: 22, cd: 4, dmg: [68, 92], selfDamagePct: 0.08, desc: '폭발적인 화력이지만 비용과 반동이 큽니다.', tags: ['attack'], heroOnly: true },
    ],
  },
  {
    id: 'bleed',
    name: '출혈 계열',
    slotRole: 'attack',
    school: 'physical',
    nodes: [
      { id: 'slash', name: '베기', icon: '🗡', rarity: 'common', cost: 7, atbCost: 24, mp: 4, cd: 1, dmg: [20, 30], effect: { bleed: 2, chance: 0.45 }, desc: '출혈을 남기는 날카로운 베기.', tags: ['attack', 'bleed'] },
      { id: 'hemorrhage', name: '출혈', icon: '🩸', rarity: 'magic', cost: 10, atbCost: 30, mp: 8, cd: 2, dmg: [24, 36], effect: { bleed: 3, chance: 0.6 }, desc: '지속 피해를 강화합니다.', tags: ['attack', 'bleed'] },
      { id: 'rending', name: '과다출혈', icon: '🪚', rarity: 'rare', cost: 12, atbCost: 36, mp: 12, cd: 3, dmg: [28, 42], effect: { bleed: 4, chance: 0.7 }, bonusPerBleedStack: 0.18, desc: '중첩된 출혈을 크게 증폭시킵니다.', tags: ['attack', 'bleed'] },
    ],
    heroes: [
      { id: 'blood_burst', name: '출혈 폭발', icon: '💣', rarity: 'epic', cost: 17, atbCost: 46, mp: 20, cd: 4, dmg: [46, 64], consumeBleed: true, bonusPerBleedStack: 0.3, desc: '출혈을 소모해 큰 피해를 줍니다.', tags: ['attack', 'bleed'], heroOnly: true },
      { id: 'toxic_blood', name: '독혈 전환', icon: '☣', rarity: 'epic', cost: 16, atbCost: 44, mp: 18, cd: 4, dmg: [34, 52], effect: { bleed: 2, poison: 2, chance: 0.65 }, desc: '출혈을 독으로 전환해 장기전을 노립니다.', tags: ['attack', 'bleed', 'poison'], heroOnly: true },
      { id: 'sanguine_fang', name: '흡혈 변환', icon: '🧛', rarity: 'epic', cost: 15, atbCost: 40, mp: 17, cd: 3, dmg: [36, 54], effect: { bleed: 2, chance: 0.55 }, drain: 0.22, desc: '피해 일부를 생명력으로 전환합니다.', tags: ['attack', 'bleed', 'drain'], heroOnly: true },
    ],
  },
  {
    id: 'bulwark',
    name: '방어 계열',
    slotRole: 'defense',
    school: 'support',
    nodes: [
      { id: 'bulwark', name: '방어', icon: '🛡', rarity: 'common', cost: 7, atbCost: 20, mp: 4, cd: 2, effect: { guard: 1 }, desc: '짧게 피해를 줄입니다.', tags: ['defense'] },
      { id: 'reinforced_guard', name: '강화방어', icon: '🧱', rarity: 'magic', cost: 9, atbCost: 24, mp: 8, cd: 3, effect: { guard: 2, shield: 1 }, desc: '보호와 감소를 함께 얻습니다.', tags: ['defense'] },
      { id: 'iron_wall', name: '철벽', icon: '🏰', rarity: 'rare', cost: 12, atbCost: 30, mp: 12, cd: 4, effect: { guard: 2, shield: 2 }, desc: '높은 피해 감소 대신 공격 기회가 줄어듭니다.', tags: ['defense'], selfSlow: 1 },
    ],
    heroes: [
      { id: 'fortress', name: '요새', icon: '🏯', rarity: 'epic', cost: 16, atbCost: 38, mp: 18, cd: 5, effect: { guard: 3, shield: 2, slow: 1 }, desc: '극강의 방어와 함께 행동이 둔해집니다.', tags: ['defense'], heroOnly: true },
      { id: 'mirror_guard', name: '반사 방어', icon: '🪞', rarity: 'epic', cost: 15, atbCost: 36, mp: 18, cd: 4, effect: { guard: 2, reflect: 2 }, desc: '막아낸 피해를 적에게 되돌립니다.', tags: ['defense', 'reflect'], heroOnly: true },
      { id: 'unyielding', name: '불굴', icon: '🗿', rarity: 'epic', cost: 14, atbCost: 34, mp: 16, cd: 5, effect: { guard: 2, regen: 2 }, desc: '천천히 회복하며 버티지만 폭발력은 낮습니다.', tags: ['defense', 'heal'], heroOnly: true },
    ],
  },
  {
    id: 'evasion',
    name: '회피 계열',
    slotRole: 'defense',
    school: 'support',
    nodes: [
      { id: 'evade', name: '회피', icon: '💨', rarity: 'common', cost: 7, atbCost: 18, mp: 4, cd: 2, effect: { dodge: 1 }, desc: '다음 공격을 피합니다.', tags: ['defense', 'utility'] },
      { id: 'perfect_evade', name: '완전회피', icon: '🌪', rarity: 'magic', cost: 9, atbCost: 22, mp: 8, cd: 3, effect: { dodge: 2 }, desc: '연속 회피 확률을 올립니다.', tags: ['defense', 'utility'] },
      { id: 'reaction_speed', name: '반응속도', icon: '👁', rarity: 'rare', cost: 11, atbCost: 24, mp: 10, cd: 3, effect: { dodge: 1, haste: 1 }, desc: '회피와 함께 ATB 흐름을 가속합니다.', tags: ['defense', 'fast'] },
    ],
    heroes: [
      { id: 'shadow_form', name: '그림자', icon: '🌫', rarity: 'epic', cost: 15, atbCost: 34, mp: 16, cd: 4, effect: { stealth: 1, dodge: 1 }, desc: '다음 공격을 숨기고 치명타를 노립니다.', tags: ['defense', 'stealth'], heroOnly: true },
      { id: 'phantom_image', name: '환영', icon: '👻', rarity: 'epic', cost: 14, atbCost: 30, mp: 16, cd: 4, effect: { dodge: 2, haste: 1 }, desc: '생존성이 높지만 직접 화력은 약합니다.', tags: ['defense', 'utility'], heroOnly: true },
      { id: 'deathblow', name: '일격필살', icon: '☠', rarity: 'epic', cost: 16, atbCost: 36, mp: 18, cd: 4, dmg: [42, 66], critBonusFlat: 0.28, desc: '다음 공격의 치명률이 크게 상승합니다.', tags: ['attack', 'stealth'], heroOnly: true },
    ],
  },
  {
    id: 'reflection',
    name: '반사 계열',
    slotRole: 'defense',
    school: 'support',
    nodes: [
      { id: 'reflect', name: '반사', icon: '✨', rarity: 'common', cost: 7, atbCost: 22, mp: 4, cd: 2, effect: { reflect: 1 }, desc: '받은 피해의 일부를 반사합니다.', tags: ['defense', 'reflect'] },
      { id: 'enhanced_reflect', name: '강화반사', icon: '🔁', rarity: 'magic', cost: 9, atbCost: 26, mp: 8, cd: 3, effect: { reflect: 2 }, desc: '반사량을 높입니다.', tags: ['defense', 'reflect'] },
      { id: 'thorn_armor', name: '가시갑옷', icon: '🌵', rarity: 'rare', cost: 12, atbCost: 32, mp: 12, cd: 4, effect: { reflect: 3, guard: 1 }, desc: '반사와 방어를 동시에 챙깁니다.', tags: ['defense', 'reflect'] },
    ],
    heroes: [
      { id: 'thorns_emperor', name: '극가시', icon: '🪵', rarity: 'epic', cost: 15, atbCost: 36, mp: 18, cd: 4, effect: { reflect: 4 }, desc: '반사가 강력하지만 공격 수단이 부족합니다.', tags: ['defense', 'reflect'], heroOnly: true },
      { id: 'retaliation', name: '응징', icon: '⚔', rarity: 'epic', cost: 15, atbCost: 34, mp: 18, cd: 4, effect: { reflect: 2, powerup: 1 }, desc: '막아낸 뒤 반격 준비를 갖춥니다.', tags: ['defense', 'reflect', 'buff'], heroOnly: true },
      { id: 'spiked_shell', name: '가시 요새', icon: '🐚', rarity: 'epic', cost: 17, atbCost: 38, mp: 20, cd: 5, effect: { reflect: 3, shield: 2, slow: 1 }, desc: '단단하지만 느려집니다.', tags: ['defense', 'reflect'], heroOnly: true },
    ],
  },
  {
    id: 'fire',
    name: '화염 계열',
    slotRole: 'magic',
    school: 'magic',
    element: 'fire',
    nodes: [
      { id: 'fireball', name: '파이어볼', icon: '🔥', rarity: 'common', cost: 9, atbCost: 26, mp: 14, cd: 1, dmg: [24, 38], effect: { burn: 2 }, desc: '직접 화염 피해와 화상을 줍니다.', tags: ['attack', 'magic'] },
      { id: 'sear', name: '화상', icon: '♨', rarity: 'magic', cost: 11, atbCost: 30, mp: 18, cd: 2, dmg: [28, 42], effect: { burn: 3 }, desc: '지속 화염 피해를 강화합니다.', tags: ['attack', 'magic'] },
      { id: 'flame_burst', name: '화염폭발', icon: '💥', rarity: 'rare', cost: 13, atbCost: 36, mp: 22, cd: 3, dmg: [34, 50], effect: { burn: 2 }, bonusVsBurning: 0.4, desc: '화상 대상에게 폭발 연계를 일으킵니다.', tags: ['attack', 'magic'] },
    ],
    heroes: [
      { id: 'inferno_core', name: '인페르노 코어', icon: '☄', rarity: 'epic', cost: 18, atbCost: 48, mp: 26, cd: 4, dmg: [60, 84], effect: { burn: 4 }, desc: '막대한 화력 대신 MP 소모가 큽니다.', tags: ['attack', 'magic'], heroOnly: true },
      { id: 'firestorm', name: '화염폭풍', icon: '🌋', rarity: 'epic', cost: 17, atbCost: 44, mp: 24, cd: 4, dmg: [48, 70], effect: { burn: 3 }, splashDamagePct: 0.3, desc: '범위형 화염 연계로 전장을 태웁니다.', tags: ['attack', 'magic'], heroOnly: true },
      { id: 'phoenix_heat', name: '불사조 열기', icon: '🕊', rarity: 'epic', cost: 16, atbCost: 40, mp: 22, cd: 5, dmg: [40, 60], effect: { burn: 2, regen: 1 }, desc: '화염과 회복을 섞지만 쿨다운이 깁니다.', tags: ['attack', 'magic', 'heal'], heroOnly: true },
    ],
  },
  {
    id: 'lightning',
    name: '번개 계열',
    slotRole: 'magic',
    school: 'magic',
    element: 'lightning',
    nodes: [
      { id: 'lightning', name: '라이트닝', icon: '⚡', rarity: 'common', cost: 8, atbCost: 20, mp: 12, cd: 1, dmg: [18, 30], desc: '빠르게 떨어지는 번개 공격.', effect: { paralyze: 1, chance: 0.2 }, tags: ['attack', 'magic', 'fast'] },
      { id: 'electrocute', name: '감전', icon: '🔋', rarity: 'magic', cost: 10, atbCost: 24, mp: 16, cd: 2, dmg: [24, 36], effect: { paralyze: 1, chance: 0.35 }, desc: '행동 흐름을 끊어내는 감전.', tags: ['attack', 'magic', 'control'] },
      { id: 'overcharge', name: '과부하', icon: '🌩', rarity: 'rare', cost: 12, atbCost: 32, mp: 20, cd: 3, dmg: [30, 46], effect: { paralyze: 2, chance: 0.45 }, desc: '감전과 순간 기절을 동시에 노립니다.', tags: ['attack', 'magic', 'control'] },
    ],
    heroes: [
      { id: 'storm_lance', name: '폭뢰창', icon: '🗲', rarity: 'epic', cost: 16, atbCost: 38, mp: 22, cd: 4, dmg: [50, 72], effect: { paralyze: 2, chance: 0.5 }, desc: '빠르지만 MP 소모가 큰 고화력 번개창.', tags: ['attack', 'magic'], heroOnly: true },
      { id: 'thunder_web', name: '뇌전망', icon: '🕸', rarity: 'epic', cost: 15, atbCost: 34, mp: 20, cd: 4, dmg: [34, 52], effect: { paralyze: 2, slow: 1, chance: 0.55 }, desc: '속박에 가까운 둔화를 부여합니다.', tags: ['attack', 'magic', 'control'], heroOnly: true },
      { id: 'supercell', name: '초전류', icon: '🔌', rarity: 'epic', cost: 18, atbCost: 44, mp: 24, cd: 4, dmg: [56, 78], selfDamagePct: 0.06, desc: '강력하지만 과전류 반동을 감수해야 합니다.', tags: ['attack', 'magic'], heroOnly: true },
    ],
  },
  {
    id: 'healing',
    name: '회복 계열',
    slotRole: 'magic',
    school: 'magic',
    element: 'holy',
    nodes: [
      { id: 'heal', name: '힐', icon: '💚', rarity: 'common', cost: 8, atbCost: 22, mp: 14, cd: 2, heal: [40, 62], desc: '즉시 체력을 회복합니다.', tags: ['heal', 'magic'] },
      { id: 'regen', name: '재생', icon: '🌿', rarity: 'magic', cost: 10, atbCost: 26, mp: 16, cd: 3, effect: { regen: 3 }, hotick: 16, desc: '지속 회복을 부여합니다.', tags: ['heal', 'magic', 'support'] },
      { id: 'life_amplify', name: '생명증폭', icon: '✨', rarity: 'rare', cost: 12, atbCost: 30, mp: 20, cd: 4, heal: [56, 80], effect: { regen: 2 }, desc: '순간 회복과 지속 회복을 모두 얻습니다.', tags: ['heal', 'magic'] },
    ],
    heroes: [
      { id: 'sanctuary', name: '성역', icon: '⛪', rarity: 'epic', cost: 16, atbCost: 38, mp: 24, cd: 5, heal: [88, 120], effect: { regen: 3 }, desc: '압도적인 회복량 대신 재사용이 느립니다.', tags: ['heal', 'magic'], heroOnly: true },
      { id: 'guardian_light', name: '수호의 빛', icon: '🔆', rarity: 'epic', cost: 15, atbCost: 34, mp: 22, cd: 4, heal: [54, 78], effect: { shield: 2 }, desc: '회복과 보호막을 함께 부여합니다.', tags: ['heal', 'magic', 'defense'], heroOnly: true },
      { id: 'martyrs_blessing', name: '순교의 축복', icon: '🕯', rarity: 'epic', cost: 14, atbCost: 30, mp: 20, cd: 4, heal: [46, 68], effect: { regen: 2, powerup: 1 }, selfDamagePct: 0.06, desc: '회복과 강화 대신 자신의 피를 바칩니다.', tags: ['heal', 'magic', 'buff'], heroOnly: true },
    ],
  },
  {
    id: 'vampire',
    name: '흡혈 계열',
    slotRole: 'attack',
    school: 'physical',
    nodes: [
      { id: 'leech_strike', name: '흡혈', icon: '🦇', rarity: 'common', cost: 8, atbCost: 24, mp: 6, cd: 1, dmg: [20, 30], drain: 0.1, desc: '피해 일부를 생명력으로 흡수합니다.', tags: ['attack', 'drain'] },
      { id: 'life_siphon', name: '생명흡수', icon: '🩸', rarity: 'magic', cost: 10, atbCost: 28, mp: 10, cd: 2, dmg: [26, 38], drain: 0.16, desc: '회복량이 크게 증가합니다.', tags: ['attack', 'drain'] },
      { id: 'blood_hunger', name: '피의갈증', icon: '🧛', rarity: 'rare', cost: 12, atbCost: 34, mp: 12, cd: 3, dmg: [32, 46], drain: 0.22, bonusWhenLowHp: 0.32, desc: '체력이 낮을수록 더 흉폭해집니다.', tags: ['attack', 'drain'] },
    ],
    heroes: [
      { id: 'crimson_feast', name: '진홍의 향연', icon: '🍷', rarity: 'epic', cost: 16, atbCost: 42, mp: 18, cd: 4, dmg: [44, 62], drain: 0.35, desc: '강력한 흡혈이지만 평소 피해는 평범합니다.', tags: ['attack', 'drain'], heroOnly: true },
      { id: 'blood_mist', name: '혈무', icon: '🌫', rarity: 'epic', cost: 15, atbCost: 36, mp: 18, cd: 4, dmg: [32, 48], drain: 0.18, effect: { stealth: 1 }, desc: '피를 흩뿌리며 몸을 숨깁니다.', tags: ['attack', 'drain', 'stealth'], heroOnly: true },
      { id: 'dark_thirst', name: '암혈 갈증', icon: '🌘', rarity: 'epic', cost: 17, atbCost: 44, mp: 20, cd: 4, dmg: [52, 74], drain: 0.24, selfDamagePct: 0.04, desc: '고화력 대가로 체력을 조금 소모합니다.', tags: ['attack', 'drain'], heroOnly: true },
    ],
  },
  {
    id: 'stealth',
    name: '은신 계열',
    slotRole: 'defense',
    school: 'support',
    nodes: [
      { id: 'stealth', name: '은신', icon: '🌫', rarity: 'common', cost: 8, atbCost: 20, mp: 6, cd: 2, effect: { stealth: 1 }, desc: '다음 적 공격을 흘려보내고 기습을 준비합니다.', tags: ['defense', 'stealth'] },
      { id: 'ambush', name: '기습', icon: '🗡', rarity: 'magic', cost: 10, atbCost: 24, mp: 10, cd: 3, dmg: [28, 40], critBonusFlat: 0.16, desc: '은신 이후 치명적인 일격을 노립니다.', tags: ['attack', 'stealth'] },
      { id: 'assassinate', name: '암살', icon: '☠', rarity: 'rare', cost: 13, atbCost: 34, mp: 14, cd: 4, dmg: [38, 58], critBonusFlat: 0.24, desc: '치명타 중심의 고위력 공격.', tags: ['attack', 'stealth'] },
    ],
    heroes: [
      { id: 'nightfall', name: '야영', icon: '🌒', rarity: 'epic', cost: 15, atbCost: 30, mp: 18, cd: 4, effect: { stealth: 1, haste: 1 }, desc: '생존성이 높지만 직접 피해는 낮습니다.', tags: ['defense', 'stealth'], heroOnly: true },
      { id: 'phantom_kill', name: '환영살', icon: '🗡', rarity: 'epic', cost: 17, atbCost: 40, mp: 20, cd: 4, dmg: [54, 78], critBonusFlat: 0.35, desc: '치명타 지향의 극단적인 기습기.', tags: ['attack', 'stealth'], heroOnly: true },
      { id: 'smoke_screen', name: '연막 진형', icon: '💨', rarity: 'epic', cost: 14, atbCost: 28, mp: 16, cd: 4, effect: { stealth: 1, dodge: 1, slow: 1 }, desc: '안전하지만 추격력이 떨어집니다.', tags: ['defense', 'stealth'], heroOnly: true },
    ],
  },
  {
    id: 'passive',
    name: '전투 숙련',
    slotRole: 'passive',
    school: 'passive',
    nodes: [
      { id: 'combat_mastery', name: '전투 숙련', icon: '📘', rarity: 'magic', cost: 9, atbCost: 0, mp: 0, cd: 0, passiveBonuses: { atk: 6, crit: 0.02 }, desc: '전반적인 공격 감각을 높입니다.', tags: ['passive'] },
      { id: 'battle_focus', name: '전장의 집중', icon: '🎯', rarity: 'rare', cost: 11, atbCost: 0, mp: 0, cd: 0, passiveBonuses: { atk: 8, crit: 0.03, speed: 2 }, desc: '공격과 민첩을 함께 강화합니다.', tags: ['passive'] },
      { id: 'warlords_rhythm', name: '전장의 리듬', icon: '🥁', rarity: 'epic', cost: 13, atbCost: 0, mp: 0, cd: 0, passiveBonuses: { atk: 10, crit: 0.04, speed: 4 }, desc: '공격 리듬을 완성하는 패시브.', tags: ['passive'] },
    ],
    heroes: [],
  },
]);

function createNodeSkill(tree, node, nodeIndex) {
  return {
    ...node,
    slotRole: tree.slotRole,
    school: tree.school,
    element: node.element ?? tree.element,
    category: node.category ?? tree.id,
    target: node.target ?? (node.heal || node.effect || node.passiveBonuses ? inferTarget(tree.slotRole, node) : 'enemy'),
    level: 1,
    treeId: tree.id,
    treeName: tree.name,
    stage: nodeIndex + 1,
    heroOnly: false,
    maxLevel: 3,
    unlock: nodeIndex === 0 ? { type: 'tree_unlock' } : { type: 'skill_level', skillId: tree.nodes[nodeIndex - 1].id, level: 3 },
  };
}

function createHeroSkill(tree, hero) {
  return {
    ...hero,
    slotRole: tree.slotRole,
    school: tree.school,
    element: hero.element ?? tree.element,
    category: `${tree.id}_hero`,
    target: hero.target ?? inferTarget(tree.slotRole, hero),
    level: 1,
    treeId: tree.id,
    treeName: tree.name,
    stage: 'hero',
    heroOnly: true,
    maxLevel: 1,
    unlock: { type: 'hero_choice', treeId: tree.id },
  };
}

function inferTarget(slotRole, node) {
  if (slotRole === 'passive') {
    return 'self';
  }
  if (node.heal || node.effect || node.passiveBonuses) {
    if (slotRole === 'attack' && node.dmg) {
      return 'enemy';
    }
    return node.dmg && slotRole === 'magic' && !node.heal ? 'enemy' : 'self';
  }
  return 'enemy';
}

export const SKILLS = Object.freeze([
  ...BASIC_SKILLS,
  ...TREE_DEFINITIONS.flatMap((tree) => [
    ...tree.nodes.map((node, nodeIndex) => createNodeSkill(tree, node, nodeIndex)),
    ...tree.heroes.map((hero) => createHeroSkill(tree, hero)),
  ]),
]);

export const TREE_NODE_IDS = Object.freeze(
  Object.fromEntries(TREE_DEFINITIONS.map((tree) => [tree.id, tree.nodes.map((node) => node.id)])),
);

export const TREE_HERO_IDS = Object.freeze(
  Object.fromEntries(TREE_DEFINITIONS.map((tree) => [tree.id, tree.heroes.map((hero) => hero.id)])),
);

export const STARTER_SKILL_IDS = Object.freeze(
  SKILLS.filter((skill) => skill.unlock?.type === 'starter').map((skill) => skill.id),
);

export function createInitialSkillBook() {
  return STARTER_SKILL_IDS.reduce((acc, skillId) => {
    acc[skillId] = { level: 1, unlocked: true };
    return acc;
  }, {});
}
