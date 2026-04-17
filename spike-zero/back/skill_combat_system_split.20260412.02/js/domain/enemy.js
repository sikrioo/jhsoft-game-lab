export function createEnemyState(definition) {
  const dexterity = definition.attributes?.dexterity ?? 10;
  const level = definition.level ?? 1;
  const baseAtbSpeed = 10 + dexterity * 0.5;
  const skillCooldowns = Object.fromEntries((definition.skills ?? []).map((skillId) => [skillId, 0]));
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
      speed: Math.round(baseAtbSpeed + level * 0.2),
    },
    atbCost: definition.atbCost ?? 28,
    curHp: definition.hp,
    maxMp: definition.mp ?? 0,
    curMp: definition.mp ?? 0,
    skillCooldowns,
    effects: {},
  };
}
