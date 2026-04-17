export const ITEM_CATEGORY_LABELS = Object.freeze({
  consumable: '소비',
  equipment: '장비',
  quest: '퀘스트',
  material: '재료',
  rune_fragment: '룬조각',
});

export const EQUIPMENT_SLOT_LABELS = Object.freeze({
  helm: '투구',
  chest: '갑옷',
  gloves: '장갑',
  boots: '장화',
  weapon: '무기',
  offhand: '보조장비',
  belt: '허리띠',
  amulet: '목걸이',
  ring1: '반지 I',
  ring2: '반지 II',
});

export const ITEM_BASES = Object.freeze({
  consumable: [
    { key: 'healing_potion', name: '치유 물약', icon: '🧪', effect: { heal: 120 }, desc: '즉시 HP를 회복합니다.' },
    { key: 'mana_potion', name: '마나 물약', icon: '🔵', effect: { mana: 80 }, desc: '즉시 MP를 회복합니다.' },
    { key: 'battle_tonic', name: '전투 강장제', icon: '🥤', effect: { heal: 60, mana: 40 }, desc: 'HP와 MP를 동시에 보충합니다.' },
  ],
  material: [
    { key: 'demon_bone', name: '악마의 뼛조각', icon: '🦴', desc: '강화와 제작에 쓰이는 재료.' },
    { key: 'ember_core', name: '불꽃 핵', icon: '🔥', desc: '화염 속성 제작 재료.' },
    { key: 'frost_shard', name: '서리 파편', icon: '❄', desc: '냉기 속성 제작 재료.' },
  ],
  rune_fragment: [
    { key: 'rune_fragment_crimson', name: '진홍 룬조각', icon: '♦', desc: '힘 계열 룬 파편.' },
    { key: 'rune_fragment_azure', name: '창청 룬조각', icon: '◈', desc: '지능 계열 룬 파편.' },
    { key: 'rune_fragment_verdant', name: '비취 룬조각', icon: '✦', desc: '민첩 계열 룬 파편.' },
  ],
  quest: [
    { key: 'king_seal', name: '몰락왕의 인장', icon: '👑', desc: '암흑의 왕조와 관련된 퀘스트 아이템.' },
    { key: 'dragon_scale', name: '고룡의 비늘', icon: '🐲', desc: '보스 토벌의 증거.' },
  ],
});

export const EQUIPMENT_BASES = Object.freeze([
  { key: 'rusted_sword', name: '녹슨 검', icon: '🗡', slot: 'weapon', rarity: 'common', stats: { strength: 2, atk: 5 } },
  { key: 'hunter_bow', name: '사냥꾼의 활', icon: '🏹', slot: 'weapon', rarity: 'magic', stats: { dexterity: 3, atk: 7 } },
  { key: 'bone_focus', name: '뼈 수정구', icon: '🔮', slot: 'offhand', rarity: 'magic', stats: { intelligence: 3, maxMp: 18 } },
  { key: 'traveler_hood', name: '방랑자 후드', icon: '🪖', slot: 'helm', rarity: 'common', stats: { vitality: 2, def: 2 } },
  { key: 'chain_mail', name: '체인 갑옷', icon: '⛓', slot: 'chest', rarity: 'magic', stats: { vitality: 4, def: 5 } },
  { key: 'grim_gloves', name: '유령 장갑', icon: '🧤', slot: 'gloves', rarity: 'magic', stats: { dexterity: 2, crit: 0.03 } },
  { key: 'wanderer_boots', name: '방랑자 장화', icon: '👢', slot: 'boots', rarity: 'common', stats: { dexterity: 2, speed: 1 } },
  { key: 'war_belt', name: '전사의 허리띠', icon: '🧷', slot: 'belt', rarity: 'common', stats: { vitality: 2, hp: 24 } },
  { key: 'sun_amulet', name: '태양 목걸이', icon: '📿', slot: 'amulet', rarity: 'rare', stats: { intelligence: 4, strength: 2, maxMp: 24 } },
  { key: 'iron_band', name: '철의 반지', icon: '💍', slot: 'ring', rarity: 'common', stats: { strength: 1, def: 1 } },
  { key: 'seer_ring', name: '예언자 반지', icon: '💠', slot: 'ring', rarity: 'rare', stats: { intelligence: 4, crit: 0.04 } },
]);

export const STARTER_LOADOUT = Object.freeze({
  equipped: ['rusted_sword', 'traveler_hood', 'wanderer_boots'],
  inventoryEquipment: ['bone_focus', 'iron_band'],
  consumables: [
    ['healing_potion', 3],
    ['mana_potion', 2],
    ['battle_tonic', 1],
  ],
});
