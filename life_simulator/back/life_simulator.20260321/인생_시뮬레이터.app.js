var decade = '1960';
var gender = 'male';
var vals = {...PRESETS['📌 60년대 영업 성공인']};
var tagSelections = Object.fromEntries(
  Object.entries(TAGS).map(([key, config]) => [key, config.levels[0].value])
);

const C = x => Math.min(100, Math.max(0, Math.round(x)));
const lerp = (a,b,t) => a + (b-a)*t;

initUI();
