export function createEnemyState(definition) {
  const dexterity = definition.attributes?.dexterity ?? 10;
  const level = definition.level ?? 1;
  return {
    ...definition,
    progression: {
      level: definition.level ?? 1,
      exp: definition.exp ?? 0,
    },
    attributes: {
      strength: definition.attributes?.strength ?? 10,
      dexterity: definition.attributes?.dexterity ?? 10,
      intelligence: definition.attributes?.intelligence ?? 10,
      vitality: definition.attributes?.vitality ?? 10,
    },
    stats: {
      speed: 7 + level + Math.floor(dexterity * 0.35),
    },
    curHp: definition.hp,
    maxMp: definition.mp ?? 0,
    curMp: definition.mp ?? 0,
    effects: {},
  };
}
