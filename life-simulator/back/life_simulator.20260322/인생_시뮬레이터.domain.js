const STAT_LABEL_MAP = Object.fromEntries(
  Object.values(SCHEMA).flatMap(group => group.vars).map(item => [item.k, item.l])
);

function getStatLabel(statKey){
  return STAT_LABEL_MAP[statKey] ?? statKey;
}

function getTagEffects(){
  const bonus = {};
  const active = [];

  Object.entries(TAGS).forEach(([tagKey, tag])=>{
    const selected = tagSelections[tagKey] || tag.levels[0].value;
    const level = tag.levels.find(item=>item.value===selected) || tag.levels[0];
    const effects = Object.entries(level.effects || {});

    effects.forEach(([statKey, delta])=>{
      bonus[statKey] = (bonus[statKey] || 0) + delta;
    });

    if(effects.length){
      active.push({
        key:tagKey,
        label:tag.label,
        level:level.label,
        color:tag.color,
        description:tag.description,
        effects:effects.map(([statKey, delta])=>`${getStatLabel(statKey)} ${delta>0?'+':''}${delta}`),
      });
    }
  });

  return {bonus, active};
}

function getAdj(){
  const dc=DECADES[decade];
  const tagEffects = getTagEffects();
  const v={};
  Object.values(SCHEMA).flatMap(g=>g.vars).forEach(x=>{
    v[x.k]=C((vals[x.k]??50)+(dc.bonus[x.k]||0)+(tagEffects.bonus[x.k]||0));
  });
  v._wp=dc.wp;
  v._tagBonus = tagEffects.bonus;
  v._tagProfile = tagEffects.active;
  v._tagLevels = {...tagSelections};
  return v;
}

// ══════════════════════════════════════════════════════
// 7. COMPOSITE SCORES (상위 지표)
// ══════════════════════════════════════════════════════
function calcComposites(v){
  const avg=(...xs)=>xs.reduce((a,b)=>a+b,0)/xs.length;
  return {
    cognition:   C(avg(v.reasoning,v.pattern,v.modeling)*0.8 + v.self_aware*0.2),
    creativity:  C(avg(v.creative_c,v.art_sense,v.hum_sense)*0.7 + v.art_expr*0.3),
    design:      C(avg(v.eng_sense,v.modeling,v.exec_tech)),
    exec_total:  C(avg(v.execution,v.willpower,v.focus)),
    survival:    C(avg(v.mental,v.stamina,v.adapt,v.self_ctrl)),
    relation:    C(avg(v.social_sk,v.empathy,v.affinity,v.expression)),
    influence:   C(avg(v.confidence,v.expression,v.network,v.style)*0.7 + v.social_sk*0.3),
    stability:   C(avg(v.econ_power,v.self_ctrl,v.stability,v.survival)),
    drive:       C(avg(v.aggression,v.risk_pref,v.achiev,v.execution)),
    art_power:   C(avg(v.art_sense,v.creative_c,v.art_expr,v.focus)),
    decay_risk:  C(avg(100-v.morality,v.power_d,v.aggression,100-v.empathy)*0.7 + v.impulsive*0.3),
    luck_total:  C(avg(v.birth_luck,v.env_luck,50,50)), // 타이밍운·사건운은 랜덤 추가
  };
}

// ══════════════════════════════════════════════════════
// 8. SYNERGY / PENALTY RULES
// ══════════════════════════════════════════════════════
const COMBO_RULES = [
  {
    type:'syn',
    label:'실행+의지 황금 조합',
    desc:'계획이 행동으로, 행동이 끝까지 완수됨. 성과 확률 +25%',
    delta:+25,
    condition:(v)=>v.execution>=75&&v.willpower>=75,
  },
  {
    type:'syn',
    label:'관계+표현 파워 커플',
    desc:'설득력과 네트워크가 폭발. 영업·리더·정치 분야 +30%',
    delta:+30,
    condition:(v)=>v.social_sk>=80&&v.expression>=80,
  },
  {
    type:'syn',
    label:'지능+자기인식 조합',
    desc:'재능을 올바른 방향에 쓰는 희귀 조합. 잠재력 실현률 +35%',
    delta:+35,
    condition:(v, comp)=>comp.cognition>=80&&v.self_aware>=75,
  },
  {
    type:'syn',
    label:'예술감각+창의연결 폭발',
    desc:'두 재능축이 결합해 독창적 창작물 생산. 예술력 +40%',
    delta:+40,
    condition:(v)=>v.art_sense>=80&&v.creative_c>=80,
  },
  {
    type:'syn',
    label:'위험선호+실행력 돌파',
    desc:'도전을 실제로 밀어붙이는 사업가/탐험가 조합. +30%',
    delta:+30,
    condition:(v)=>v.risk_pref>=75&&v.execution>=80,
  },
  {
    type:'syn',
    label:'도덕+공감 리더십',
    desc:'신뢰받는 진짜 리더. 조직 결속력과 장기 평판 +25%',
    delta:+25,
    condition:(v)=>v.morality>=75&&v.empathy>=75,
  },
  {
    type:'syn',
    label:'공학+예술 건축가 조합',
    desc:'기능과 미감이 동시에 높음. 건축·UX·제품 디자인 최적',
    delta:+25,
    condition:(v)=>v.eng_sense>=80&&v.art_sense>=70,
  },
  {
    type:'syn',
    label:'재무지능+위험선호',
    desc:'투자·창업에서 다른 차원의 성과. 경제적 성공 +35%',
    delta:+35,
    condition:(v)=>v.fin_intel>=80&&v.risk_pref>=70,
  },
  {
    type:'syn',
    label:'집중+의지력 몰입형',
    desc:'1만 시간 법칙 실현 가능 조합. 전문성 정점 도달',
    delta:+30,
    condition:(v)=>v.focus>=85&&v.willpower>=85,
  },
  {
    type:'syn',
    label:'인문+표현 작가/강사형',
    desc:'인간을 이해하고 언어로 전달. 교육·강의·작가 최적',
    delta:+28,
    condition:(v)=>v.hum_sense>=80&&v.expression>=80,
  },
  {
    type:'pen',
    label:'지능高+실행력低 생각만 많은 사람',
    desc:'훌륭한 통찰이 실행으로 연결 안 됨. 잠재력 낭비 -30%',
    delta:-30,
    condition:(v, comp)=>comp.cognition>=80&&v.execution<=30,
  },
  {
    type:'pen',
    label:'지능高+자기인식低 방향 상실',
    desc:'잘못된 분야에서 재능 낭비. 성공 확률 -25%',
    delta:-25,
    condition:(v, comp)=>comp.cognition>=80&&v.self_aware<=30,
  },
  {
    type:'pen',
    label:'공격성高+도덕성低 타락 위험',
    desc:'성공하면 권력을 착취 도구로 전환. 붕괴 리스크 극상',
    delta:-35,
    condition:(v)=>v.aggression>=80&&v.morality<=25,
  },
  {
    type:'pen',
    label:'실행高+생존력低 번아웃 코스',
    desc:'빠르게 올라갔다가 빠르게 무너짐. 중장기 성과 -25%',
    delta:-25,
    condition:(v, comp)=>comp.exec_total>=80&&comp.survival<=35,
  },
  {
    type:'pen',
    label:'쾌락욕高+자기통제低 중독 취약',
    desc:'단기 성과 후 습관·중독으로 경로 붕괴 가능',
    delta:-30,
    condition:(v)=>v.pleasure>=80&&v.self_ctrl<=25,
  },
  {
    type:'pen',
    label:'권력욕高+공감低 고립 지도자',
    desc:'조직은 장악하지만 진심 지지 없음. 장기 붕괴',
    delta:-25,
    condition:(v)=>v.power_d>=80&&v.empathy<=25,
  },
  {
    type:'pen',
    label:'외모의존+저실행+저도덕',
    desc:'외모 자본에만 의존. 중년 이후 급락 리스크',
    delta:-30,
    condition:(v)=>v.looks>=85&&v.execution<=30&&v.morality<=35,
  },
  {
    type:'pen',
    label:'충동성高+자기통제低',
    desc:'기회를 만들지만 스스로 망가뜨림. 기복 극심',
    delta:-25,
    condition:(v)=>v.impulsive>=80&&v.self_ctrl<=25,
  },
  {
    type:'pen',
    label:'극단적 질투+저통제',
    desc:'비교에서 오는 분노가 행동을 왜곡. 관계 파괴',
    delta:-20,
    condition:(v)=>v.jealousy>=85&&v.self_ctrl<=35,
  },
];

function calcCombos(v, comp){
  return COMBO_RULES
    .filter(rule => rule.condition(v, comp))
    .map(({condition, ...rest}) => rest);
}

// ══════════════════════════════════════════════════════
// 9. CHARM ARCHETYPES
// ══════════════════════════════════════════════════════
function calcCharm(v){
  const d=parseInt(decade);
  const ageDecay = d>=2000 ? 0.9 : d>=1980 ? 1.0 : 1.1; // 젊은 세대는 섹시함 더 중요

  const archetypes = [
    {name:'카리스마',   score:C(v.confidence*0.35+v.style*0.30+v.aggression*0.20+v.expression*0.15),  color:'#e05a5a'},
    {name:'친근함',     score:C(v.affinity*0.40+v.empathy*0.30+v.emotion_ex*0.30),                    color:'#4eb87a'},
    {name:'지적 매력',  score:C(v.reasoning*0.30+v.expression*0.35+v.mystery*0.20+v.trust_feel*0.15), color:'#5a9ef0'},
    {name:'귀여움',     score:C(v.emotion_ex*0.40+v.affinity*0.30+(100-v.mystery)*0.30*ageDecay),     color:'#e87ab0'},
    {name:'섹시함',     score:C(v.looks*0.40+v.confidence*0.30+v.style*0.20+(v.mystery*0.10)*ageDecay),color:'#e87ab0'},
    {name:'퇴폐미',     score:C(v.mystery*0.35+(100-v.affinity)*0.25+v.style*0.25+v.risk_pref*0.15), color:'#9b7de8'},
    {name:'유머',       score:C(v.expression*0.35+v.creative_c*0.30+v.affinity*0.25+v.adapt*0.10),    color:'#c9a84c'},
    {name:'신비감',     score:C(v.mystery*0.40+(100-v.emotion_ex)*0.20+v.style*0.25+v.confidence*0.15),color:'#7c6af0'},
  ];

  archetypes.sort((a,b)=>b.score-a.score);
  return {archetypes, main:archetypes[0], sub:archetypes[1]};
}

// ══════════════════════════════════════════════════════
// 10. HUMAN TYPE CLASSIFICATION
// ══════════════════════════════════════════════════════
function classifyHuman(v, comp, combos){
  const labels=[];
  const details=[];

  // 출발형
  const startScore=(v.birth_env+v.family_bg+v.birth_luck)/3;
  if(startScore<30){labels.push({l:'불행형 출발',c:'#e05a5a'});details.push('극히 불리한 출발 조건 — 모든 것을 스스로 만들어야 하는 시작');}
  else if(startScore>72){labels.push({l:'특권형 출발',c:'#c9a84c'});details.push('유리한 출발 조건 — 기회의 밀도가 다른 시작');}
  else{labels.push({l:'보통형 출발',c:'#5a9ef0'});details.push('평균적인 출발 조건');}

  // 사고형
  if(comp.cognition>85&&Math.max(v.eng_sense,v.hum_sense,v.art_sense)>85) {labels.push({l:'천재형',c:'#a594ff'});details.push('특정 재능축+인지력이 극단적으로 높은 희귀 조합');}
  else if(comp.cognition>72) {labels.push({l:'고차원형',c:'#7c6af0'});details.push('인지력이 뛰어난 사고가 가능한 유형');}
  else if(comp.cognition<35&&v.self_ctrl<35) {labels.push({l:'일차원형',c:'#888'});details.push('욕구·반응에만 충실, 비판적 사고 희박');}
  else{labels.push({l:'보통 사고형',c:'#5a9ef0'});details.push('평균적 인지 범위');}

  // 도덕형
  const moralScore=(v.morality+v.empathy+(100-v.aggression))/3;
  if(moralScore<28){labels.push({l:'범죄형',c:'#e05a5a'});details.push('도덕성+공감 극저, 공격성 극고 — 규범 밖 경로 높은 확률');}
  else if(moralScore>72){labels.push({l:'책임형',c:'#4eb87a'});details.push('높은 도덕성과 공감, 자기통제로 신뢰를 구축');}
  else{labels.push({l:'평균 도덕형',c:'#5a9ef0'});details.push('사회 평균 도덕 범위');}

  // 성취형
  const achieveScore=(comp.exec_total+v.achiev+v.drive)/3;
  if(achieveScore>80&&comp.cognition>65){labels.push({l:'초성공형 잠재',c:'#c9a84c'});details.push('자산·명성·영향력 모두 상위권 가능성');}
  else if(achieveScore>65){labels.push({l:'성공형',c:'#4eb87a'});details.push('특정 분야에서 지속적 성과를 낼 수 있는 조합');}
  else{labels.push({l:'무명형',c:'#888'});details.push('현재 변수로는 성과 창출이 어려운 구조');}

  // 영향형
  const influenceScore=(comp.influence+v.power_d+v.social_sk)/3;
  if(influenceScore>80){labels.push({l:'초권력형',c:'#e05a5a'});details.push('영향력+자원+네트워크 극상 — 대중을 이끄는 구조');}
  else if(influenceScore>62){labels.push({l:'리더형',c:'#e87ab0'});details.push('관계력+표현력+실행력이 조화로운 지도자형');}
  else{labels.push({l:'비영향형',c:'#888'});details.push('영향력 발휘보다 개인 영역에 집중하는 유형');}

  return {labels, details};
}

// ══════════════════════════════════════════════════════
// 11. SUCCESS PREDICTION
// ══════════════════════════════════════════════════════
function calcSuccess(v, comp, combos, luck){
  const synBonus = combos.filter(c=>c.type==='syn').reduce((a,c)=>a+c.delta,0)/100*10;
  const penMalus = combos.filter(c=>c.type==='pen').reduce((a,c)=>a+c.delta,0)/100*10;
  const netCombo = synBonus+penMalus;

  const wp=v._wp||0;

  const economic = C(
    comp.exec_total*0.20 +
    v.achiev*0.15 +
    comp.stability*0.15 +
    v.fin_intel*0.15 +
    v.risk_pref*0.10 +
    v.econ_power*0.10 +
    luck.env*0.10 +
    luck.quantum*0.05 +
    wp*0.1 +
    netCombo*3
  );
  const social_s = C(
    comp.relation*0.25 +
    comp.influence*0.25 +
    v.morality*0.15 +
    v.expression*0.15 +
    v.network*0.10 +
    luck.timing*0.10 +
    netCombo*2
  );
  const inner = C(
    v.morality*0.20 +
    comp.survival*0.20 +
    v.self_aware*0.15 +
    v.empathy*0.15 +
    (100-v.power_d)*0.10 +
    (100-v.jealousy)*0.10 +
    v.stability*0.10 +
    netCombo
  );

  return {economic, social:social_s, inner};
}

// ══════════════════════════════════════════════════════
// 12. RISK ANALYSIS
// ══════════════════════════════════════════════════════
function calcRisks(v, comp){
  const risks=[];
  const add=(sev,icon,title,desc,color)=>risks.push({sev,icon,title,desc,color});

  if(comp.exec_total>=78&&comp.survival<=38)
    add(3,'⚡','조기 소진형 (번아웃)','실행력·의지력은 높지만 정신력·체력·자기통제가 약함. 빠르게 올라가다 급격히 무너지는 경로.','#e05a5a');
  if(comp.cognition>=78&&v.self_aware<=32)
    add(3,'🎯','방향 상실형','높은 지능이 잘못된 분야에 낭비됨. 재능과 직업 미스매치로 평생 고생할 수 있음.','#e87ab0');
  if(v.morality<=25&&v.power_d>=75)
    add(3,'💀','타락 분기형','성공 시 권력을 착취 도구로 전환할 가능성 극상. 사회적 붕괴 리스크.','#e05a5a');
  if(comp.exec_total>=75&&v.social_sk<=32&&v.empathy<=32)
    add(2,'🏝️','관계 고립형','성과는 내지만 관계망 없이 혼자 도달. 경제적 성공 뒤 인간적 공허감.','#5a9ef0');
  if(v.pleasure>=80&&v.self_ctrl<=28)
    add(3,'🌀','중독 취약형','쾌락욕과 자기통제 불균형. 알코올·도박·게임·관계 중독으로 경로 붕괴 가능.','#9b7de8');
  if(v.looks>=85&&v.execution<=35&&v.morality<=35)
    add(2,'🪞','외모 자본 의존형','시간이 지나면 감가상각되는 자산에만 의존. 중년 이후 자원 고갈.','#e87ab0');
  if(comp.cognition>=78&&v.execution<=32)
    add(2,'💭','생각만 많은 사람형','훌륭한 통찰이 실행으로 연결되지 않음. 아이디어 낭비.','#c9a84c');
  if(Math.max(v.birth_env,v.family_bg,v.econ_power)<=28&&comp.cognition>=72)
    add(3,'🌍','구조적 기회 박탈형','재능은 있지만 환경이 받쳐주지 않음. 사회 구조의 희생자가 될 가능성.','#3db8a8');
  if(v.impulsive>=80&&v.self_ctrl<=28)
    add(2,'⚡','충동 자기파괴형','기회를 스스로 만들지만 충동으로 망가뜨림. 극심한 기복.','#e05a5a');
  if(comp.decay_risk>=72)
    add(3,'☠️','타락 위험 임계치 초과','도덕성·공감·자기통제 전반이 위험 수준. 권력이나 자원 집중 시 타락 트리거 발동 가능.','#e05a5a');
  const tagLevels = v._tagLevels || {};
  if(['year1','year3'].includes(tagLevels.mindfulness)){
    const risk = risks.find(item=>item.title==='충동 자기파괴형');
    if(risk) risk.sev = Math.max(1, risk.sev-1);
  }
  if(['year1','year3'].includes(tagLevels.exercise)){
    const risk = risks.find(item=>item.title==='조기 소진형 (번아웃)');
    if(risk) risk.sev = Math.max(1, risk.sev-1);
  }
  if(tagLevels.routine==='strong'){
    const risk = risks.find(item=>item.title==='생각만 많은 사람형');
    if(risk) risk.sev = Math.max(1, risk.sev-1);
  }
  risks.sort((a,b)=>b.sev-a.sev);
  return risks.slice(0,6);
}

// ══════════════════════════════════════════════════════
// 13. LIFE PHASES (dynamic variable change)
// ══════════════════════════════════════════════════════
function calcPhases(v, comp, luck){
  const d=parseInt(decade);
  const wp=v._wp||0;

  // Variables change across phases
  // stamina peaks at youth, declines; wisdom grows; network compounds
  const phases=[
    {
      name:'유년기', age:'0–18세', color:'#378ADD',
      keys:'출생환경·가정배경·출생운 지배',
      score: C(v.birth_env*0.32+v.family_bg*0.32+v.birth_luck*0.20+v.health_con*0.10+v.edu_access*0.06+wp*0.08),
      staminaMod:1.0, networkMod:0.3, wisdomMod:0.5,
    },
    {
      name:'청년기', age:'19–35세', color:'#4eb87a',
      keys:'집중력·실행력·의지력·관계력 지배',
      score: C(comp.exec_total*0.25+comp.relation*0.18+v.achiev*0.15+v.adapt*0.12+v.opp_access*0.10+luck.env*0.10+wp*0.05+luck.quantum*0.05),
      staminaMod:1.0, networkMod:0.7, wisdomMod:0.7,
    },
    {
      name:'초기 성인기', age:'25–40세', color:'#c9a84c',
      keys:'직업 적합도·시대 적합성·네트워크 지배',
      score: C(comp.exec_total*0.18+comp.influence*0.18+v.era_fit*0.15+v.network*0.15+luck.timing*0.12+comp.cognition*0.12+wp*0.05+luck.quantum*0.05),
      staminaMod:0.92, networkMod:1.0, wisdomMod:0.85,
    },
    {
      name:'중년기', age:'40–55세', color:'#e87ab0',
      keys:'유지력·운영기술·자산·영향력 지배',
      score: C(comp.survival*0.20+v.ops_skill*0.18+v.econ_power*0.15+comp.influence*0.15+v.fin_intel*0.12+v.morality*0.10+luck.event*0.10),
      staminaMod:0.78, networkMod:1.0, wisdomMod:1.0,
    },
    {
      name:'후반기', age:'55세+', color:'#7c6af0',
      keys:'평판·건강·내적 성공·후계 구조 지배',
      score: C(v.morality*0.22+comp.survival*0.20+v.social_sk*0.18+v.econ_power*0.15+v.self_aware*0.12+(100-v.power_d)*0.08+luck.event*0.05),
      staminaMod:0.60, networkMod:0.9, wisdomMod:1.0,
    },
  ];
  return phases;
}

// ══════════════════════════════════════════════════════
// 14. LIFE EVENTS (dynamic, trigger-based)
// ══════════════════════════════════════════════════════
function generateEvents(v, comp, phases, luck, combos){
  const d=parseInt(decade);
  const iF=gender==='female';
  const evs={유년기:[],청년기:[],초기성인기:[],중년기:[],후반기:[]};
  const add=(phase,text,t)=>evs[phase].push({text,t});

  // 유년기
  if(v.birth_env<22)      add('유년기','전쟁·빈곤·극심한 환경 — 생존 자체가 성취','neg');
  else if(v.birth_env>78) add('유년기','안정된 환경에서 충분한 자원으로 성장','pos');
  if(v.family_bg>75)      add('유년기','유복한 가정 — 교육·문화자본 선점','pos');
  else if(v.family_bg<22) add('유년기','가정 결핍 — 조기 자립 감각 형성','neg');
  if(v.edu_access>72)     add('유년기','질 높은 교육 접근 — 지적 기반 조기 구축','pos');
  if(v.eng_sense>80)      add('유년기','공학적 직관 발현 — 구조·시스템에 끌림','neu');
  if(v.art_sense>80)      add('유년기','예술 감수성 발현 — 창작 충동 강렬','neu');
  if(v.hum_sense>80)      add('유년기','인문적 사고 발현 — 역사·인간·권력 구조 탐구','neu');
  if(v.body_skill>82)     add('유년기','탁월한 신체 재능 발현 — 스포츠·기능 분야 두각','pos');

  // 청년기
  if(v.birth_env<25&&comp.exec_total>72)  add('청년기','역경 속 자력 돌파 — 실행력이 배경 열세 상쇄 시작','pos');
  if(comp.relation>75&&v.opp_access>60)   add('청년기','관계망 확장 + 기회 — 핵심 인맥 형성 구간','pos');
  if(comp.exec_total>82)                  add('청년기','실행 속도 우위 — 남이 생각하는 동안 이미 완수','pos');
  if(v.risk_pref>80&&v.execution>75)      add('청년기','과감한 베팅 단행 — 도약 시도','warn');
  if(v.looks>=85&&v.morality<=30)        add('청년기',iF?'외모 자본 이용 착취 경로 형성 시작':'이성 착취·기둥서방 패턴 형성','neg');
  if(luck.env>65&&v.opp_access>55)        add('청년기','환경운 발동 — 예상치 못한 인맥·기회 출현','pos');
  else if(luck.env<35)                    add('청년기','환경 역풍 — 노력 대비 결과 저조 구간','neg');
  if(d<=1980&&v.social_sk>80)             add('청년기','고도성장기 탑승 — 사회성 높은 자에게 폭발적 보상','pos');
  if(d===1980&&v.adapt<40)               add('청년기','IMF 직격 — 적응력 부족으로 위기','neg');
  if(d===1990&&v.creative_c>75)          add('청년기','디지털 전환 기회 포착 — 창의 역량 보상받기 시작','pos');
  if(d>=2000&&v.creative_c>78)           add('청년기','AI·콘텐츠 시대 — 창의력 있는 자에게 기회 집중','pos');
  if(d>=2000&&v.execution<40)            add('청년기','AI 경쟁 시대 — 실행력 부족으로 도태 위험','neg');

  // 초기 성인기
  if(combos.some(c=>c.type==='syn'&&c.delta>=30)) add('초기성인기','핵심 시너지 조합 발화 — 잠재력 현실화 시작','pos');
  if(v.era_fit>75&&v.opp_access>65)      add('초기성인기','시대 적합성+기회 접근 — 직업적 도약 구간','pos');
  if(v.self_aware>=75&&comp.cognition>=75) add('초기성인기','올바른 분야 선택 — 재능과 직업의 완벽한 매칭','pos');
  if(v.self_aware<30&&comp.cognition>=75) add('초기성인기','재능 미스매치 — 잘못된 분야에서 고생','neg');
  if(luck.timing>70)                      add('초기성인기','타이밍운 발동 — 결정적 시점에 결정적 기회','pos');
  else if(luck.timing<30)                 add('초기성인기','타이밍 불운 — 좋은 기회를 빗겨나감','neg');
  if(v.morality<25&&v.power_d>75)        add('초기성인기','타락 분기 트리거 — 권력+도덕 결여 조합 위험 신호','neg');
  if(comp.exec_total>80&&comp.survival<38) add('초기성인기','번아웃 경고 — 과도한 추진이 내구성 초과','neg');

  // 중년기
  if(v.fin_intel>78&&v.econ_power>55)    add('중년기','자산 복리 구간 — 재무지능이 경제적 격차 만들기 시작','pos');
  if(v.ops_skill>75&&v.network>65)       add('중년기','운영+네트워크 — 시스템으로 결과 만드는 구간','pos');
  if(v.morality<25)                      add('중년기','도덕 결여 누적 — 평판 리스크·법적 리스크 표면화','neg');
  if(v.health_con<35||v.stamina<30)      add('중년기','건강 경고 — 체력 자본 급격 소진, 활동 제약','neg');
  if(luck.event<30)                      add('중년기','사건운 발동 — 질병·사고·외부 충격이 경로 꺾음','neg');
  else if(luck.event>70)                 add('중년기','예상치 못한 기회 이벤트 — 경로 상향 전환','pos');
  if(comp.creativity>80&&comp.exec_total>70) add('중년기','창의+실행 황금기 — 독창적 성과 대량 생산 구간','pos');

  // 후반기
  if(v.morality>72&&comp.survival>70)   add('후반기','안정된 노년 진입 — 내적 평화와 사회적 존경 공존','pos');
  else if(comp.survival<35)             add('후반기','정신·체력 소진 — 누적 스트레스가 노년 잠식','neg');
  if(v.network>72&&v.morality>65)       add('후반기','평판 자산화 — 관계망이 유산이 됨','pos');
  if(v.self_aware>75)                   add('후반기','자기인식 높은 노년 — 후회 적고 내적 성공 높음','pos');
  if(luck.quantum>8)                    add('후반기','양자운 (+) — 설명 불가한 행운이 말년을 밝힘','pos');
  else if(luck.quantum<-8)              add('후반기','양자운 (−) — 이유 없는 불운의 연쇄','neg');
  if(['some','many'].includes(v._tagLevels?.leadership)) add('청년기','리더 경험이 누적돼 책임을 맡는 자리에서 존재감이 커짐','pos');
  if(v._tagLevels?.speaking==='many') add('초기성인기','발표 경험이 자산이 되어 면접·영업·강의 기회에서 강점을 보임','pos');
  if(v._tagLevels?.routine==='strong') add('중년기','장기 루틴 유지력이 누적돼 꾸준함이 자산으로 복리처럼 작동','pos');
  if(v._tagLevels?.exercise==='none'&&v.stamina<45) add('중년기','운동 부족과 체력 저하가 겹쳐 건강 관리가 중요한 과제가 됨','warn');
  if(v._tagLevels?.mindfulness==='year3') add('후반기','명상 습관이 깊어져 스트레스 사건에도 자기 균형을 잘 유지함','pos');
  return evs;
}

function getCareerEraContext(decade){
  const d=parseInt(decade);
  const entryYear=d+25;
  return {
    d,
    entryYear,
    webEra:entryYear>=1998,
    platformEra:entryYear>=2012,
    aiEra:entryYear>=2022,
    cryptoEra:entryYear>=2017,
    callCenterEra:entryYear>=1995,
    petEra:entryYear>=2005,
    smartEra:entryYear>=2010,
    dig:entryYear>=1998,
    mod:entryYear>=2012,
    old:entryYear<=1990,
    pre00:entryYear<=2000,
  };
}

// ══════════════════════════════════════════════════════
// 15. CAREER DATABASE (200개)
// ══════════════════════════════════════════════════════
function buildCareers(v, comp, charm, decade, gender){
  const {d, entryYear, webEra, platformEra, aiEra, cryptoEra, callCenterEra, petEra, smartEra, dig, mod, old, pre00} = getCareerEraContext(decade);
  const iF=gender==='female',iM=gender==='male';
  const lH=v.looks>=78,mL=v.morality<=30,mM=v.morality>30&&v.morality<=55;
  const cm=charm.main.name,cs=charm.sub.name;

  const pickTopSignals = (pairs) =>
    pairs
      .map(([label, value])=>({label, value:C(value)}))
      .sort((a,b)=>b.value-a.value)
      .slice(0,3);

  const getCareerSignals = (cat, name) => {
    const overrides = {
      '기술영업': [['공학감각', v.eng_sense], ['표현력', v.expression], ['사회기술', v.social_sk], ['실행력', v.execution]],
      '솔루션 컨설턴트': [['추론력', v.reasoning], ['표현력', v.expression], ['공학감각', v.eng_sense], ['사회기술', v.social_sk]],
      '고객성공 매니저': [['사회기술', v.social_sk], ['표현력', v.expression], ['운영기술', v.ops_skill], ['공감성', v.empathy]],
      '프로덕트 매니저': [['추론력', v.reasoning], ['표현력', v.expression], ['인문감각', v.hum_sense], ['실행력', v.execution]],
      '프로젝트 매니저': [['운영기술', v.ops_skill], ['실행력', v.execution], ['표현력', v.expression], ['사회기술', v.social_sk]],
      '임상병리사': [['추론력', v.reasoning], ['집중력', v.focus], ['실행력', v.execution], ['도덕성', v.morality]],
      '방사선사': [['추론력', v.reasoning], ['실행력', v.execution], ['신체재능', v.body_skill], ['도덕성', v.morality]],
      '작업치료사': [['인문감각', v.hum_sense], ['사회기술', v.social_sk], ['실행력', v.execution], ['도덕성', v.morality]],
      '병원행정': [['운영기술', v.ops_skill], ['실행력', v.execution], ['사회기술', v.social_sk], ['도덕성', v.morality]],
      '공기업 실무': [['안정욕', v.stability], ['추론력', v.reasoning], ['실행력', v.execution], ['도덕성', v.morality]],
      '정책연구원': [['추론력', v.reasoning], ['인문감각', v.hum_sense], ['표현력', v.expression], ['도덕성', v.morality]],
      '감사·심사 실무': [['추론력', v.reasoning], ['도덕성', v.morality], ['자기통제력', v.self_ctrl], ['실행력', v.execution]],
      '생산관리': [['운영기술', v.ops_skill], ['실행력', v.execution], ['체력', v.stamina], ['추론력', v.reasoning]],
      '품질관리·품질보증': [['추론력', v.reasoning], ['집중력', v.focus], ['도덕성', v.morality], ['실행력', v.execution]],
      '공정 엔지니어': [['공학감각', v.eng_sense], ['추론력', v.reasoning], ['실행력', v.execution], ['운영기술', v.ops_skill]],
      '설비 엔지니어': [['공학감각', v.eng_sense], ['실행력', v.execution], ['체력', v.stamina], ['적응력', v.adapt]],
      '총무·사무운영': [['운영기술', v.ops_skill], ['실행력', v.execution], ['안정욕', v.stability], ['사회기술', v.social_sk]],
      '인사·채용 운영': [['사회기술', v.social_sk], ['인문감각', v.hum_sense], ['운영기술', v.ops_skill], ['표현력', v.expression]],
      '고객상담·고객서비스': [['사회기술', v.social_sk], ['표현력', v.expression], ['정신력', v.mental], ['의지력', v.willpower]],
      '프롬프트 엔지니어': [['표현력', v.expression], ['창의연결력', v.creative_c], ['추론력', v.reasoning], ['적응력', v.adapt]],
      'AI 활용 컨설턴트': [['표현력', v.expression], ['공학감각', v.eng_sense], ['창의연결력', v.creative_c], ['적응력', v.adapt]],
    };

    const categoryDefaults = {
      '외모기반': [['외모', v.looks], ['표현력', v.expression], ['사회기술', v.social_sk], ['분위기연출력', v.style]],
      '영업비즈니스': [['사회기술', v.social_sk], ['표현력', v.expression], ['실행력', v.execution], ['위험선호', v.risk_pref]],
      'IT공학': [['공학감각', v.eng_sense], ['추론력', v.reasoning], ['실행력', v.execution], ['창의연결력', v.creative_c]],
      '연구의료법': [['추론력', v.reasoning], ['의지력', v.willpower], ['도덕성', v.morality], ['정신력', v.mental]],
      '예술창작': [['예술감각', v.art_sense], ['창의연결력', v.creative_c], ['예술표현기술', v.art_expr], ['표현력', v.expression]],
      '스포츠': [['체력', v.stamina], ['신체재능', v.body_skill], ['의지력', v.willpower], ['정신력', v.mental]],
      '미디어': [['표현력', v.expression], ['창의연결력', v.creative_c], ['인문감각', v.hum_sense], ['사회기술', v.social_sk]],
      '교육사회': [['인문감각', v.hum_sense], ['사회기술', v.social_sk], ['도덕성', v.morality], ['표현력', v.expression]],
      '공공군사': [['도덕성', v.morality], ['추론력', v.reasoning], ['의지력', v.willpower], ['사회기술', v.social_sk]],
      '기능노동': [['공학감각', v.eng_sense], ['실행력', v.execution], ['체력', v.stamina], ['운영기술', v.ops_skill]],
      '물류서비스': [['실행력', v.execution], ['사회기술', v.social_sk], ['적응력', v.adapt], ['정신력', v.mental]],
      '농수산': [['체력', v.stamina], ['의지력', v.willpower], ['실행력', v.execution], ['적응력', v.adapt]],
      '신종직종': [['적응력', v.adapt], ['창의연결력', v.creative_c], ['표현력', v.expression], ['공학감각', v.eng_sense]],
      '회색지대': [['사회기술', v.social_sk], ['표현력', v.expression], ['위험선호', v.risk_pref], ['도덕성', 100-v.morality]],
    };

    return pickTopSignals(overrides[name] || categoryDefaults[cat] || [['실행력', v.execution], ['추론력', v.reasoning], ['사회기술', v.social_sk]]);
  };

  // charm bonus: 직업별로 맞는 매력 아키타입이면 +보너스
  const charmBonus=(targets)=>targets.includes(cm)||targets.includes(cs)?8:0;

  const A=[];
  const add=(cat,n,c,era,baseFit,w,warn=false)=>{
    if(!era) return;
    const fit=Math.min(100,Math.round(baseFit+charmBonus(w.split('').length>0?[]:[])));
    A.push({cat,n,c,fit:C(baseFit),w,warn,signals:getCareerSignals(cat,n)});
  };

  const avg=(...xs)=>xs.reduce((a,b)=>a+b,0)/xs.length;

  // ─── 외모기반 ───────────────────────────────────────
  add('외모기반','모델·광고모델','#e87ab0',true,avg(v.looks*0.45,v.social_sk*0.25,v.art_sense*0.15,v.execution*0.15),'외모가 핵심 자산. 사회성으로 계약 전환');
  add('외모기반','배우·영화배우','#e87ab0',true,avg(v.looks*0.30,v.art_expr*0.28,v.social_sk*0.20,v.mental*0.12,v.expression*0.10),'외모+연기+멘탈. 데뷔 자체가 운의 영역');
  add('외모기반','아이돌·가수','#e87ab0',true,avg(v.looks*0.25,v.art_sense*0.28,v.stamina*0.20,v.social_sk*0.15,v.willpower*0.12),'외모+음악재능+체력. 훈련 의지력이 데뷔 결정');
  add('외모기반','아나운서','#e87ab0',true,avg(v.looks*0.20,v.expression*0.42,v.social_sk*0.23,v.mental*0.15),'언어력+외모+정신력');
  add('외모기반','유튜버·크리에이터','#e87ab0',dig,avg(v.looks*0.10,v.creative_c*0.28,v.expression*0.27,v.execution*0.20,v.social_sk*0.15),'콘텐츠력이 외모보다 중요');
  add('외모기반','틱토커·숏폼','#e87ab0',mod,avg(v.looks*0.20,v.creative_c*0.30,v.execution*0.25,v.adapt*0.25),'빠른 실행+창의성+트렌드 적응');
  add('외모기반','인터넷 방송·BJ','#e87ab0',dig,avg(v.social_sk*0.32,v.expression*0.28,v.creative_c*0.25,v.looks*0.15),'사회성+언어력. 시청자 관계 유지');
  add('외모기반','웨딩·행사 사회자','#e87ab0',true,avg(v.looks*0.18,v.expression*0.40,v.social_sk*0.27,v.execution*0.15),'외모+언어력+현장 대응');
  add('외모기반','패션 모델','#e87ab0',true,avg(v.looks*0.55,v.stamina*0.25,v.style*0.20),'외모+체형+분위기');
  add('외모기반','쇼핑호스트','#e87ab0',true,avg(v.expression*0.38,v.social_sk*0.25,v.execution*0.22,v.looks*0.15),'언어력+사회성. 실시간 판매');
  if(lH&&mL&&iM) add('외모기반','기둥서방·결혼사기','#e05a5a',true,avg(v.looks*0.45,v.social_sk*0.30,(100-v.morality)*0.25),'외모+사회성으로 착취 경로',true);
  if(lH&&mL&&iF) add('외모기반','꽃뱀·결혼사기','#e05a5a',true,avg(v.looks*0.45,v.social_sk*0.30,(100-v.morality)*0.25),'외모+사회성으로 이득 추구',true);
  if(lH&&mL)     add('외모기반','성인 콘텐츠·유흥업','#e05a5a',true,avg(v.looks*0.55,v.risk_pref*0.25,(100-v.morality)*0.20),'외모 자본 직접 현금화',true);
  if(lH&&mM)     add('외모기반','호스트바·유흥 종사','#e87ab0',true,avg(v.looks*0.40,v.social_sk*0.35,v.expression*0.25),'외모+사회성');
  if(lH&&v.family_bg>=65) add('외모기반','상류층 결혼','#c9a84c',true,avg(v.looks*0.40,v.social_sk*0.30,v.family_bg*0.20,v.expression*0.10),'외모+배경 계층 상승');

  // ─── 영업·비즈니스 ──────────────────────────────────
  add('영업비즈니스','영업·세일즈','#4eb87a',true,avg(v.social_sk*0.30,v.expression*0.25,v.execution*0.20,v.adapt*0.15,v.looks*0.10),'사회성·언어력·실행력이 직접 수익');
  add('영업비즈니스','창업·스타트업','#c9a84c',true,avg(v.execution*0.25,v.risk_pref*0.25,v.adapt*0.20,v.social_sk*0.15,v.creative_c*0.15),'실행력+리스크. 적응력으로 피벗');
  add('영업비즈니스','마케터·브랜드 전략','#4eb87a',true,avg(v.creative_c*0.28,v.social_sk*0.25,v.expression*0.27,v.hum_sense*0.20),'창의성+언어력+인간 심리');
  add('영업비즈니스','보험설계사','#4eb87a',true,avg(v.social_sk*0.35,v.expression*0.30,v.willpower*0.20,v.morality*0.15),'끈질긴 사회성. 거절 의지');
  add('영업비즈니스','부동산 중개·투자','#c9a84c',pre00,avg(v.risk_pref*0.28,v.social_sk*0.25,v.family_bg*0.27,v.execution*0.20),'초기 자본+리스크. 인맥');
  add('영업비즈니스','주식·파생 트레이더','#c9a84c',true,avg(v.reasoning*0.28,v.risk_pref*0.35,v.mental*0.22,v.adapt*0.15),'분석력+리스크. 냉철한 정신력');
  add('영업비즈니스','펀드매니저·애널리스트','#5a9ef0',true,avg(v.reasoning*0.35,v.eng_sense*0.25,v.mental*0.20,v.adapt*0.20),'고도 분석력+극한 스트레스 내성');
  add('영업비즈니스','자영업·요식업','#c9a84c',true,avg(v.execution*0.30,v.stamina*0.25,v.willpower*0.25,v.social_sk*0.20),'실행력+체력+끈기');
  add('영업비즈니스','카페·베이커리 창업','#c9a84c',true,avg(v.execution*0.28,v.art_sense*0.22,v.willpower*0.25,v.social_sk*0.25),'실행력+예술감각');
  add('영업비즈니스','프랜차이즈 창업','#c9a84c',true,avg(v.execution*0.30,v.family_bg*0.25,v.willpower*0.25,v.adapt*0.20),'초기 자본+실행력');
  add('영업비즈니스','재테크 강사·유튜버','#c9a84c',mod,avg(v.expression*0.30,v.social_sk*0.25,v.risk_pref*0.20,v.creative_c*0.25),'콘텐츠력+금융 감각');
  add('영업비즈니스','무역·수출입 영업','#4eb87a',true,avg(v.social_sk*0.28,v.expression*0.28,v.adapt*0.22,v.execution*0.22),'언어력+사회성. 국제 감각');
  add('영업비즈니스','기업 컨설턴트','#5a9ef0',true,avg(v.reasoning*0.28,v.expression*0.27,v.hum_sense*0.23,v.social_sk*0.22),'분석력+언어력. 구조화 능력');
  add('영업비즈니스','기술영업','#3db8a8',webEra,avg(v.eng_sense*0.28,v.expression*0.27,v.social_sk*0.25,v.execution*0.20),'기술 이해+설득력. B2B 실무형');
  add('영업비즈니스','솔루션 컨설턴트','#5a9ef0',entryYear>=2005,avg(v.reasoning*0.28,v.expression*0.26,v.eng_sense*0.24,v.social_sk*0.22),'분석력+설명력. 문제를 구조로 푸는 직무');
  add('영업비즈니스','고객성공 매니저','#4eb87a',platformEra,avg(v.social_sk*0.30,v.expression*0.27,v.ops_skill*0.23,v.empathy*0.20),'관계 유지+실무 조율. 장기 고객 관리');
  add('영업비즈니스','헤드헌터','#4eb87a',true,avg(v.social_sk*0.35,v.hum_sense*0.25,v.expression*0.25,v.execution*0.15),'사람 읽기+네트워크');
  add('영업비즈니스','광고 AE·기획','#4eb87a',true,avg(v.social_sk*0.28,v.creative_c*0.27,v.expression*0.25,v.execution*0.20),'사회성+창의성+실행력');
  add('영업비즈니스','구매·SCM','#5a9ef0',entryYear>=1995,avg(v.reasoning*0.27,v.ops_skill*0.28,v.execution*0.25,v.adapt*0.20),'운영 감각+조율 능력. 공급망 실무');
  add('영업비즈니스','다단계 판매','#e05a5a',true,avg(v.social_sk*0.40,v.expression*0.30,(100-v.morality)*0.15,v.execution*0.15),'사회성+언어력. 도덕 경계 모호',true);
  add('영업비즈니스','경매사','#c9a84c',true,avg(v.expression*0.35,v.social_sk*0.28,v.hum_sense*0.20,v.adapt*0.17),'언어력+순발력');

  // ─── IT·공학 ─────────────────────────────────────────
  add('IT공학','개발자·소프트웨어 엔지니어','#3db8a8',dig,avg(v.eng_sense*0.35,v.reasoning*0.30,v.execution*0.20,v.creative_c*0.15),'공학감각+지능. 실행력이 생산성');
  add('IT공학','AI·머신러닝 엔지니어','#3db8a8',entryYear>=2015,avg(v.eng_sense*0.30,v.reasoning*0.35,v.creative_c*0.20,v.willpower*0.15),'수학적 직관+고도 지능');
  add('IT공학','데이터 사이언티스트','#3db8a8',entryYear>=2010,avg(v.eng_sense*0.35,v.reasoning*0.30,v.creative_c*0.20,v.expression*0.15),'통계+프로그래밍+비즈니스 언어');
  add('IT공학','IT 창업가','#3db8a8',dig,avg(v.eng_sense*0.25,v.execution*0.25,v.risk_pref*0.25,v.creative_c*0.25),'기술+실행+리스크');
  add('IT공학','게임 개발자','#3db8a8',dig,avg(v.eng_sense*0.30,v.creative_c*0.30,v.art_sense*0.20,v.willpower*0.20),'공학+예술감각');
  add('IT공학','프로게이머','#4eb87a',entryYear>=2000,avg(v.body_skill*0.25,v.mental*0.25,v.willpower*0.25,v.adapt*0.15,v.focus*0.10),'신체재능+정신력+의지력. 1만 시간');
  add('IT공학','게임 스트리머','#4eb87a',platformEra,avg(v.social_sk*0.30,v.expression*0.25,v.creative_c*0.25,v.adapt*0.20),'엔터테인먼트+언어력');
  add('IT공학','사이버보안 전문가','#3db8a8',dig,avg(v.eng_sense*0.35,v.reasoning*0.30,v.creative_c*0.20,v.morality*0.15),'공학+창의적 해킹+윤리');
  add('IT공학','전자·반도체 엔지니어','#3db8a8',true,avg(v.eng_sense*0.40,v.reasoning*0.30,v.willpower*0.20,v.execution*0.10),'공학감각 절대적');
  add('IT공학','클라우드·DevOps','#3db8a8',entryYear>=2010,avg(v.eng_sense*0.33,v.reasoning*0.27,v.execution*0.25,v.adapt*0.15),'자동화+시스템 사고');
  add('IT공학','UX·UI 디자이너','#a594ff',entryYear>=2005,avg(v.art_sense*0.30,v.eng_sense*0.28,v.hum_sense*0.22,v.creative_c*0.20),'예술+공학+인간 이해');
  add('IT공학','프롬프트 엔지니어','#3db8a8',aiEra,avg(v.expression*0.32,v.creative_c*0.28,v.reasoning*0.25,v.adapt*0.15),'언어력+창의성. AI 최적화');
  add('IT공학','블록체인 개발자','#3db8a8',cryptoEra,avg(v.eng_sense*0.35,v.reasoning*0.30,v.risk_pref*0.20,v.creative_c*0.15),'공학감각+리스크 마인드');
  add('IT공학','QA 엔지니어','#3db8a8',dig,avg(v.eng_sense*0.32,v.reasoning*0.28,v.morality*0.22,v.execution*0.18),'꼼꼼함+공학. 품질 기준');
  add('IT공학','프로덕트 매니저','#5a9ef0',entryYear>=2010,avg(v.reasoning*0.25,v.expression*0.26,v.hum_sense*0.24,v.execution*0.25),'문제정의+조율+실행. 제품 방향 설정');
  add('IT공학','프로젝트 매니저','#5a9ef0',entryYear>=2000,avg(v.ops_skill*0.28,v.execution*0.27,v.expression*0.23,v.social_sk*0.22),'운영 조율+실행 통제. 일정과 사람 관리');
  add('IT공학','임베디드 시스템','#3db8a8',true,avg(v.eng_sense*0.42,v.reasoning*0.28,v.execution*0.20,v.willpower*0.10),'하드웨어+소프트웨어 경계');
  add('IT공학','IT 강사·부트캠프','#3db8a8',dig,avg(v.expression*0.30,v.eng_sense*0.28,v.social_sk*0.25,v.execution*0.17),'기술+언어력+가르치는 능력');
  add('IT공학','드론·로봇 엔지니어','#3db8a8',mod,avg(v.eng_sense*0.38,v.body_skill*0.22,v.execution*0.25,v.creative_c*0.15),'공학+신체 감각');

  // ─── 연구·의료·법 ────────────────────────────────────
  add('연구의료법','연구자·과학자','#5a9ef0',true,avg(v.reasoning*0.35,v.eng_sense*0.25,v.willpower*0.20,v.creative_c*0.20),'지능+공학감각+장기 집중력');
  add('연구의료법','의사','#5a9ef0',true,avg(v.reasoning*0.35,v.willpower*0.25,v.morality*0.20,v.mental*0.20),'지능+의지력+도덕성');
  add('연구의료법','치과의사','#5a9ef0',true,avg(v.reasoning*0.32,v.willpower*0.25,v.body_skill*0.18,v.execution*0.25),'지능+손 숙련도');
  add('연구의료법','한의사','#5a9ef0',true,avg(v.reasoning*0.30,v.hum_sense*0.25,v.willpower*0.25,v.morality*0.20),'인문감각+지능');
  add('연구의료법','수의사','#5a9ef0',true,avg(v.reasoning*0.32,v.morality*0.25,v.willpower*0.23,v.stamina*0.20),'지능+도덕성+체력');
  add('연구의료법','약사','#5a9ef0',true,avg(v.reasoning*0.35,v.willpower*0.30,v.morality*0.20,v.execution*0.15),'지능+의지력. 안정 전문직');
  add('연구의료법','간호사','#5a9ef0',true,avg(v.morality*0.25,v.stamina*0.25,v.mental*0.25,v.execution*0.25),'도덕+체력+정신력');
  add('연구의료법','물리치료사','#5a9ef0',true,avg(v.stamina*0.28,v.morality*0.25,v.social_sk*0.25,v.execution*0.22),'체력+도덕성+사회성');
  add('연구의료법','임상심리사','#a594ff',true,avg(v.hum_sense*0.35,v.social_sk*0.28,v.morality*0.22,v.expression*0.15),'인간 심리+공감');
  add('연구의료법','법조인·변호사','#5a9ef0',true,avg(v.reasoning*0.30,v.expression*0.30,v.hum_sense*0.20,v.willpower*0.20),'논리력+언어력');
  add('연구의료법','판사·검사','#5a9ef0',true,avg(v.reasoning*0.32,v.morality*0.28,v.expression*0.22,v.mental*0.18),'지능+도덕성+언어력');
  add('연구의료법','특허·변리사','#5a9ef0',true,avg(v.eng_sense*0.32,v.reasoning*0.30,v.expression*0.22,v.willpower*0.16),'공학+법률');
  add('연구의료법','세무사·회계사','#5a9ef0',true,avg(v.reasoning*0.30,v.willpower*0.28,v.execution*0.25,v.morality*0.17),'수치 감각+의지력');
  add('연구의료법','감정평가사','#5a9ef0',true,avg(v.reasoning*0.28,v.eng_sense*0.25,v.hum_sense*0.25,v.execution*0.22),'분석력+인문감각');
  add('연구의료법','노무사','#5a9ef0',true,avg(v.hum_sense*0.30,v.expression*0.28,v.morality*0.25,v.social_sk*0.17),'인문감각+도덕성');
  add('연구의료법','교수·연구원','#5a9ef0',true,avg(v.reasoning*0.35,comp.creativity*0.25,v.creative_c*0.20,v.expression*0.20),'지식 깊이+창의성');
  add('연구의료법','응급구조사','#5a9ef0',true,avg(v.stamina*0.35,v.mental*0.28,v.execution*0.22,v.morality*0.15),'체력+정신력. 순간 판단');
  add('연구의료법','영양사·식품 연구','#5a9ef0',true,avg(v.reasoning*0.30,v.willpower*0.28,v.morality*0.22,v.execution*0.20),'지능+의지력');
  add('연구의료법','언어치료사','#5a9ef0',true,avg(v.expression*0.32,v.morality*0.25,v.social_sk*0.25,v.execution*0.18),'언어력+도덕성');
  add('연구의료법','법무사·행정사','#5a9ef0',true,avg(v.reasoning*0.28,v.willpower*0.28,v.execution*0.25,v.morality*0.19),'지능+의지력');
  add('연구의료법','임상병리사','#5a9ef0',true,avg(v.reasoning*0.30,v.execution*0.27,v.morality*0.23,v.focus*0.20),'정확성+집중력. 검사 실무');
  add('연구의료법','방사선사','#5a9ef0',true,avg(v.reasoning*0.28,v.execution*0.25,v.body_skill*0.22,v.morality*0.25),'정확성+숙련도. 영상 장비 운용');
  add('연구의료법','작업치료사','#5a9ef0',true,avg(v.social_sk*0.25,v.morality*0.25,v.execution*0.24,v.hum_sense*0.26),'공감+실행. 재활 보조 실무');
  add('연구의료법','병원행정','#5a9ef0',true,avg(v.ops_skill*0.30,v.execution*0.25,v.social_sk*0.23,v.morality*0.22),'운영 감각+정확성. 의료 시스템 실무');

  // ─── 예술·창작 ──────────────────────────────────────
  add('예술창작','화가·조각가','#a594ff',true,avg(v.art_sense*0.45,v.creative_c*0.30,v.willpower*0.15,v.mental*0.10),'예술감각 절대적. 무명 버팀목');
  add('예술창작','음악가·작곡가','#a594ff',true,avg(v.art_sense*0.40,v.creative_c*0.30,v.hum_sense*0.15,v.willpower*0.15),'예술감각+창의성');
  add('예술창작','소설가·작가','#a594ff',true,avg(v.hum_sense*0.35,v.expression*0.30,v.creative_c*0.25,v.art_sense*0.10),'인문감각+언어력');
  add('예술창작','시나리오 작가','#a594ff',true,avg(v.hum_sense*0.30,v.creative_c*0.30,v.expression*0.25,v.art_sense*0.15),'인문+창의+언어');
  add('예술창작','영화감독','#a594ff',true,avg(v.art_sense*0.28,v.hum_sense*0.25,v.creative_c*0.25,v.social_sk*0.22),'예술+인문+지휘력');
  add('예술창작','뮤지컬·무대 배우','#a594ff',true,avg(v.art_expr*0.35,v.stamina*0.22,v.social_sk*0.23,v.mental*0.20),'예술표현+체력+정신력');
  add('예술창작','성우·더빙','#a594ff',true,avg(v.expression*0.40,v.art_sense*0.28,v.creative_c*0.22,v.execution*0.10),'언어력+예술감각');
  add('예술창작','그래픽 디자이너','#a594ff',true,avg(v.art_sense*0.38,v.creative_c*0.28,v.execution*0.22,v.eng_sense*0.12),'예술감각+창의성');
  add('예술창작','건축가','#a594ff',true,avg(v.eng_sense*0.35,v.art_sense*0.30,v.reasoning*0.20,v.execution*0.15),'공학+예술 정교한 결합');
  add('예술창작','패션 디자이너','#a594ff',true,avg(v.art_sense*0.40,v.creative_c*0.30,v.social_sk*0.15,v.execution*0.15),'예술+창의성');
  add('예술창작','사진작가','#a594ff',true,avg(v.art_sense*0.38,v.creative_c*0.28,v.adapt*0.20,v.execution*0.14),'예술+창의성. 현장 적응');
  add('예술창작','웹툰·만화 작가','#a594ff',dig,avg(v.art_sense*0.35,v.creative_c*0.30,v.willpower*0.20,v.execution*0.15),'예술+창의+연재 의지');
  add('예술창작','일러스트레이터','#a594ff',true,avg(v.art_sense*0.40,v.creative_c*0.30,v.execution*0.20,v.adapt*0.10),'예술+창의');
  add('예술창작','개그맨·코미디언','#e87ab0',true,avg(v.creative_c*0.32,v.social_sk*0.30,v.hum_sense*0.25,v.mental*0.13),'창의+사회성+인간 이해');
  add('예술창작','마술사·퍼포머','#a594ff',true,avg(v.creative_c*0.30,v.execution*0.28,v.social_sk*0.25,v.stamina*0.17),'창의+실행+사회성');
  add('예술창작','요리사·셰프','#c9a84c',true,avg(v.art_sense*0.28,v.execution*0.30,v.stamina*0.22,v.creative_c*0.20),'예술+실행+체력');
  add('예술창작','바리스타','#c9a84c',true,avg(v.art_sense*0.30,v.execution*0.30,v.social_sk*0.22,v.willpower*0.18),'예술+실행. 미각·후각 감수성');
  add('예술창작','제빵사·파티시에','#c9a84c',true,avg(v.art_sense*0.32,v.execution*0.30,v.willpower*0.22,v.stamina*0.16),'예술+실행. 새벽 노동');
  add('예술창작','플로리스트·인테리어','#a594ff',true,avg(v.art_sense*0.40,v.creative_c*0.28,v.execution*0.20,v.social_sk*0.12),'예술+창의. 공간 감각');
  add('예술창작','NFT 아티스트','#a594ff',cryptoEra,avg(v.art_sense*0.35,v.creative_c*0.30,v.eng_sense*0.20,v.risk_pref*0.15),'예술+공학+리스크');

  // ─── 스포츠 ─────────────────────────────────────────
  add('스포츠','프로 스포츠 선수','#4eb87a',true,avg(v.stamina*0.40,v.willpower*0.30,v.mental*0.15,v.body_skill*0.15),'체력+의지+신체재능');
  add('스포츠','격투기·무술가','#4eb87a',true,avg(v.stamina*0.35,v.body_skill*0.25,v.mental*0.25,v.willpower*0.15),'체력+신체재능+정신력');
  add('스포츠','스포츠 지도자·코치','#4eb87a',true,avg(v.hum_sense*0.28,v.social_sk*0.27,v.expression*0.25,v.adapt*0.20),'인간 이해+지도력');
  add('스포츠','스포츠 에이전트','#4eb87a',dig,avg(v.social_sk*0.35,v.expression*0.25,v.risk_pref*0.20,v.adapt*0.20),'협상력+네트워크');
  add('스포츠','피트니스 트레이너','#4eb87a',true,avg(v.stamina*0.35,v.social_sk*0.28,v.expression*0.22,v.morality*0.15),'체력+사회성');
  add('스포츠','스포츠 해설위원','#4eb87a',dig,avg(v.expression*0.38,v.hum_sense*0.25,v.social_sk*0.22,v.adapt*0.15),'언어력+스포츠 이해');
  add('스포츠','스턴트맨','#4eb87a',true,avg(v.stamina*0.40,v.body_skill*0.28,v.mental*0.18,v.risk_pref*0.14),'체력+신체재능+리스크');
  add('스포츠','e스포츠 감독','#4eb87a',entryYear>=2005,avg(v.hum_sense*0.28,v.social_sk*0.28,v.adapt*0.25,v.expression*0.19),'전략분석+지도력');
  add('스포츠','스포츠 마케터','#4eb87a',dig,avg(v.social_sk*0.30,v.creative_c*0.25,v.expression*0.25,v.execution*0.20),'사회성+창의성');
  add('스포츠','레저 스포츠 강사','#4eb87a',true,avg(v.stamina*0.35,v.social_sk*0.30,v.expression*0.20,v.execution*0.15),'체력+사회성');

  // ─── 미디어 ──────────────────────────────────────────
  add('미디어','PD·방송 연출','#e87ab0',true,avg(v.creative_c*0.28,v.hum_sense*0.27,v.expression*0.25,v.social_sk*0.20),'콘텐츠기획+인간이해');
  add('미디어','방송작가','#e87ab0',true,avg(v.expression*0.32,v.creative_c*0.28,v.hum_sense*0.25,v.execution*0.15),'언어력+창의성');
  add('미디어','저널리스트·기자','#e87ab0',true,avg(v.hum_sense*0.32,v.expression*0.30,v.morality*0.20,v.execution*0.18),'인문+언어+도덕성');
  add('미디어','광고 크리에이티브','#e87ab0',true,avg(v.creative_c*0.35,v.expression*0.25,v.art_sense*0.25,v.hum_sense*0.15),'창의+언어+예술');
  add('미디어','PR·홍보 전문가','#e87ab0',true,avg(v.social_sk*0.30,v.expression*0.30,v.adapt*0.20,v.creative_c*0.20),'사회성+언어력');
  add('미디어','번역가·통역사','#e87ab0',true,avg(v.expression*0.42,v.hum_sense*0.28,v.reasoning*0.18,v.execution*0.12),'언어력 절대적');
  add('미디어','출판 편집자','#e87ab0',true,avg(v.expression*0.35,v.hum_sense*0.30,v.execution*0.22,v.morality*0.13),'언어+인문');
  add('미디어','영상 편집자','#e87ab0',dig,avg(v.art_sense*0.28,v.execution*0.30,v.creative_c*0.25,v.eng_sense*0.17),'예술+실행+공학');
  add('미디어','팟캐스터','#e87ab0',dig,avg(v.expression*0.33,v.hum_sense*0.27,v.creative_c*0.23,v.execution*0.17),'언어력+창의성');

  // ─── 교육·사회서비스 ─────────────────────────────────
  add('교육사회','교사·교육자','#4eb87a',true,avg(v.expression*0.28,v.morality*0.25,v.hum_sense*0.27,v.social_sk*0.20),'언어+인문+도덕');
  add('교육사회','학원 강사','#4eb87a',true,avg(v.expression*0.30,v.reasoning*0.25,v.social_sk*0.25,v.execution*0.20),'언어력+지능');
  add('교육사회','입시 컨설턴트','#4eb87a',dig,avg(v.hum_sense*0.28,v.social_sk*0.28,v.expression*0.25,v.reasoning*0.19),'인문+사회성');
  add('교육사회','보육교사','#4eb87a',true,avg(v.morality*0.35,v.social_sk*0.30,v.mental*0.20,v.stamina*0.15),'도덕+사회성+정신력');
  add('교육사회','사회복지사','#4eb87a',true,avg(v.morality*0.32,v.social_sk*0.30,v.mental*0.22,v.hum_sense*0.16),'도덕+사회성+정신력');
  add('교육사회','심리상담사','#a594ff',true,avg(v.hum_sense*0.35,v.social_sk*0.28,v.morality*0.22,v.expression*0.15),'심리+공감+도덕');
  add('교육사회','종교인·목사·스님','#a594ff',true,avg(v.hum_sense*0.28,v.social_sk*0.28,v.expression*0.27,v.morality*0.17),'인문+언어+도덕');
  add('교육사회','무속인·역술가','#a594ff',true,avg(v.hum_sense*0.30,v.social_sk*0.30,v.expression*0.25,(v.morality<50?15:0)),'심리+설득력. 도덕 모호');
  add('교육사회','NGO·국제 활동가','#4eb87a',dig,avg(v.morality*0.32,v.expression*0.27,v.hum_sense*0.25,v.adapt*0.16),'도덕+언어+적응력');
  add('교육사회','학교 상담교사','#4eb87a',true,avg(v.hum_sense*0.32,v.social_sk*0.28,v.morality*0.25,v.expression*0.15),'인문+사회성+도덕');
  add('교육사회','미술·음악 치료사','#a594ff',true,avg(v.art_sense*0.30,v.morality*0.28,v.social_sk*0.27,v.hum_sense*0.15),'예술+도덕+사회성');
  add('교육사회','사회적 기업가','#4eb87a',dig,avg(v.morality*0.28,v.social_sk*0.28,v.execution*0.22,v.creative_c*0.22),'도덕+사회+실행');

  // ─── 공공·군사 ────────────────────────────────────────
  add('공공군사','정치인·국회의원','#e05a5a',true,avg(v.social_sk*0.25,v.expression*0.25,v.hum_sense*0.20,v.adapt*0.15,v.morality*0.15),'대중 설득+인문');
  add('공공군사','공무원·행정관료','#5a9ef0',true,avg(v.reasoning*0.25,v.willpower*0.30,v.morality*0.25,v.adapt*0.20),'안정+의지력+도덕');
  add('공공군사','외교관','#5a9ef0',true,avg(v.expression*0.30,v.social_sk*0.25,v.reasoning*0.25,v.hum_sense*0.20),'언어+사회성+지능');
  add('공공군사','군인·장교','#3db8a8',true,avg(v.stamina*0.30,v.willpower*0.25,v.mental*0.25,v.morality*0.20),'체력+의지+정신');
  add('공공군사','경찰·형사','#3db8a8',true,avg(v.stamina*0.25,v.morality*0.25,v.social_sk*0.25,v.mental*0.25),'체력+도덕+사회성');
  add('공공군사','소방관·구조대원','#3db8a8',true,avg(v.stamina*0.40,v.mental*0.25,v.morality*0.20,v.execution*0.15),'체력+정신+도덕');
  add('공공군사','교도관','#3db8a8',true,avg(v.stamina*0.28,v.mental*0.28,v.morality*0.25,v.social_sk*0.19),'체력+정신+도덕');
  add('공공군사','지방의원','#e05a5a',true,avg(v.social_sk*0.30,v.hum_sense*0.25,v.expression*0.25,v.morality*0.20),'지역사회성+인문');
  add('공공군사','세관·국세청','#5a9ef0',true,avg(v.morality*0.30,v.reasoning*0.28,v.execution*0.25,v.mental*0.17),'도덕+지능');
  add('공공군사','공기업 실무','#5a9ef0',entryYear>=1990,avg(v.reasoning*0.26,v.execution*0.26,v.morality*0.24,v.stability*0.24),'안정지향+실무 정확성. 중간층 선호');
  add('공공군사','정책연구원','#5a9ef0',entryYear>=2000,avg(v.reasoning*0.30,v.hum_sense*0.24,v.expression*0.23,v.morality*0.23),'분석력+인문 감각. 공공 문제 연구');
  add('공공군사','감사·심사 실무','#5a9ef0',entryYear>=1995,avg(v.reasoning*0.28,v.morality*0.28,v.execution*0.24,v.self_ctrl*0.20),'정확성+도덕성. 규정과 리스크 관리');

  // ─── 기능·기술 ────────────────────────────────────────
  add('기능노동','전기기사','#888',true,avg(v.eng_sense*0.38,v.stamina*0.28,v.execution*0.22,v.willpower*0.12),'공학+체력. 안전 실행력');
  add('기능노동','배관공·설비 기술자','#888',true,avg(v.eng_sense*0.32,v.stamina*0.32,v.execution*0.24,v.adapt*0.12),'공학+체력+실행');
  add('기능노동','용접공','#888',true,avg(v.eng_sense*0.30,v.stamina*0.32,v.execution*0.28,v.willpower*0.10),'공학+체력. 정밀 실행');
  add('기능노동','자동차 정비사','#888',true,avg(v.eng_sense*0.35,v.stamina*0.28,v.execution*0.25,v.adapt*0.12),'공학+실행');
  add('기능노동','목수·가구 제작','#888',true,avg(v.art_sense*0.25,v.eng_sense*0.30,v.stamina*0.28,v.execution*0.17),'예술+공학+체력');
  add('기능노동','인테리어 시공','#888',true,avg(v.art_sense*0.22,v.eng_sense*0.28,v.stamina*0.28,v.execution*0.22),'예술+공학+체력');
  add('기능노동','미용사·헤어디자이너','#e87ab0',true,avg(v.art_sense*0.30,v.social_sk*0.28,v.execution*0.25,v.stamina*0.17),'예술+사회성+실행');
  add('기능노동','네일아티스트','#e87ab0',true,avg(v.art_sense*0.38,v.execution*0.28,v.social_sk*0.22,v.stamina*0.12),'예술+정밀 실행');
  add('기능노동','메이크업 아티스트','#e87ab0',true,avg(v.art_sense*0.38,v.execution*0.25,v.social_sk*0.25,v.creative_c*0.12),'예술+실행+사회성');
  add('기능노동','타투이스트','#a594ff',dig,avg(v.art_sense*0.40,v.execution*0.30,v.social_sk*0.20,v.creative_c*0.10),'예술+정밀 실행');
  add('기능노동','제조업 생산직','#888',true,avg(v.stamina*0.38,v.execution*0.32,v.willpower*0.22,v.mental*0.08),'체력+실행+의지');
  add('기능노동','안전 관리자','#3db8a8',true,avg(v.morality*0.28,v.eng_sense*0.27,v.execution*0.25,v.social_sk*0.20),'도덕+공학');
  add('기능노동','3D·CNC 기술자','#3db8a8',dig,avg(v.eng_sense*0.35,v.execution*0.30,v.creative_c*0.20,v.adapt*0.15),'공학+실행+창의');
  add('기능노동','생산관리','#5a9ef0',entryYear>=1990,avg(v.ops_skill*0.30,v.execution*0.27,v.stamina*0.23,v.reasoning*0.20),'운영 통제+실행력. 현장과 사무의 중간층');
  add('기능노동','품질관리·품질보증','#5a9ef0',entryYear>=1990,avg(v.reasoning*0.28,v.execution*0.24,v.morality*0.24,v.focus*0.24),'정확성+기준 준수. 품질 책임');
  add('기능노동','공정 엔지니어','#3db8a8',entryYear>=1995,avg(v.eng_sense*0.32,v.reasoning*0.27,v.execution*0.24,v.ops_skill*0.17),'공학 감각+공정 최적화');
  add('기능노동','설비 엔지니어','#3db8a8',entryYear>=1995,avg(v.eng_sense*0.33,v.execution*0.25,v.stamina*0.22,v.adapt*0.20),'공학+실행. 설비 유지와 복구');
  add('기능노동','항공기 정비사','#3db8a8',true,avg(v.eng_sense*0.40,v.morality*0.25,v.execution*0.25,v.willpower*0.10),'공학+도덕. 극한 정밀도');
  add('기능노동','귀금속·보석 세공','#a594ff',true,avg(v.art_sense*0.35,v.execution*0.32,v.stamina*0.18,v.willpower*0.15),'예술+정밀 실행');
  add('기능노동','조리사·급식','#c9a84c',true,avg(v.stamina*0.32,v.execution*0.32,v.willpower*0.22,v.art_sense*0.14),'체력+실행+의지');
  add('기능노동','도배사·타일 기술자','#888',true,avg(v.stamina*0.35,v.execution*0.32,v.willpower*0.22,v.adapt*0.11),'체력+실행+의지');
  add('기능노동','냉난방 공조 기술자','#888',true,avg(v.eng_sense*0.35,v.stamina*0.30,v.execution*0.25,v.adapt*0.10),'공학+체력');

  // ─── 물류·서비스 ────────────────────────────────────
  add('물류서비스','배달·라이더','#888',platformEra,avg(v.stamina*0.35,v.execution*0.30,v.adapt*0.25,v.risk_pref*0.10),'체력+실행. 플랫폼 노동');
  add('물류서비스','택배·물류 기사','#888',true,avg(v.stamina*0.38,v.execution*0.30,v.willpower*0.22,v.adapt*0.10),'체력+실행+의지');
  add('물류서비스','트럭 운전사','#888',true,avg(v.stamina*0.32,v.willpower*0.28,v.execution*0.28,v.mental*0.12),'체력+의지. 장거리 정신력');
  add('물류서비스','항공기 승무원','#e87ab0',true,avg(v.looks*0.25,v.social_sk*0.30,v.expression*0.25,v.mental*0.20),'외모+사회성+언어+정신력');
  add('물류서비스','파일럿','#5a9ef0',true,avg(v.eng_sense*0.30,v.mental*0.28,v.reasoning*0.25,v.morality*0.17),'공학+정신력+지능');
  add('물류서비스','선박 항해사','#5a9ef0',true,avg(v.eng_sense*0.32,v.mental*0.28,v.stamina*0.22,v.willpower*0.18),'공학+정신력');
  add('물류서비스','창고·물류 운영','#888',true,avg(v.execution*0.35,v.stamina*0.28,v.adapt*0.22,v.willpower*0.15),'실행+체력+적응');
  add('물류서비스','경비·보안 요원','#888',true,avg(v.stamina*0.30,v.mental*0.28,v.morality*0.25,v.execution*0.17),'체력+정신+도덕');
  add('물류서비스','고객상담·고객서비스','#888',callCenterEra,avg(v.social_sk*0.32,v.expression*0.30,v.mental*0.25,v.willpower*0.13),'사회성+언어. 감정 노동');
  add('물류서비스','총무·사무운영','#5a9ef0',entryYear>=1985,avg(v.execution*0.27,v.ops_skill*0.27,v.social_sk*0.23,v.stability*0.23),'실무 정리+조율 능력. 조직 유지형');
  add('물류서비스','인사·채용 운영','#5a9ef0',entryYear>=1995,avg(v.social_sk*0.27,v.hum_sense*0.24,v.ops_skill*0.25,v.expression*0.24),'사람 이해+실무 운영. 내부 조율형');
  add('물류서비스','호텔리어·관광 기획','#4eb87a',true,avg(v.social_sk*0.30,v.expression*0.28,v.execution*0.22,v.adapt*0.20),'사회성+언어+실행');
  add('물류서비스','여행 가이드','#4eb87a',true,avg(v.social_sk*0.30,v.expression*0.30,v.adapt*0.22,v.hum_sense*0.18),'사회성+언어+적응');
  add('물류서비스','부동산 개발·시행','#c9a84c',true,avg(v.risk_pref*0.30,v.family_bg*0.28,v.execution*0.25,v.social_sk*0.17),'리스크+자본+실행');

  // ─── 농수산·1차 ──────────────────────────────────────
  add('농수산','농업·귀농인','#4eb87a',true,avg(v.stamina*0.40,v.willpower*0.30,v.execution*0.20,v.adapt*0.10),'체력+의지. 자연과 싸우는 생존');
  add('농수산','스마트팜 운영','#4eb87a',smartEra,avg(v.eng_sense*0.28,v.stamina*0.25,v.execution*0.25,v.adapt*0.22),'공학+체력. 데이터 농업');
  add('농수산','수산업·어부','#4eb87a',true,avg(v.stamina*0.42,v.willpower*0.30,v.mental*0.18,v.risk_pref*0.10),'체력+의지. 극한 환경');
  add('농수산','축산업자','#4eb87a',true,avg(v.stamina*0.38,v.willpower*0.28,v.execution*0.24,v.morality*0.10),'체력+의지. 생명 책임');
  add('농수산','6차산업 농장','#4eb87a',entryYear>=2010,avg(v.creative_c*0.25,v.execution*0.28,v.stamina*0.25,v.social_sk*0.22),'창의+실행+체력');
  add('농수산','수산물 유통','#4eb87a',true,avg(v.social_sk*0.30,v.stamina*0.28,v.execution*0.25,v.adapt*0.17),'사회성+체력+실행');
  add('농수산','조경·산림 기술자','#4eb87a',true,avg(v.stamina*0.32,v.art_sense*0.25,v.execution*0.25,v.eng_sense*0.18),'체력+예술+공학');
  add('농수산','반려동물 훈련사','#4eb87a',petEra,avg(v.social_sk*0.28,v.morality*0.28,v.execution*0.25,v.stamina*0.19),'사회성+도덕');
  add('농수산','곤충 양식·미래 식품','#4eb87a',entryYear>=2015,avg(v.eng_sense*0.28,v.risk_pref*0.28,v.execution*0.25,v.adapt*0.19),'공학+리스크. 신산업');

  // ─── 신종직종 ─────────────────────────────────────────
  add('신종직종','가상자산 거래','#c9a84c',cryptoEra,avg(v.risk_pref*0.35,v.reasoning*0.28,v.adapt*0.22,v.mental*0.15),'리스크+분석. 극한 변동성');
  add('신종직종','디지털 노마드','#3db8a8',entryYear>=2015,avg(v.execution*0.28,v.adapt*0.28,v.expression*0.24,v.creative_c*0.20),'실행+적응+언어');
  add('신종직종','구독 큐레이터','#e87ab0',mod,avg(v.expression*0.32,v.hum_sense*0.28,v.creative_c*0.25,v.execution*0.15),'언어+인문+창의');
  add('신종직종','메타버스·VR 기획','#3db8a8',entryYear>=2020,avg(v.eng_sense*0.28,v.creative_c*0.28,v.art_sense*0.22,v.execution*0.22),'공학+창의+예술');
  add('신종직종','AI 활용 컨설턴트','#3db8a8',aiEra,avg(v.expression*0.28,v.eng_sense*0.27,v.creative_c*0.25,v.adapt*0.20),'AI이해+언어+적응');
  add('신종직종','ESG·지속가능성 컨설팅','#4eb87a',mod,avg(v.morality*0.30,v.hum_sense*0.28,v.expression*0.25,v.social_sk*0.17),'도덕+인문+언어');
  add('신종직종','라이브커머스 진행','#e87ab0',entryYear>=2020,avg(v.social_sk*0.30,v.expression*0.32,v.looks*0.18,v.execution*0.20),'사회성+언어+실행');
  add('신종직종','헬스 인플루언서','#4eb87a',platformEra,avg(v.stamina*0.28,v.social_sk*0.28,v.expression*0.25,v.looks*0.19),'체력+사회성+언어');
  add('신종직종','드론 조종사','#3db8a8',entryYear>=2015,avg(v.eng_sense*0.32,v.execution*0.30,v.body_skill*0.22,v.adapt*0.16),'공학+실행. 공간 지각');
  add('신종직종','반려동물 케어','#4eb87a',petEra,avg(v.morality*0.30,v.social_sk*0.28,v.execution*0.25,v.adapt*0.17),'도덕+사회성+실행');
  add('신종직종','유튜브 10만 미만','#888',platformEra,avg(v.creative_c*0.25,v.execution*0.25,v.willpower*0.30,v.adapt*0.20),'대부분 크리에이터의 현실');
  add('신종직종','구독형 코칭','#4eb87a',mod,avg(v.expression*0.30,v.hum_sense*0.28,v.social_sk*0.25,v.morality*0.17),'언어+인문+도덕');
  add('신종직종','리걸테크 기획','#5a9ef0',mod,avg(v.eng_sense*0.28,v.reasoning*0.27,v.expression*0.25,v.execution*0.20),'공학+법률+언어');

  // ─── 회색지대 ─────────────────────────────────────────
  if(v.morality<=22){
    add('회색지대','사기꾼·보이스피싱','#e05a5a',true,avg(v.social_sk*0.35,v.expression*0.30,(100-v.morality)*0.25,v.reasoning*0.10),'사회성+언어. 도덕 결여',true);
    add('회색지대','전세사기','#e05a5a',dig,avg(v.reasoning*0.28,v.social_sk*0.28,(100-v.morality)*0.28,v.execution*0.16),'지능+도덕 결여',true);
    add('회색지대','리딩방·불법 투자','#e05a5a',cryptoEra,avg(v.social_sk*0.30,v.expression*0.28,(100-v.morality)*0.27,v.risk_pref*0.15),'언어+도덕 결여',true);
    add('회색지대','조직폭력','#e05a5a',old||d<=1990,avg(v.stamina*0.30,v.risk_pref*0.30,(100-v.morality)*0.25,v.social_sk*0.15),'체력+리스크. 극저 도덕성',true);
    add('회색지대','마약 관련 범죄','#e05a5a',mod,avg(v.risk_pref*0.35,(100-v.morality)*0.35,v.social_sk*0.20,v.adapt*0.10),'리스크+도덕 결여',true);
  }


  // ─── 추가 직업 (200개 달성) ────────────────────────
  add('스포츠','수영·골프 강사','#4eb87a',true,avg(v.stamina*0.35,v.social_sk*0.28,v.expression*0.22,v.morality*0.15),'체력+사회성+전달력');
  add('공공군사','군무원·방위산업','#5a9ef0',true,avg(v.eng_sense*0.28,v.morality*0.25,v.willpower*0.27,v.execution*0.20),'공학+도덕. 공직 의지력');
  add('공공군사','소년원·교화 전문가','#4eb87a',true,avg(v.morality*0.32,v.social_sk*0.28,v.hum_sense*0.25,v.mental*0.15),'도덕+인문+정신력');
  add('기능노동','승강기 기술자','#888',true,avg(v.eng_sense*0.35,v.stamina*0.28,v.execution*0.25,v.morality*0.12),'공학+체력. 안전 책임감');
  add('기능노동','도장공·페인터','#888',true,avg(v.stamina*0.35,v.execution*0.32,v.art_sense*0.18,v.willpower*0.15),'체력+실행. 미적 감각');
  add('물류서비스','청소·시설 관리','#888',true,avg(v.stamina*0.38,v.execution*0.30,v.willpower*0.22,v.morality*0.10),'체력+실행. 성실한 의지력');
  add('물류서비스','카카오·플랫폼 기사','#888',platformEra,avg(v.stamina*0.30,v.adapt*0.30,v.social_sk*0.25,v.execution*0.15),'체력+적응력. 플랫폼 생태계');
  add('농수산','임업·산림 관리','#4eb87a',true,avg(v.stamina*0.38,v.willpower*0.28,v.execution*0.22,v.eng_sense*0.12),'체력+의지+공학');
  add('신종직종','탄소·환경 컨설팅','#4eb87a',entryYear>=2020,avg(v.morality*0.28,v.eng_sense*0.27,v.expression*0.25,v.execution*0.20),'도덕+공학+언어');
  add('신종직종','구독형 뉴스레터','#e87ab0',platformEra,avg(v.expression*0.32,v.hum_sense*0.28,v.creative_c*0.25,v.execution*0.15),'언어+인문+창의');
  add('신종직종','AI 아트 디렉터','#a594ff',aiEra,avg(v.art_sense*0.35,v.creative_c*0.30,v.eng_sense*0.20,v.execution*0.15),'예술+창의+AI활용');
  add('신종직종','헬스케어 IT 기획','#3db8a8',entryYear>=2015,avg(v.eng_sense*0.28,v.hum_sense*0.25,v.expression*0.25,v.execution*0.22),'공학+인문. 의료IT');
  add('미디어','포토그래퍼·영상 기자','#e87ab0',true,avg(v.art_sense*0.28,v.execution*0.28,v.adapt*0.25,v.social_sk*0.19),'예술+실행. 현장 적응');
  add('교육사회','다문화 지원 활동가','#4eb87a',true,avg(v.morality*0.30,v.expression*0.28,v.social_sk*0.25,v.adapt*0.17),'도덕+언어+적응');

    return A.sort((a,b)=>b.fit-a.fit);
}

// ══════════════════════════════════════════════════════
// 16. VERDICT
// ══════════════════════════════════════════════════════
function getVerdict(human, success, comp, v, careers){
  const d=parseInt(decade);
  const top=careers[0];
  const wp=DECADES[decade].wp;
  const labels=human.labels.map(l=>l.l).join(' + ');

  if(top?.warn&&v.morality<=20) return {type:'회색지대 경로 — 규범 밖의 인생',desc:`도덕성(${v.morality})이 극도로 낮아 가장 적합한 경로가 사회 규범 밖에 위치합니다. ${labels} 조합이지만 도덕 결여가 모든 재능을 착취 방향으로 틀었습니다. 단기 성과 후 장기 붕괴 리스크가 극상입니다.`};
  if(v.looks>=85&&v.morality<=30) return {type:'외모 자본 의존형 — 시간이 적인 경로',desc:`외모(${v.looks})라는 감가상각되는 자산에 과도하게 의존한 경로. 대체 역량 없이 외모에만 의존하면 중년 이후 자원 고갈이 찾아옵니다.`};
  if(success.economic>75&&success.social>70) return {type:'사회적 성공형 인생 — 구조 돌파',desc:`경제적 성취(${success.economic})와 사회적 성공(${success.social})을 함께 이룬 케이스. ${labels} 조합이 배경의 열세를 극복했습니다. 세계 압력(${wp}) 속에서도 개인 역량이 구조를 돌파한 사례입니다.`};
  if(success.economic>70&&success.social<40) return {type:'물질적 성공, 관계 결핍형',desc:`경제적 성공(${success.economic})에도 불구하고 사회성·공감 부족으로 평판과 관계망이 취약합니다. 노년기 고립 리스크가 높은 경로입니다.`};
  if(comp.cognition>=78&&Math.max(v.eng_sense,v.hum_sense,v.art_sense)>=80&&success.economic<50) return {type:'재능 미발현형 — 구조의 희생자',desc:`높은 지적 능력과 재능이 있으나 출생환경·배경·세계 압력(${wp})의 구조적 제약으로 잠재력이 실현되지 못했습니다. 다른 시대·환경이었다면 결과가 달랐을 높은 가능성.`};
  if(success.inner>75&&success.economic>55) return {type:'균형 성취형 인생 — 내외부 조화',desc:`경제적 성취(${success.economic})와 내적 만족(${success.inner})을 함께 이룬 균형형. 도덕성(${v.morality})과 자기인식(${v.self_aware})이 인생의 질을 결정했습니다.`};
  if((success.economic+success.social+success.inner)/3 < 35) return {type:'구조적 제약형 인생',desc:`개인 역량보다 출생환경·배경·세계 압력(${wp})이 경로를 지배했습니다. ${d>=2000?'이 시대에 태어난 것 자체가 구조적 불리함을 의미합니다.':'운의 3레이어가 모두 불리하게 작동했습니다.'}`};
  return {type:'평균 경로형 인생',desc:`${labels} 조합. 전체 평균 성취 수준의 인생 경로. 최적 직업: ${careers.slice(0,3).map(c=>c.n).join('·')}. 특정 변수를 강화하면 경로가 크게 달라질 수 있습니다.`};
}

// ══════════════════════════════════════════════════════
// 17. MAIN RUN FUNCTION
// ══════════════════════════════════════════════════════


